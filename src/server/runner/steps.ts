import "server-only";
import { randomUUID } from "node:crypto";
import { CandidateMatchSchema, MatchResultSchema, type Mission } from "@/contracts";
import { query, transaction, type Tx } from "../db/client";
import { match, type MatchCandidate } from "../domain/matching/matcher";
import { buildProposal } from "../domain/missions/proposals";
import {
  appendEvent,
  bumpMission,
  missionDto,
  type MissionRow,
  type ParticipantRow,
} from "../domain/store";
import { claimCommit, enqueueJob, leaseJob, recordFailure, type JobRow } from "./jobs";
import { serpConfigured, webSearch, type SearchHit } from "../providers/serpapi";
import { iso } from "../auth/sessions";
import { sweep } from "./sweeper";

const ms = (s: string) => Date.parse(s);

// Eligible scoped candidates: opted in and discoverable (creator always considered), not deleted or excluded.
export async function loadCandidates(tx: Tx, mission: MissionRow): Promise<{
  candidates: MatchCandidate[];
  rows: ParticipantRow[];
}> {
  const rows = await query<ParticipantRow>(
    `SELECT * FROM participants WHERE scope_mode=$1 AND showcase_id=$2 AND deleted_at IS NULL
       AND ((discoverable AND participation_opt_in) OR id=$3)`,
    [mission.scope_mode, mission.showcase_id, mission.creator_id],
    tx,
  );
  const excluded = new Set(mission.excluded_participant_ids);
  const busy = await query<{ participant_id: string; starts_at: Date; ends_at: Date }>(
    `SELECT participant_id, starts_at, ends_at FROM reservations
     WHERE scope_mode=$1 AND showcase_id=$2 AND mission_id<>$3 AND state<>'RELEASED'
       AND (expires_at IS NULL OR expires_at > now())`,
    [mission.scope_mode, mission.showcase_id, mission.id],
    tx,
  );
  const eligible = rows.filter((r) => !excluded.has(r.id));
  return {
    rows: eligible,
    candidates: eligible.map((r) => {
      const availability = mission.counter_availability[r.id] ?? r.profile.availability;
      return {
        id: r.id,
        capabilities: r.profile.capabilities.map((c) => ({ skillId: c.normalizedSkillId, level: c.level })),
        needs: r.profile.needs,
        interests: r.profile.interests,
        availability: availability.map((i) => ({ start: ms(i.start), end: ms(i.end) })),
        busy: busy
          .filter((b) => b.participant_id === r.id)
          .map((b) => ({ start: b.starts_at.getTime(), end: b.ends_at.getTime() })),
      };
    }),
  };
}

type Prefetch = { hits: SearchHit[]; searchFailed: boolean };
type StepResult = (tx: Tx, mission: MissionRow, dto: Mission, job: JobRow, prefetch: Prefetch) => Promise<void>;
const meta = (job: JobRow, correlationId: string) => ({
  runId: job.checkpoint.runId,
  agent: job.agent,
  correlationId,
});

const director: StepResult = async (tx, mission, dto, job) => {
  const c = randomUUID();
  await appendEvent(tx, mission, "AGENT_STARTED", { operation: "validateRequirements", evidenceIds: [] }, { ...meta(job, c), status: "STARTED" });
  const humanRequired = dto.requirements.filter((r) => r.kind === "HUMAN" && r.priority === "REQUIRED");
  for (const r of humanRequired)
    await appendEvent(tx, mission, "REQUIREMENT_CONFIRMED", { requirementId: r.id }, { correlationId: c });
  const next = await bumpMission(tx, mission, { state: "DISCOVERING" });
  await appendEvent(tx, next, "AGENT_COMPLETED", { operation: "validateRequirements", evidenceIds: humanRequired.map((r) => r.id) }, { ...meta(job, c), status: "SUCCEEDED" });
  await enqueueJob(tx, next, "SCOUT", "SCOUT", "DISCOVERING");
};

const scout: StepResult = async (tx, mission, dto, job, prefetch) => {
  const c = randomUUID();
  await appendEvent(tx, mission, "SCOUT_SEARCH_STARTED", { operation: "searchParticipants", evidenceIds: [] }, { ...meta(job, c), status: "STARTED" });
  const { rows } = await loadCandidates(tx, mission);
  await tx.query("DELETE FROM candidate_matches WHERE mission_id=$1", [mission.id]);
  const ids: string[] = [];
  for (const row of rows) {
    const covered = dto.requirements.filter((r) =>
      row.profile.capabilities.some(
        (cap) => cap.normalizedSkillId === r.normalizedSkillId && (r.minimumLevel === null || (cap.level ?? 0) >= r.minimumLevel),
      ),
    );
    if (!covered.length || row.id === dto.creatorId) continue;
    const candidate = CandidateMatchSchema.parse({
      id: randomUUID(),
      missionId: mission.id,
      participantId: row.id,
      profileVersion: row.profile_version,
      coveredRequirementIds: covered.map((r) => r.id),
      score: {
        optionalCoverage: 0,
        mutualBenefit: 0,
        interestRelevance: 0,
        preservedCommitments: 0,
        teamSize: 1,
        stableParticipantIds: [row.id],
      },
      reason: `Confirmed ${covered.map((r) => r.normalizedSkillId).join(", ")} at the required level.`,
      evidenceRefs: [],
      exclusionReasons: [],
    });
    await tx.query(
      "INSERT INTO candidate_matches(id, mission_id, participant_id, constraints_version, doc) VALUES ($1,$2,$3,$4,$5)",
      [candidate.id, mission.id, row.id, mission.constraints_version, JSON.stringify(candidate)],
    );
    ids.push(candidate.id);
    if (ids.length >= 100) break;
  }
  const next = await bumpMission(tx, mission);
  await appendEvent(tx, next, "CANDIDATES_FOUND", { candidateIds: ids }, { correlationId: c });
  // Public web evidence is stored as PUBLIC_UNVERIFIED opportunities; it never fills a HUMAN requirement.
  const opportunityIds: string[] = [];
  for (const hit of prefetch.hits) {
    const id = randomUUID();
    const doc = {
      id,
      missionId: mission.id,
      scope: dto.scope,
      sourceURL: hit.link,
      title: hit.title,
      retrievedAt: iso(new Date()),
      providerSearchId: hit.searchId.slice(0, 200),
      relevanceEvidence: hit.snippet,
      verificationStatus: "PUBLIC_UNVERIFIED" as const,
    };
    await tx.query("INSERT INTO external_opportunities(id, mission_id, scope_mode, showcase_id, doc) VALUES ($1,$2,$3,$4,$5)", [id, mission.id, mission.scope_mode, mission.showcase_id, JSON.stringify(doc)]);
    opportunityIds.push(id);
  }
  if (opportunityIds.length) await appendEvent(tx, next, "OPPORTUNITIES_FOUND", { opportunityIds }, { correlationId: c });
  if (prefetch.searchFailed) await appendEvent(tx, next, "PROVIDER_FAILED", { code: "UNAVAILABLE", retryable: false }, { correlationId: c, status: "FAILED" });
  await enqueueJob(tx, next, "STRATEGIST", "STRATEGIST", "DISCOVERING");
};

const strategist: StepResult = async (tx, mission, dto, job) => {
  const c = randomUUID();
  const replan = job.checkpoint.kind === "REPLAN";
  await appendEvent(tx, mission, "TOOL_STARTED", { operation: "findFeasibleGroups", evidenceIds: [] }, { ...meta(job, c), status: "STARTED" });
  const { candidates, rows } = await loadCandidates(tx, mission);
  const accepted = replan ? await acceptedGroup(tx, mission) : null;
  const result = match({
    candidates,
    requirements: dto.requirements.map((r) => ({
      id: r.id,
      kind: r.kind,
      skillId: r.normalizedSkillId,
      priority: r.priority,
      minimumCoverage: r.minimumCoverage,
      minimumLevel: r.minimumLevel,
    })),
    preferences: dto.constraints.preferences,
    minGroupSize: dto.constraints.minGroupSize,
    maxGroupSize: dto.constraints.maxGroupSize,
    minOverlapMinutes: dto.constraints.minOverlapMinutes,
    window: { start: ms(dto.constraints.window.start), end: ms(dto.constraints.window.end) },
    creatorId: dto.constraints.creatorParticipates ? dto.creatorId : null,
    acceptedGroup: accepted,
  });
  const revision = (mission.current_proposal_revision ?? 0) + 1;
  const versions = new Map(rows.map((r) => [r.id, r.profile_version]));
  const names = new Map(rows.map((r) => [r.id, r.profile.displayName]));
  const [resource] = await query<{ title: string }>("SELECT doc->>'title' AS title FROM external_opportunities WHERE mission_id=$1 ORDER BY id LIMIT 1", [mission.id], tx);
  const proposals = result.groups.map((group) =>
    buildProposal({ mission: dto, scope: dto.scope, revision, group, search: result.search, profileVersions: versions, names, resourceTitle: resource?.title }),
  );
  const matchResult = MatchResultSchema.parse({
    feasibility: result.feasibility,
    proposals,
    uncoveredRequirementIds: result.uncoveredRequirementIds,
    search: {
      algorithmVersion: "bounded-lexicographic-1",
      taxonomyVersion: "taxonomy-1",
      visitedNodes: result.search.visitedNodes,
      maxNodes: 50000,
      maxWallTimeMs: 1500,
      elapsedMs: result.search.elapsedMs,
      complete: result.search.complete,
      stoppedBecause: result.search.stoppedBecause,
    },
  });
  await tx.query(
    "INSERT INTO match_results(id, mission_id, revision, doc, created_at) VALUES ($1,$2,$3,$4,now())",
    [randomUUID(), mission.id, revision, JSON.stringify(matchResult)],
  );
  for (const [rank, p] of proposals.entries())
    await tx.query(
      `INSERT INTO group_proposals(id, mission_id, scope_mode, showcase_id, revision, rank, doc, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,now())`,
      [p.id, mission.id, mission.scope_mode, mission.showcase_id, revision, rank, JSON.stringify(p)],
    );
  await appendEvent(tx, mission, "TOOL_COMPLETED", { operation: "findFeasibleGroups", evidenceIds: proposals.map((p) => p.id) }, { ...meta(job, c), status: "SUCCEEDED", durationMs: Math.round(result.search.elapsedMs) });
  if (result.feasibility === "FEASIBLE") {
    const next = await bumpMission(tx, mission, { state: replan ? "REPROPOSED" : "PROPOSED", current_proposal_revision: revision });
    for (const p of proposals)
      await appendEvent(tx, next, "PROPOSAL_CREATED", { proposalId: p.id }, { correlationId: c, proposalRevision: revision });
    if (replan) await appendEvent(tx, next, "REPLAN_COMPLETED", { proposalId: proposals[0].id }, { correlationId: c, proposalRevision: revision });
  } else {
    const next = await bumpMission(tx, mission, { state: "PAUSED_FOR_HUMAN", current_proposal_revision: revision });
    await appendEvent(tx, next, "PAUSED_FOR_HUMAN", { reason: result.feasibility === "NO_SOLUTION" ? "NO_SOLUTION" : "SEARCH_LIMIT_REACHED", checkpoint: replan ? "REPLAN" : "STRATEGIST" }, { correlationId: c, status: "WAITING" });
  }
};

// Previously accepted current-revision members, for the preserved-commitment score component only.
async function acceptedGroup(tx: Tx, mission: MissionRow) {
  if (!mission.selected_proposal_id) return null;
  const [p] = await query<{ doc: { members: { participantId: string }[]; commonWindow: { start: string; end: string } } }>(
    "SELECT doc FROM group_proposals WHERE id=$1",
    [mission.selected_proposal_id],
    tx,
  );
  return p
    ? { ids: p.doc.members.map((m) => m.participantId), window: { start: ms(p.doc.commonWindow.start), end: ms(p.doc.commonWindow.end) } }
    : null;
}

const STEPS: Record<string, StepResult> = {
  DIRECTOR: director,
  SCOUT: scout,
  STRATEGIST: strategist,
  REPLAN: strategist,
};
const ALLOWED_STATES: Record<string, string[]> = {
  DIRECTOR: ["PLANNING"],
  SCOUT: ["DISCOVERING"],
  STRATEGIST: ["DISCOVERING"],
  REPLAN: ["REPLANNING"],
};

// One leased job: commit only with the current fence and unchanged mission input version.
export async function runOne(owner: string): Promise<"IDLE" | "DONE" | "STALE" | "FAILED"> {
  const job = await leaseJob(owner);
  if (!job) return "IDLE";
  // Provider calls run before the transaction, outside row locks; the commit still checks fence and version.
  const prefetch: Prefetch = { hits: [], searchFailed: false };
  if (job.checkpoint.kind === "SCOUT" && serpConfigured()) {
    const [m] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1", [job.mission_id]);
    const searches = await query<{ n: number }>("SELECT COUNT(DISTINCT doc->>'providerSearchId')::int AS n FROM external_opportunities WHERE mission_id=$1", [job.mission_id]);
    if (m && (searches[0]?.n ?? 0) < 3) {
      const reqs = await query<{ doc: { kind: string; normalizedSkillId: string; outcome: string | null } }>("SELECT doc FROM mission_requirements WHERE mission_id=$1", [m.id]);
      const resources = reqs.filter((r) => r.doc.kind === "RESOURCE").map((r) => r.doc.outcome ?? r.doc.normalizedSkillId);
      const q = `${m.doc.objective} ${resources.length ? resources.join(" ") : "free tools guide"}`;
      prefetch.hits = await webSearch(q, m.doc.language).catch(() => {
        prefetch.searchFailed = true;
        return [];
      });
    }
  }
  try {
    return await transaction(async (tx) => {
      const [mission] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1 FOR UPDATE", [job.mission_id], tx);
      const kind = job.checkpoint.kind;
      if (!mission || mission.version !== job.input_version || !ALLOWED_STATES[kind]?.includes(mission.state)) {
        await claimCommit(tx, job, "CANCELLED");
        return "STALE";
      }
      if (!(await claimCommit(tx, job, "SUCCEEDED"))) throw new StaleFence();
      await tx.query("UPDATE agent_runs SET status='SUCCEEDED', started_at=COALESCE(started_at, now()), ended_at=now() WHERE id=$1", [job.checkpoint.runId]);
      await STEPS[kind](tx, mission, await missionDto(mission, tx), job, prefetch);
      return "DONE";
    });
  } catch (error) {
    if (error instanceof StaleFence) return "STALE";
    const outcome = await recordFailure(job, error instanceof Error ? error.message : "step failed");
    if (outcome === "EXHAUSTED") await failMission(job);
    return "FAILED";
  }
}
class StaleFence extends Error {}

async function failMission(job: JobRow): Promise<void> {
  await transaction(async (tx) => {
    const [mission] = await query<MissionRow>("SELECT * FROM missions WHERE id=$1 FOR UPDATE", [job.mission_id], tx);
    if (!mission || ["ACTIVATED", "CANCELLED", "EXPIRED", "FAILED"].includes(mission.state)) return;
    const next = await bumpMission(tx, mission, { state: "FAILED" });
    await tx.query("UPDATE agent_runs SET status='FAILED', ended_at=now() WHERE id=$1", [job.checkpoint.runId]);
    await appendEvent(tx, next, "AGENT_FAILED", { code: "RETRY_EXHAUSTED", retryable: false }, { runId: job.checkpoint.runId, agent: job.agent, correlationId: randomUUID(), status: "FAILED" });
  });
}

// Bounded drain used by the worker loop, the protected dispatcher route and post-response acceleration.
export async function drain(owner = randomUUID(), maxJobs = 20, budgetMs = 20_000): Promise<number> {
  const started = Date.now();
  let processed = 0;
  await sweep().catch((error) => console.error("sweep failed", error instanceof Error ? error.message : "unknown"));
  while (processed < maxJobs && Date.now() - started < budgetMs) {
    const outcome = await runOne(owner);
    if (outcome === "IDLE") break;
    processed++;
  }
  return processed;
}
