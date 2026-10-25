import "server-only";
import { createHash, randomUUID } from "node:crypto";
import {
  EXECUTION_POLICY,
  INITIAL_TAXONOMY,
  MatchResultSchema,
  MissionSnapshotSchema,
  MissionTaskSchema,
  ParticipantResponseSchema,
  ReviewRequestSchema,
  RoomSchema,
  type AgentEvent,
  type CreateMissionSchema,
  type GroupProposal,
  type Mission,
  type ResponseCommandSchema,
  type Scope,
} from "@/contracts";
import type { z } from "zod";
import { query, transaction, type Tx } from "../../db/client";
import { fail } from "../../http/errors";
import { scopeColumns } from "../../http/scope";
import { iso, type SessionRecord } from "../../auth/sessions";
import {
  appendEvent,
  bumpMission,
  invitationDto,
  loadMission,
  missionDto,
  principalParticipantIds,
  recordHistory,
  type InvitationRow,
  type MissionRow,
  type ParticipantRow,
} from "../store";
import { enqueueJob } from "../../runner/jobs";

type CreateInput = z.output<typeof CreateMissionSchema>;
const SKILLS = new Map(INITIAL_TAXONOMY.skills.map((s) => [s.id, s]));
const TERMINAL = new Set(["CANCELLED", "EXPIRED"]);

// ---------- ownership ----------
export async function loadOwnedMission(id: string, session: SessionRecord, tx?: Tx, lock = false): Promise<MissionRow> {
  const mission = await loadMission(id, session.scope, tx, lock);
  if (mission.owner_principal_id !== session.principalId) fail("NOT_FOUND", "Mission not found.");
  return mission;
}
const assertVersion = (mission: MissionRow, expected: number) => {
  if (TERMINAL.has(mission.state)) fail("TERMINAL_MISSION", `Mission is ${mission.state.toLowerCase()}.`);
  if (mission.version !== expected) fail("STALE_VERSION", "Mission changed since you loaded it.");
};

// ---------- create / start ----------
export async function createMission(tx: Tx, session: SessionRecord, input: CreateInput, correlationId: string): Promise<Mission> {
  const owned = await principalParticipantIds(session.principalId, session.scope, tx);
  if (!owned.length) fail("INVALID_INPUT", "Create your participant profile before creating a mission.", { creator: ["Profile required"] });
  const errors: Record<string, string[]> = {};
  input.requirements.forEach((r, i) => {
    if (!SKILLS.has(r.normalizedSkillId)) errors[`requirements.${i}.normalizedSkillId`] = ["Unknown taxonomy-1 skill"];
    if (r.minimumCoverage > input.constraints.maxGroupSize) errors[`requirements.${i}.minimumCoverage`] = ["Exceeds maximum group size"];
  });
  if (!input.requirements.some((r) => r.kind === "HUMAN" && r.priority === "REQUIRED"))
    errors.requirements = ["At least one required human skill"];
  if (Object.keys(errors).length) fail("INVALID_INPUT", "Mission needs correction.", errors);
  const id = randomUUID();
  const [mode, showcase] = scopeColumns(session.scope);
  const now = new Date();
  const expires = new Date(now.getTime() + EXECUTION_POLICY.missionTtlHours * 3600_000);
  const [row] = await query<MissionRow>(
    `INSERT INTO missions(id, scope_mode, showcase_id, creator_id, owner_principal_id, state, version, constraints_version, doc,
       excluded_participant_ids, counter_availability, created_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,'DRAFT',1,1,$6,'[]','{}',$7,$8) RETURNING *`,
    [
      id,
      mode,
      showcase,
      owned[0],
      session.principalId,
      JSON.stringify({ objective: input.objective, expectedOutput: input.expectedOutput, language: input.language, constraints: input.constraints }),
      now,
      expires,
    ],
    tx,
  );
  for (const [i, r] of input.requirements.entries())
    await tx.query("INSERT INTO mission_requirements(id, mission_id, position, version, doc) VALUES ($1,$2,$3,1,$4)", [
      randomUUID(),
      id,
      i,
      JSON.stringify(r),
    ]);
  await recordHistory(tx, row);
  await appendEvent(tx, row, "MISSION_CREATED", { state: "DRAFT" }, { correlationId });
  const reqs = await query<{ id: string }>("SELECT id FROM mission_requirements WHERE mission_id=$1 ORDER BY position", [id], tx);
  for (const r of reqs) await appendEvent(tx, row, "REQUIREMENT_CREATED", { requirementId: r.id }, { correlationId });
  return missionDto(row, tx);
}

export async function updateMission(tx: Tx, session: SessionRecord, id: string, input: CreateInput & { expectedVersion: number }, correlationId: string) {
  const mission = await loadOwnedMission(id, session, tx, true);
  assertVersion(mission, input.expectedVersion);
  if (!["DRAFT", "PAUSED_FOR_HUMAN", "FAILED"].includes(mission.state)) fail("STALE_VERSION", "Mission can only be corrected before planning or while paused.");
  await tx.query("UPDATE missions SET doc=$2, constraints_version=constraints_version+1 WHERE id=$1", [
    id,
    JSON.stringify({ objective: input.objective, expectedOutput: input.expectedOutput, language: input.language, constraints: input.constraints }),
  ]);
  await tx.query("DELETE FROM mission_requirements WHERE mission_id=$1", [id]);
  for (const [i, r] of input.requirements.entries())
    await tx.query("INSERT INTO mission_requirements(id, mission_id, position, version, doc) VALUES ($1,$2,$3,1,$4)", [randomUUID(), id, i, JSON.stringify(r)]);
  const next = await bumpMission(tx, { ...mission, constraints_version: mission.constraints_version + 1 }, { state: "DRAFT" });
  await appendEvent(tx, next, "MISSION_RETRIED", { checkpoint: "CORRECTED_DRAFT" }, { correlationId });
  return missionDto(next, tx);
}

export async function startMission(tx: Tx, session: SessionRecord, id: string, expectedVersion: number) {
  const mission = await loadOwnedMission(id, session, tx, true);
  assertVersion(mission, expectedVersion);
  if (mission.state !== "DRAFT") fail("STALE_VERSION", "Mission already started.");
  if (mission.expires_at < new Date()) fail("TERMINAL_MISSION", "Mission expired.");
  const next = await bumpMission(tx, mission, { state: "PLANNING" });
  const runId = await enqueueJob(tx, next, "DIRECTOR", "DIRECTOR", "PLANNING");
  return { missionId: id, runId, state: next.state, version: next.version };
}

// ---------- reads ----------
const uuidFrom = (seed: string): string => {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${"89ab"[parseInt(h[16], 16) % 4]}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

async function currentProposals(mission: MissionRow, client?: Tx): Promise<GroupProposal[]> {
  if (!mission.current_proposal_revision) return [];
  return (
    await query<{ doc: GroupProposal }>(
      "SELECT doc FROM group_proposals WHERE mission_id=$1 AND revision=$2 ORDER BY rank",
      [mission.id, mission.current_proposal_revision],
      client,
    )
  ).map((r) => r.doc);
}
async function selectedProposal(mission: MissionRow, client?: Tx): Promise<GroupProposal | null> {
  if (!mission.selected_proposal_id) return null;
  const [row] = await query<{ doc: GroupProposal }>("SELECT doc FROM group_proposals WHERE id=$1", [mission.selected_proposal_id], client);
  return row?.doc ?? null;
}

export type AsOf = { sequence: number; statuses: Map<string, InvitationRow["status"]> };
export async function buildSnapshot(mission: MissionRow, client: Tx, asOf?: AsOf) {
  const dto = await missionDto(mission, client);
  const seq = asOf
    ? asOf.sequence
    : (await query<{ seq: number }>("SELECT COALESCE(MAX(sequence),0)::int AS seq FROM agent_events WHERE mission_id=$1", [mission.id], client))[0].seq;
  const proposals = await currentProposals(mission, client);
  const selected = await selectedProposal(mission, client);
  const focus = selected && selected.revision === mission.current_proposal_revision ? selected : (proposals[0] ?? selected);
  const invites = selected
    ? await query<InvitationRow>("SELECT * FROM invitations WHERE proposal_id=$1", [selected.id], client)
    : [];
  const statusOf = asOf?.statuses ?? new Map(invites.map((i) => [i.participant_id, i.status]));
  const memberIds = new Set(focus?.members.map((m) => m.participantId) ?? []);
  const extraIds = mission.excluded_participant_ids.filter((id) => !memberIds.has(id));
  const people = await query<Pick<ParticipantRow, "id" | "profile">>(
    "SELECT id, profile FROM participants WHERE id = ANY($1::uuid[])",
    [[...memberIds, ...extraIds]],
    client,
  );
  const names = new Map(people.map((p) => [p.id, p.profile.displayName]));
  const activated = mission.state === "ACTIVATED";
  const nodes: z.input<typeof MissionSnapshotSchema>["graph"]["nodes"] = [
    { id: mission.id, kind: "mission", label: dto.objective.slice(0, 120), status: activated ? "ACTIVATED" : "PENDING", evidenceRefs: [] },
  ];
  const edges: z.input<typeof MissionSnapshotSchema>["graph"]["edges"] = [];
  const covered = new Set(focus?.members.flatMap((m) => m.coveredRequirementIds) ?? []);
  for (const r of dto.requirements)
    nodes.push({
      id: r.id,
      kind: "requirement",
      label: `${r.normalizedSkillId}${r.priority === "OPTIONAL" ? " (optional)" : ""}`.slice(0, 120),
      status: covered.has(r.id) ? (activated ? "ACTIVATED" : "ACCEPTED") : "UNCOVERED",
      evidenceRefs: [],
    });
  type NodeStatus = (typeof nodes)[number]["status"];
  const personStatus = (id: string): NodeStatus => {
    if (activated && memberIds.has(id)) return "ACTIVATED";
    const s = statusOf.get(id);
    if (s === "ACCEPTED") return "ACCEPTED";
    if (s === "PENDING" || s === "COUNTERPROPOSED") return "PENDING";
    if (s === "DECLINED") return "DECLINED";
    if (mission.excluded_participant_ids.includes(id)) return "EXCLUDED";
    return "SUGGESTED";
  };
  for (const m of focus?.members ?? []) {
    const status = personStatus(m.participantId);
    nodes.push({ id: m.participantId, kind: "participant", label: (names.get(m.participantId) ?? m.role).slice(0, 120), status, evidenceRefs: [] });
    for (const reqId of m.coveredRequirementIds)
      edges.push({ id: uuidFrom(`cov:${focus!.id}:${m.participantId}:${reqId}`), source: m.participantId, target: reqId, kind: "COVERAGE", status: status === "UNCOVERED" ? "SUGGESTED" : status, proposalRevision: focus!.revision, eventId: null });
    edges.push({
      id: uuidFrom(`inv:${focus!.id}:${m.participantId}`),
      source: mission.id,
      target: m.participantId,
      kind: activated ? "MEMBERSHIP" : statusOf.has(m.participantId) ? "INVITATION" : "CANDIDATE",
      status: status === "UNCOVERED" ? "SUGGESTED" : status,
      proposalRevision: focus!.revision,
      eventId: null,
    });
  }
  for (const id of extraIds)
    nodes.push({ id, kind: "participant", label: (names.get(id) ?? "Former candidate").slice(0, 120), status: "DECLINED", evidenceRefs: [] });
  const opportunities = await loadOpportunities(mission.id, client);
  for (const o of opportunities) {
    nodes.push({ id: o.id, kind: "opportunity", label: o.title, status: "PUBLIC_UNVERIFIED", evidenceRefs: [] });
    edges.push({ id: uuidFrom(`evidence:${o.id}`), source: o.id, target: mission.id, kind: "EVIDENCE", status: "PUBLIC_UNVERIFIED", proposalRevision: null, eventId: null });
  }
  const accepted = asOf ? [...asOf.statuses.values()].filter((v) => v === "ACCEPTED").length : invites.filter((i) => i.status === "ACCEPTED").length;
  return MissionSnapshotSchema.parse({
    scope: dto.scope,
    snapshotSequence: seq,
    mission: dto,
    graph: { snapshotSequence: seq, nodes, edges },
    proposals,
    opportunities,
    approvals: { required: selected ? selected.members.length : 0, accepted },
    receivedAt: iso(new Date()),
  });
}

export async function snapshot(session: SessionRecord, id: string) {
  return transaction(async (tx) => {
    await tx.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const mission = await loadOwnedMission(id, session, tx);
    return buildSnapshot(mission, tx);
  });
}

export async function eventsPage(scope: Scope, missionId: string, after: number, limit: number) {
  const rows = await query<{ doc: AgentEvent }>(
    "SELECT doc FROM agent_events WHERE mission_id=$1 AND sequence > $2 ORDER BY sequence LIMIT $3",
    [missionId, after, limit + 1],
  );
  const events = rows.slice(0, limit).map((r) => r.doc);
  return { scope, events, nextSequence: events.length ? events[events.length - 1].sequence : after, hasMore: rows.length > limit, accessEpoch: 1 };
}

export async function proposals(session: SessionRecord, id: string) {
  const mission = await loadOwnedMission(id, session);
  if (!mission.current_proposal_revision) {
    fail("NOT_FOUND", "No matching result yet; planning is still running.");
  }
  const [row] = await query<{ doc: unknown }>("SELECT doc FROM match_results WHERE mission_id=$1 AND revision=$2", [id, mission.current_proposal_revision]);
  return MatchResultSchema.parse(row.doc);
}

// ---------- capacity ----------
async function reserve(tx: Tx, mission: MissionRow, participantId: string, invitationId: string, schedule: { start: string; end: string; timezone: string }, expiresAt: Date) {
  await tx.query("SELECT id FROM participants WHERE id=$1 FOR UPDATE", [participantId]);
  const conflicts = await query(
    `SELECT id FROM reservations WHERE participant_id=$1 AND scope_mode=$2 AND showcase_id=$3 AND mission_id<>$4 AND state<>'RELEASED'
       AND (expires_at IS NULL OR expires_at > now()) AND starts_at < $6 AND ends_at > $5`,
    [participantId, mission.scope_mode, mission.showcase_id, mission.id, schedule.start, schedule.end],
    tx,
  );
  if (conflicts.length) fail("CAPACITY_CONFLICT", "This time overlaps another commitment you already accepted.");
  await tx.query("UPDATE reservations SET state='RELEASED' WHERE participant_id=$1 AND mission_id=$2 AND state='ACCEPTED_HOLD'", [participantId, mission.id]);
  await tx.query(
    `INSERT INTO reservations(id, participant_id, mission_id, scope_mode, showcase_id, invitation_id, starts_at, ends_at, timezone, state, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACCEPTED_HOLD',$10)`,
    [randomUUID(), participantId, mission.id, mission.scope_mode, mission.showcase_id, invitationId, schedule.start, schedule.end, schedule.timezone, expiresAt],
  );
}

async function insertResponse(tx: Tx, invite: InvitationRow, action: "ACCEPT" | "DECLINE" | "COUNTER", reason: string | null, availability: unknown[] | null) {
  const doc = {
    id: randomUUID(),
    invitationId: invite.id,
    participantId: invite.participant_id,
    action,
    termsHash: invite.terms_hash,
    responseVersion: invite.response_version,
    reason,
    availabilityProposal: availability,
    createdAt: iso(new Date()),
  };
  await tx.query("INSERT INTO participant_responses(id, invitation_id, participant_id, doc, created_at) VALUES ($1,$2,$3,$4,now())", [doc.id, invite.id, invite.participant_id, JSON.stringify(doc)]);
  return doc;
}

// ---------- select (creator's explicit approval of the group and of the creator's own terms) ----------
export async function selectProposal(tx: Tx, session: SessionRecord, id: string, proposalId: string, expectedVersion: number, proposalRevision: number, correlationId: string) {
  const mission = await loadOwnedMission(id, session, tx, true);
  assertVersion(mission, expectedVersion);
  if (!["PROPOSED", "REPROPOSED"].includes(mission.state)) fail("STALE_VERSION", "There is no open proposal to select.");
  const [prow] = await query<{ doc: GroupProposal; revision: number }>("SELECT doc, revision FROM group_proposals WHERE id=$1 AND mission_id=$2", [proposalId, id], tx);
  if (!prow) fail("NOT_FOUND", "Proposal not found.");
  if (prow.revision !== mission.current_proposal_revision || prow.revision !== proposalRevision) fail("STALE_VERSION", "A newer proposal revision exists.");
  const proposal = prow.doc;
  const expiresAt = new Date(Math.min(Date.now() + EXECUTION_POLICY.invitationTtlHours * 3600_000, new Date(mission.expires_at).getTime()));
  const prior = await query<InvitationRow>(
    "SELECT * FROM invitations WHERE mission_id=$1 AND proposal_id<>$2 AND status IN ('PENDING','ACCEPTED','COUNTERPROPOSED') FOR UPDATE",
    [id, proposalId],
    tx,
  );
  const priorByPerson = new Map(prior.map((p) => [p.participant_id, p]));
  const languages = new Map(
    (await query<Pick<ParticipantRow, "id" | "profile">>("SELECT id, profile FROM participants WHERE id = ANY($1::uuid[])", [proposal.members.map((m) => m.participantId)], tx)).map((p) => [p.id, p.profile.language]),
  );
  let next = await bumpMission(tx, mission, { state: "AWAITING_APPROVAL", selected_proposal_id: proposalId });
  const created: InvitationRow[] = [];
  const carried = new Set<string>();
  for (const m of [...proposal.members].sort((a, b) => (a.participantId < b.participantId ? -1 : 1))) {
    const before = priorByPerson.get(m.participantId);
    const carry = before && before.status === "ACCEPTED" && before.terms_hash === m.termsHash;
    const isCreator = m.participantId === mission.creator_id;
    const invitationId = randomUUID();
    let lineage = null;
    if (carry) {
      const [resp] = await query<{ id: string }>("SELECT id FROM participant_responses WHERE invitation_id=$1 ORDER BY created_at DESC LIMIT 1", [before.id], tx);
      lineage = { sourceInvitationId: before.id, sourceResponseId: resp.id, sourceProposalRevision: before.proposal_revision, carriedToProposalRevision: proposal.revision, termsHash: m.termsHash, revalidatedAt: iso(new Date()) };
      carried.add(before.id);
    }
    const status = carry || isCreator ? "ACCEPTED" : "PENDING";
    const [row] = await query<InvitationRow>(
      `INSERT INTO invitations(id, mission_id, proposal_id, proposal_revision, participant_id, scope_mode, showcase_id, language, status, terms, terms_hash, response_version, expires_at, lineage, link_epoch, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,$13,0,now()) RETURNING *`,
      [invitationId, id, proposalId, proposal.revision, m.participantId, mission.scope_mode, mission.showcase_id, languages.get(m.participantId) ?? "en", status, JSON.stringify(m.terms), m.termsHash, expiresAt, lineage ? JSON.stringify(lineage) : null],
      tx,
    );
    if (carry) {
      await tx.query("UPDATE reservations SET invitation_id=$1, expires_at=$2 WHERE invitation_id=$3 AND state='ACCEPTED_HOLD'", [invitationId, expiresAt, before.id]);
      await appendEvent(tx, next, "INVITATION_ACCEPTED", { invitationId, participantId: m.participantId, invitationStatus: "ACCEPTED" }, { correlationId, proposalRevision: proposal.revision });
    } else if (isCreator) {
      await reserve(tx, next, m.participantId, invitationId, m.terms.schedule, expiresAt);
      await insertResponse(tx, { ...row, response_version: 1 }, "ACCEPT", "Creator selected this team", null);
      await appendEvent(tx, next, "INVITATION_ACCEPTED", { invitationId, participantId: m.participantId, invitationStatus: "ACCEPTED" }, { correlationId, proposalRevision: proposal.revision });
    } else {
      await tx.query("INSERT INTO notification_outbox(id, mission_id, invitation_id, kind, created_at) VALUES ($1,$2,$3,'INVITATION_READY',now())", [randomUUID(), id, invitationId]);
      await appendEvent(tx, next, "INVITATION_SENT", { invitationId, participantId: m.participantId, invitationStatus: "PENDING" }, { correlationId, proposalRevision: proposal.revision });
    }
    created.push(row);
  }
  for (const p of prior) {
    await tx.query("UPDATE invitations SET status='REVOKED', token_hash=NULL WHERE id=$1", [p.id]);
    if (!carried.has(p.id)) await tx.query("UPDATE reservations SET state='RELEASED' WHERE invitation_id=$1 AND state='ACCEPTED_HOLD'", [p.id]);
    await tx.query("UPDATE sessions SET revoked_at=now() WHERE kind='INVITATION' AND invitation_id=$1", [p.id]);
    await appendEvent(tx, next, "INVITATION_REVOKED", { invitationId: p.id, participantId: p.participant_id, invitationStatus: "REVOKED" }, { correlationId, proposalRevision: p.proposal_revision });
  }
  next = { ...next };
  return { mission: await missionDto(next, tx), proposal, invitations: created.map(invitationDto) };
}

// ---------- respond (authenticated invitation principal only; never an agent action) ----------
export async function respond(tx: Tx, invite: SessionRecord, invitationId: string, command: z.output<typeof ResponseCommandSchema>, correlationId: string) {
  if (invite.invitationId !== invitationId) fail("FORBIDDEN", "This session is bound to a different invitation.");
  const [peek] = await query<{ mission_id: string }>("SELECT mission_id FROM invitations WHERE id=$1", [invitationId], tx);
  if (!peek) fail("NOT_FOUND", "Invitation not found.");
  const mission = await loadMission(peek.mission_id, invite.scope, tx, true);
  const [row] = await query<InvitationRow>("SELECT * FROM invitations WHERE id=$1 FOR UPDATE", [invitationId], tx);
  if (TERMINAL.has(mission.state)) fail("TERMINAL_MISSION", `Mission is ${mission.state.toLowerCase()}.`);
  if (row.status === "REVOKED") fail("INVITATION_REVOKED", "This invitation was replaced or withdrawn.");
  if (row.status === "EXPIRED" || row.expires_at < new Date()) {
    if (row.status !== "EXPIRED") await tx.query("UPDATE invitations SET status='EXPIRED' WHERE id=$1", [invitationId]);
    fail("INVITATION_EXPIRED", "This invitation has expired.");
  }
  if (row.status !== "PENDING" || row.response_version !== command.responseVersion) fail("STALE_VERSION", "This invitation already has a response.");
  if (row.terms_hash !== command.termsHash) fail("STALE_VERSION", "The terms changed; review the current terms.");
  if (mission.state !== "AWAITING_APPROVAL" || mission.selected_proposal_id !== row.proposal_id) fail("STALE_VERSION", "The team is being revised; wait for the updated invitation.");
  const status = command.action === "ACCEPT" ? "ACCEPTED" : command.action === "DECLINE" ? "DECLINED" : "COUNTERPROPOSED";
  if (command.action === "ACCEPT") await reserve(tx, mission, row.participant_id, row.id, row.terms.schedule, row.expires_at);
  const response = await insertResponse(tx, row, command.action, command.reason ?? null, command.availabilityProposal ?? null);
  const [updated] = await query<InvitationRow>("UPDATE invitations SET status=$2, response_version=response_version+1 WHERE id=$1 RETURNING *", [invitationId, status], tx);
  let next: MissionRow;
  const eventType = command.action === "ACCEPT" ? "INVITATION_ACCEPTED" : command.action === "DECLINE" ? "INVITATION_DECLINED" : "INVITATION_COUNTERPROPOSED";
  if (command.action === "ACCEPT") {
    next = await bumpMission(tx, mission);
    await appendEvent(tx, next, eventType, { invitationId, participantId: row.participant_id, invitationStatus: status }, { correlationId, proposalRevision: row.proposal_revision });
  } else {
    // Decline or counter queues genuine repair; a counter is never treated as acceptance.
    next = await bumpMission(tx, mission, {
      state: "REPLANNING",
      excluded: command.action === "DECLINE" ? [...new Set([...mission.excluded_participant_ids, row.participant_id])] : mission.excluded_participant_ids,
      counters: command.action === "COUNTER" ? { ...mission.counter_availability, [row.participant_id]: command.availabilityProposal! } : mission.counter_availability,
    });
    await appendEvent(tx, next, eventType, { invitationId, participantId: row.participant_id, invitationStatus: status }, { correlationId, proposalRevision: row.proposal_revision });
    const departing = (await selectedProposal(mission, tx))?.members.find((m) => m.participantId === row.participant_id);
    await appendEvent(tx, next, "REPLAN_STARTED", { uncoveredRequirementIds: departing?.coveredRequirementIds ?? [] }, { correlationId, proposalRevision: row.proposal_revision });
    await enqueueJob(tx, next, "STRATEGIST", "REPLAN", "REPLANNING");
  }
  return { response: ParticipantResponseSchema.parse(response), invitation: invitationDto(updated), missionState: next.state, missionVersion: next.version };
}
// ---------- activation ----------
export async function activate(tx: Tx, session: SessionRecord, id: string, expectedVersion: number, proposalRevision: number, correlationId: string) {
  const mission = await loadOwnedMission(id, session, tx, true);
  assertVersion(mission, expectedVersion);
  if (mission.state !== "AWAITING_APPROVAL") fail("STALE_VERSION", "Mission is not awaiting approval.");
  const proposal = await selectedProposal(mission, tx);
  if (!proposal || proposal.revision !== proposalRevision || proposal.revision !== mission.current_proposal_revision) fail("STALE_VERSION", "A newer proposal revision exists.");
  const invites = await query<InvitationRow>("SELECT * FROM invitations WHERE proposal_id=$1 ORDER BY participant_id FOR UPDATE", [proposal!.id], tx);
  const now = new Date();
  const ready =
    invites.length === proposal!.members.length &&
    invites.every((i) => i.status === "ACCEPTED" && i.expires_at > now) &&
    proposal!.members.every((m) => invites.some((i) => i.participant_id === m.participantId && i.terms_hash === m.termsHash));
  if (!ready) fail("STALE_VERSION", "Every member must accept the current terms before activation.");
  const ids = invites.map((i) => i.participant_id).sort();
  await tx.query("SELECT id FROM participants WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE", [ids]);
  const deleted = await query("SELECT id FROM participants WHERE id = ANY($1::uuid[]) AND deleted_at IS NOT NULL", [ids], tx);
  if (deleted.length) fail("STALE_VERSION", "A member is no longer available.");
  const holds = await query<{ invitation_id: string }>("SELECT invitation_id FROM reservations WHERE mission_id=$1 AND state='ACCEPTED_HOLD'", [id], tx);
  const held = new Set(holds.map((h) => h.invitation_id));
  if (!invites.every((i) => held.has(i.id))) fail("CAPACITY_CONFLICT", "A member's time hold is no longer valid.");
  await tx.query("UPDATE reservations SET state='ACTIVATED', expires_at=NULL WHERE mission_id=$1 AND state='ACCEPTED_HOLD'", [id]);
  const membershipIds: string[] = [];
  const taskIds: string[] = [];
  for (const invite of invites) {
    const source = invite.lineage?.sourceInvitationId ?? invite.id;
    const [resp] = await query<{ id: string }>(
      "SELECT id FROM participant_responses WHERE invitation_id=$1 AND (doc->>'action')='ACCEPT' ORDER BY created_at DESC LIMIT 1",
      [invite.lineage ? source : invite.id],
      tx,
    );
    const member = proposal!.members.find((m) => m.participantId === invite.participant_id)!;
    const membership = {
      id: randomUUID(),
      missionId: id,
      participantId: invite.participant_id,
      approvedRole: member.role,
      termsHash: invite.terms_hash,
      invitationId: invite.id,
      responseId: invite.lineage?.sourceResponseId ?? resp.id,
      joinedAt: iso(now),
    };
    await tx.query("INSERT INTO mission_memberships(id, mission_id, participant_id, doc) VALUES ($1,$2,$3,$4)", [membership.id, id, invite.participant_id, JSON.stringify(membership)]);
    membershipIds.push(membership.id);
    const task = {
      id: randomUUID(),
      missionId: id,
      ownerMembershipId: membership.id,
      description: `${member.role}: ${member.terms.responsibilities[0]}`.slice(0, 2000),
      status: "TODO" as const,
      dueAt: member.terms.schedule.end,
      version: 1,
    };
    await tx.query("INSERT INTO mission_tasks(id, mission_id, owner_membership_id, status, version, doc) VALUES ($1,$2,$3,'TODO',1,$4)", [task.id, id, membership.id, JSON.stringify(task)]);
    taskIds.push(task.id);
  }
  // A public resource informs the first step as an explicit, unverified review task for the creator.
  const [resource] = await loadOpportunities(id, tx);
  const creatorMembership = membershipIds[invites.findIndex((i) => i.participant_id === mission.creator_id)];
  if (resource && creatorMembership) {
    const task = { id: randomUUID(), missionId: id, ownerMembershipId: creatorMembership, description: `Review public resource (unverified): ${resource.title} — ${resource.sourceURL}`.slice(0, 2000), status: "TODO" as const, dueAt: null, version: 1 };
    await tx.query("INSERT INTO mission_tasks(id, mission_id, owner_membership_id, status, version, doc) VALUES ($1,$2,$3,'TODO',1,$4)", [task.id, id, creatorMembership, JSON.stringify(task)]);
    taskIds.push(task.id);
  }
  const next = await bumpMission(tx, mission, { state: "ACTIVATED" });
  await appendEvent(tx, next, "MISSION_ACTIVATED", { membershipIds, taskIds }, { correlationId, proposalRevision, status: "SUCCEEDED" });
  for (const t of taskIds) await appendEvent(tx, next, "TASK_CREATED", { taskId: t }, { correlationId, proposalRevision });
  return buildRoom(next, tx);
}

// ---------- room / tasks / reviews ----------
type Opportunity = z.input<typeof RoomSchema>["opportunities"][number];
async function loadOpportunities(missionId: string, client?: Tx): Promise<Opportunity[]> {
  return (await query<{ doc: Opportunity }>("SELECT doc FROM external_opportunities WHERE mission_id=$1 ORDER BY id LIMIT 30", [missionId], client)).map((r) => r.doc);
}
export async function buildRoom(mission: MissionRow, client?: Tx) {
  const memberships = (await query<{ doc: unknown }>("SELECT doc FROM mission_memberships WHERE mission_id=$1 ORDER BY participant_id", [mission.id], client)).map((r) => r.doc);
  const tasks = (await query<{ doc: Record<string, unknown>; status: string; version: number }>("SELECT doc, status, version FROM mission_tasks WHERE mission_id=$1 ORDER BY id", [mission.id], client)).map((r) => ({ ...r.doc, status: r.status, version: r.version }));
  const reviews = (await query<{ doc: Record<string, unknown>; status: string; version: number }>("SELECT doc, status, version FROM review_requests WHERE mission_id=$1", [mission.id], client)).map((r) => ({ ...r.doc, status: r.status, version: r.version }));
  return RoomSchema.parse({ mission: await missionDto(mission, client), memberships, tasks, opportunities: await loadOpportunities(mission.id, client), briefs: [], reviews });
}

// MEMBER: creator principal, owner of a member profile, or an invitation session of a member.
export async function memberAccess(session: SessionRecord | null, invite: SessionRecord | null, missionId: string, client?: Tx) {
  const principal = session ?? invite!;
  const mission = await loadMission(missionId, principal.scope, client);
  const members = (await query<{ participant_id: string; id: string }>("SELECT participant_id, id FROM mission_memberships WHERE mission_id=$1", [missionId], client));
  const memberIds = new Set(members.map((m) => m.participant_id));
  let participantIds: string[] = [];
  if (session && session.scope.executionMode === principal.scope.executionMode) participantIds = await principalParticipantIds(session.principalId, session.scope, client);
  if (invite) participantIds.push(invite.principalId);
  const isCreator = session?.principalId === mission.owner_principal_id;
  const mine = participantIds.filter((p) => memberIds.has(p));
  if (!isCreator && !mine.length) fail("NOT_FOUND", "Mission room not found.");
  if (mission.state !== "ACTIVATED" && mission.state !== "CANCELLED") fail("NOT_FOUND", "The room opens after activation.");
  return { mission, isCreator, membershipIds: new Set(members.filter((m) => mine.includes(m.participant_id)).map((m) => m.id)) };
}

export async function room(session: SessionRecord | null, invite: SessionRecord | null, id: string) {
  const { mission } = await memberAccess(session, invite, id);
  return buildRoom(mission);
}

export async function updateTask(tx: Tx, session: SessionRecord | null, invite: SessionRecord | null, id: string, taskId: string, expectedVersion: number, status: "TODO" | "IN_PROGRESS" | "DONE", correlationId: string) {
  const access = await memberAccess(session, invite, id, tx);
  if (access.mission.state !== "ACTIVATED") fail("TERMINAL_MISSION", "Mission is no longer active.");
  const [task] = await query<{ doc: Record<string, unknown>; owner_membership_id: string; version: number }>("SELECT * FROM mission_tasks WHERE id=$1 AND mission_id=$2 FOR UPDATE", [taskId, id], tx);
  if (!task) fail("NOT_FOUND", "Task not found.");
  if (!access.isCreator && !access.membershipIds.has(task.owner_membership_id)) fail("FORBIDDEN", "Only the task owner or creator can update this task.");
  if (task.version !== expectedVersion) fail("STALE_VERSION", "Task changed since you loaded it.");
  const [updated] = await query<{ doc: Record<string, unknown>; status: string; version: number }>("UPDATE mission_tasks SET status=$2, version=version+1 WHERE id=$1 RETURNING doc, status, version", [taskId, status], tx);
  const mission = await loadMission(id, access.mission.scope_mode === "LIVE" ? { executionMode: "LIVE", showcaseId: null } : { executionMode: "SHOWCASE", showcaseId: access.mission.showcase_id }, tx, true);
  await appendEvent(tx, mission, "TASK_UPDATED", { taskId }, { correlationId });
  return MissionTaskSchema.parse({ ...updated.doc, status: updated.status, version: updated.version });
}

export async function requestReview(tx: Tx, session: SessionRecord | null, invite: SessionRecord | null, id: string, input: { expectedVersion: number; kind: "SCHEDULE_CHANGE" | "WITHDRAWAL"; reason: string; proposedAvailability: { start: string; end: string; timezone: string }[] }, correlationId: string) {
  const access = await memberAccess(session, invite, id, tx);
  const mission = await loadMission(id, scopeOf(access.mission), tx, true);
  if (mission.state !== "ACTIVATED") fail("TERMINAL_MISSION", "Reviews apply to active missions.");
  if (mission.version !== input.expectedVersion) fail("STALE_VERSION", "Mission changed since you loaded it.");
  const [membership] = await query<{ participant_id: string }>("SELECT participant_id FROM mission_memberships WHERE id = ANY($1::uuid[]) LIMIT 1", [[...access.membershipIds]], tx);
  if (!membership) fail("FORBIDDEN", "Only members can request a review.");
  const doc = { id: randomUUID(), missionId: id, requestedByParticipantId: membership.participant_id, kind: input.kind, reason: input.reason, proposedAvailability: input.proposedAvailability, status: "OPEN" as const, version: 1 };
  await tx.query("INSERT INTO review_requests(id, mission_id, status, version, doc) VALUES ($1,$2,'OPEN',1,$3)", [doc.id, id, JSON.stringify(doc)]);
  const next = await bumpMission(tx, mission);
  await appendEvent(tx, next, "REVIEW_REQUESTED", { reviewRequestId: doc.id }, { correlationId });
  return doc;
}

export async function updateReview(tx: Tx, session: SessionRecord, id: string, reviewId: string, input: { expectedVersion: number; status: "ACKNOWLEDGED" | "RESOLVED"; resolution: string }, correlationId: string) {
  const mission = await loadOwnedMission(id, session, tx, true);
  const [review] = await query<{ doc: Record<string, unknown>; version: number }>("SELECT * FROM review_requests WHERE id=$1 AND mission_id=$2 FOR UPDATE", [reviewId, id], tx);
  if (!review) fail("NOT_FOUND", "Review not found.");
  if (review.version !== input.expectedVersion) fail("STALE_VERSION", "Review changed since you loaded it.");
  // Recording a resolution cannot rewrite consent, roles or reservations (D9).
  const [updated] = await query<{ doc: Record<string, unknown>; status: string; version: number }>("UPDATE review_requests SET status=$2, version=version+1 WHERE id=$1 RETURNING doc, status, version", [reviewId, input.status], tx);
  await appendEvent(tx, mission, "REVIEW_UPDATED", { reviewRequestId: reviewId }, { correlationId });
  return ReviewRequestSchema.parse({ ...updated.doc, status: updated.status, version: updated.version });
}

export async function cancel(tx: Tx, session: SessionRecord, id: string, expectedVersion: number, correlationId: string) {
  const mission = await loadOwnedMission(id, session, tx, true);
  assertVersion(mission, expectedVersion);
  await tx.query("UPDATE reservations SET state='RELEASED' WHERE mission_id=$1 AND state<>'RELEASED'", [id]);
  const open = await query<InvitationRow>("UPDATE invitations SET status='REVOKED', token_hash=NULL WHERE mission_id=$1 AND status IN ('PENDING','COUNTERPROPOSED') RETURNING *", [id], tx);
  await tx.query("UPDATE jobs SET status='CANCELLED' WHERE mission_id=$1 AND status IN ('QUEUED','LEASED','WAITING')", [id]);
  await tx.query("UPDATE sessions SET revoked_at=now() WHERE kind='INVITATION' AND invitation_id IN (SELECT id FROM invitations WHERE mission_id=$1)", [id]);
  const next = await bumpMission(tx, mission, { state: "CANCELLED" });
  for (const i of open) await appendEvent(tx, next, "INVITATION_REVOKED", { invitationId: i.id, participantId: i.participant_id, invitationStatus: "REVOKED" }, { correlationId, proposalRevision: i.proposal_revision });
  await appendEvent(tx, next, "MISSION_CANCELLED", { state: "CANCELLED" }, { correlationId });
  return { missionId: id, version: next.version, state: next.state };
}

// Retry/resume: creator supplies a server checkpoint; only recoverable states, never terminal or activated.
export async function recover(tx: Tx, session: SessionRecord, id: string, expectedVersion: number, checkpointId: string, mode: "retry" | "resume", correlationId: string) {
  const mission = await loadOwnedMission(id, session, tx, true);
  assertVersion(mission, expectedVersion);
  const allowed = mode === "retry" ? ["FAILED"] : ["PAUSED_FOR_HUMAN"];
  if (!allowed.includes(mission.state)) fail("STALE_VERSION", `Mission cannot ${mode} from ${mission.state}.`);
  const [job] = await query<{ id: string; checkpoint: { kind: string } }>("SELECT id, checkpoint FROM jobs WHERE id=$1 AND mission_id=$2", [checkpointId, id], tx);
  if (!job) fail("NOT_FOUND", "Checkpoint not found.");
  const replan = job!.checkpoint.kind === "REPLAN";
  const state = replan ? "REPLANNING" : "DISCOVERING";
  const next = await bumpMission(tx, mission, { state });
  const runId = await enqueueJob(tx, next, "STRATEGIST", replan ? "REPLAN" : "STRATEGIST", state);
  await appendEvent(tx, next, mode === "retry" ? "MISSION_RETRIED" : "MISSION_RESUMED", { checkpoint: replan ? "REPLAN" : "STRATEGIST" }, { correlationId });
  return { missionId: id, runId, state: next.state, version: next.version };
}

const scopeOf = (m: MissionRow): Scope => (m.scope_mode === "SHOWCASE" ? { executionMode: "SHOWCASE", showcaseId: m.showcase_id } : { executionMode: "LIVE", showcaseId: null });
