import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import {
  GroupProposalSchema,
  canonicalTermsJson,
  type CommitmentTerms,
  type GroupProposal,
  type Mission,
  type Scope,
} from "@/contracts";
import type { MatchGroup, MatchOutput } from "../matching/matcher";

export const termsHash = (terms: CommitmentTerms): string =>
  createHash("sha256").update(canonicalTermsJson(terms), "utf8").digest("hex");
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
const title = (skill: string) => skill.charAt(0).toUpperCase() + skill.slice(1).replace(/-/g, " ");

// Deterministic roles/terms from matcher output; no model text participates in consent terms.
export function buildProposal(input: {
  mission: Mission;
  scope: Scope;
  revision: number;
  group: MatchGroup;
  search: MatchOutput["search"];
  profileVersions: Map<string, number>;
  names: Map<string, string>;
  resourceTitle?: string;
}): GroupProposal {
  const { mission, group } = input;
  const missionId = mission.id;
  const window = {
    start: iso(group.commonWindow.start),
    end: iso(group.commonWindow.end),
    timezone: mission.constraints.window.timezone,
  };
  const roles = group.participantIds.map((pid) => {
    const covered = mission.requirements.filter((r) => group.coverage[r.id]?.includes(pid));
    const isCreator = pid === mission.creatorId;
    const role = covered.length
      ? `${title(covered[0].normalizedSkillId)} lead`
      : isCreator
        ? "Mission creator"
        : "Collaborator";
    const responsibilities = [
      ...covered.map((r) => r.outcome ?? `Cover ${title(r.normalizedSkillId).toLowerCase()} for the mission`),
      ...(isCreator ? [`Coordinate the team toward: ${mission.expectedOutput}`.slice(0, 2000)] : []),
    ];
    if (!responsibilities.length) responsibilities.push("Support the team during the agreed window");
    return { pid, role, responsibilities, covered: covered.map((r) => r.id) };
  });
  const disclosedGroup = roles.map((r) => ({ participantId: r.pid, role: r.role }));
  const members = roles.map((r) => {
    const terms: CommitmentTerms = {
      participantId: r.pid,
      missionId,
      role: r.role,
      responsibilities: r.responsibilities,
      schedule: window,
      disclosedGroup,
      objective: mission.objective,
      expectedOutput: mission.expectedOutput,
    };
    return {
      participantId: r.pid,
      profileVersion: input.profileVersions.get(r.pid) ?? 1,
      role: r.role,
      coveredRequirementIds: r.covered,
      terms,
      termsHash: termsHash(terms),
    };
  });
  const coveredSummary = mission.requirements
    .filter((r) => r.kind === "HUMAN")
    .map((r) => `${r.normalizedSkillId}: ${(group.coverage[r.id] ?? []).map((id) => input.names.get(id) ?? "member").join(", ") || "uncovered"}`)
    .join("; ");
  return GroupProposalSchema.parse({
    id: randomUUID(),
    missionId,
    revision: input.revision,
    constraintsVersion: mission.constraintsVersion,
    scope: input.scope,
    members,
    commonWindow: window,
    score: group.score,
    search: {
      algorithmVersion: "bounded-lexicographic-1",
      taxonomyVersion: "taxonomy-1",
      visitedNodes: input.search.visitedNodes,
      maxNodes: 50000,
      maxWallTimeMs: 1500,
      elapsedMs: input.search.elapsedMs,
      complete: input.search.complete,
      stoppedBecause: input.search.stoppedBecause,
    },
    rationale: `${group.participantIds.length} people share ${Math.round((group.commonWindow.end - group.commonWindow.start) / 60000)} minutes from ${window.start}. Coverage — ${coveredSummary}. Ranked by optional coverage ${group.score.optionalCoverage}, mutual benefit ${group.score.mutualBenefit}, interest relevance ${group.score.interestRelevance}, preserved commitments ${group.score.preservedCommitments}.${input.search.complete ? "" : " Search stopped at its bound, so this is the best found, not proven optimal."}${input.resourceTitle ? ` Public resource to review first (unverified, not a team member): ${input.resourceTitle}.` : ""}`.slice(0, 2000),
    createdAt: iso(Date.now()),
  });
}
