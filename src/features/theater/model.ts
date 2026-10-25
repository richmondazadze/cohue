import type {
  AgentEvent,
  GroupProposal,
  MatchResult,
  MissionSnapshot,
} from "@/contracts";
import { skillLabel } from "@/features/shared/skills";
import { invitationTracks, selectedRevision, type InvitationTrack } from "@/client/events";

// Pure projections for the Theater. Coverage (feasibility) and approvals (consent) stay separate facts.

export function participantNames(snapshot: MissionSnapshot): Map<string, string> {
  const names = new Map<string, string>();
  for (const n of snapshot.graph.nodes)
    if (n.kind === "participant") names.set(n.id, n.label);
  return names;
}

export function nameFor(names: Map<string, string>, id: string): string {
  return names.get(id) ?? `Participant ${id.slice(0, 4).toUpperCase()}`;
}

export function initialsOf(name: string): string {
  const parts = name.replace(/\[.*?\]/g, "").trim().split(/\s+/).filter(Boolean);
  const s = (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return s.toUpperCase();
}

/** The proposal invitations were issued against, else the newest revision available for review. */
export function currentProposal(
  snapshot: MissionSnapshot,
  events: AgentEvent[],
): GroupProposal | null {
  if (!snapshot.proposals.length) return null;
  const rev = selectedRevision(events);
  const newest = [...snapshot.proposals].sort((a, b) => b.revision - a.revision)[0];
  if (rev !== null) {
    const selected = snapshot.proposals.find((p) => p.revision === rev);
    // A repaired proposal newer than the selected one supersedes it for review.
    if (selected && newest.revision <= rev) return selected;
  }
  return newest;
}

export type CoverageRow = {
  id: string;
  label: string;
  required: boolean;
  kind: "HUMAN" | "RESOURCE";
  needed: number;
  covered: number;
  by: string[];
};

export function coverage(
  snapshot: MissionSnapshot,
  proposal: GroupProposal | null,
): CoverageRow[] {
  return snapshot.mission.requirements.map((r) => {
    const by = proposal
      ? proposal.members
          .filter((m) => m.coveredRequirementIds.includes(r.id))
          .map((m) => m.participantId)
      : [];
    return {
      id: r.id,
      label: skillLabel(r.normalizedSkillId),
      required: r.priority === "REQUIRED",
      kind: r.kind,
      needed: r.minimumCoverage,
      covered: by.length,
      by,
    };
  });
}

export function coverageSummary(rows: CoverageRow[]) {
  const required = rows.filter((r) => r.required && r.kind === "HUMAN");
  return {
    covered: required.filter((r) => r.covered >= r.needed).length,
    total: required.length,
  };
}

export type MemberStatus = {
  participantId: string;
  role: string;
  /** Latest committed invitation status for this person in this mission. */
  track: InvitationTrack | null;
  /** True when the track belongs to the proposal revision shown (not an earlier one). */
  current: boolean;
};

export function memberStatuses(
  proposal: GroupProposal | null,
  events: AgentEvent[],
): MemberStatus[] {
  if (!proposal) return [];
  const tracks = new Map(invitationTracks(events).map((t) => [t.participantId, t]));
  return proposal.members.map((m) => {
    const t = tracks.get(m.participantId) ?? null;
    // A track from an older revision describes an earlier invitation, not consent to this proposal.
    const current = Boolean(
      t && (t.proposalRevision === null || t.proposalRevision === proposal.revision),
    );
    return { participantId: m.participantId, role: m.role, track: t, current };
  });
}

export type ActivationGate =
  | { ready: true }
  | { ready: false; reason: string };

export function activationGate(snapshot: MissionSnapshot): ActivationGate {
  const { state } = snapshot.mission;
  const { accepted, required } = snapshot.approvals;
  if (state === "ACTIVATED") return { ready: false, reason: "Already activated." };
  if (state !== "AWAITING_APPROVAL")
    return { ready: false, reason: "Activation is possible only while awaiting approvals." };
  if (required === 0) return { ready: false, reason: "No approvals are required yet." };
  if (accepted !== required)
    return {
      ready: false,
      reason: `${required - accepted} of ${required} required ${required - accepted === 1 ? "person has" : "people have"} not approved yet.`,
    };
  return { ready: true };
}

export function pauseExplanation(
  events: AgentEvent[],
  match: MatchResult | undefined,
): { title: string; body: string } | null {
  const pause = [...events].reverse().find((e) => e.type === "PAUSED_FOR_HUMAN");
  const reason =
    pause && pause.type === "PAUSED_FOR_HUMAN"
      ? pause.payload.reason
      : match?.feasibility === "NO_SOLUTION" || match?.feasibility === "SEARCH_LIMIT_REACHED"
        ? match.feasibility
        : null;
  switch (reason) {
    case "NO_SOLUTION":
      return {
        title: "No group can meet these requirements",
        body: "The search checked every combination and none satisfied the hard constraints. Change requirements, time window or group size to continue.",
      };
    case "SEARCH_LIMIT_REACHED":
      return {
        title: "Search stopped at its limit before finding a group",
        body: "This is not proof that no group exists. The bounded search ran out of budget. Narrowing requirements or the window may help.",
      };
    case "TERMS_REVIEW_REQUIRED":
      return {
        title: "Changed terms need your review",
        body: "A repair changed the group or schedule. Review the new proposal; affected people must consent again.",
      };
    case "MISSING_INPUT":
      return {
        title: "More information is needed",
        body: pause && pause.type === "PAUSED_FOR_HUMAN" ? `Checkpoint: ${pause.payload.checkpoint}` : "Provide the missing input to continue.",
      };
    default:
      return null;
  }
}

const AGENT_MARK: Record<string, string> = {
  DIRECTOR: "D",
  SCOUT: "Sc",
  STRATEGIST: "St",
  COORDINATOR: "C",
};
export const agentMark = (a: string | null) => (a ? (AGENT_MARK[a] ?? a[0]) : null);

export function describeEvent(e: AgentEvent, names: Map<string, string>): string {
  const who = (id: string) => nameFor(names, id);
  switch (e.type) {
    case "MISSION_CREATED":
      return "Mission brief saved as a draft";
    case "EXTRACTION_STARTED":
    case "AGENT_STARTED":
    case "TOOL_STARTED":
    case "SCOUT_SEARCH_STARTED":
      return `Started: ${e.payload.operation}`;
    case "EXTRACTION_COMPLETED":
    case "AGENT_COMPLETED":
    case "TOOL_COMPLETED":
      return `Completed: ${e.payload.operation}`;
    case "AGENT_FAILED":
    case "TOOL_FAILED":
    case "PROVIDER_FAILED":
      return `Failed (${e.payload.code.toLowerCase().replace(/_/g, " ")})${e.payload.retryable ? " · retryable" : ""}`;
    case "REQUIREMENT_CREATED":
      return "Requirement recorded";
    case "REQUIREMENT_CONFIRMED":
      return "Requirement confirmed";
    case "CANDIDATES_FOUND":
      return `${e.payload.candidateIds.length} candidate${e.payload.candidateIds.length === 1 ? "" : "s"} found`;
    case "OPPORTUNITIES_FOUND":
      return `${e.payload.opportunityIds.length} public resource${e.payload.opportunityIds.length === 1 ? "" : "s"} found · unverified`;
    case "PROPOSAL_CREATED":
      return `Proposal revision ${e.proposalRevision ?? ""} ready for review`;
    case "INVITATION_SENT":
      return `Invitation ready for ${who(e.payload.participantId)}`;
    case "INVITATION_ACCEPTED":
      return `${who(e.payload.participantId)} approved the terms`;
    case "INVITATION_DECLINED":
      return `${who(e.payload.participantId)} declined`;
    case "INVITATION_COUNTERPROPOSED":
      return `${who(e.payload.participantId)} suggested a change (not an acceptance)`;
    case "INVITATION_EXPIRED":
      return `Invitation for ${who(e.payload.participantId)} expired`;
    case "INVITATION_REVOKED":
      return `Invitation for ${who(e.payload.participantId)} withdrawn`;
    case "REPLAN_STARTED":
      return `Replanning · ${e.payload.uncoveredRequirementIds.length} requirement${e.payload.uncoveredRequirementIds.length === 1 ? "" : "s"} uncovered`;
    case "REPLAN_COMPLETED":
      return "Repaired proposal ready for review";
    case "PAUSED_FOR_HUMAN":
      return `Paused for your input · ${e.payload.reason.toLowerCase().replace(/_/g, " ")}`;
    case "MISSION_ACTIVATED":
      return `Activated with ${e.payload.membershipIds.length} members and ${e.payload.taskIds.length} tasks`;
    case "TASK_CREATED":
      return "Task created";
    case "TASK_UPDATED":
      return "Task updated";
    case "MISSION_CANCELLED":
      return "Mission cancelled";
    case "MISSION_EXPIRED":
      return "Mission expired";
    case "MISSION_RETRIED":
      return `Retry from ${e.payload.checkpoint}`;
    case "MISSION_RESUMED":
      return `Resumed from ${e.payload.checkpoint}`;
    case "PROFILE_CHANGED":
      return `${who(e.payload.participantId)} updated their profile`;
    case "REVIEW_REQUESTED":
      return "A member requested a review";
    case "REVIEW_UPDATED":
      return "Review request updated";
    case "ACCESS_REVOKED":
      return "Access changed";
  }
}

/** The step currently open (STARTED without a later completion/failure for the same run+agent). */
export function openStep(events: AgentEvent[]): AgentEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (/_(COMPLETED|FAILED)$/.test(e.type) || e.type === "PROPOSAL_CREATED") return null;
    if (/_STARTED$/.test(e.type) && e.type !== "REPLAN_STARTED") return e;
  }
  return null;
}
