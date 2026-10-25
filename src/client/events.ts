import type {
  AgentEvent,
  Invitation,
  MissionSnapshot,
} from "@/contracts";

// Committed event log projection. Events are authoritative; nothing here advances on elapsed time.
export type EventLogState = {
  cursor: number;
  events: AgentEvent[];
  accessEpoch: number | null;
  revoked: boolean;
  /** Set when a pushed (SSE) frame skipped sequences; caller must backfill over JSON before applying more. */
  gapAfter: number | null;
};

export const initialEventLog: EventLogState = {
  cursor: 0,
  events: [],
  accessEpoch: null,
  revoked: false,
  gapAfter: null,
};

export type EventLogAction =
  | {
      type: "page";
      events: AgentEvent[];
      nextSequence: number;
      accessEpoch: number;
    }
  | { type: "frame"; event: AgentEvent }
  | { type: "reset" };

const MAX_EVENTS = 500;

function append(state: EventLogState, incoming: AgentEvent[]): EventLogState {
  const fresh = incoming.filter((e) => e.sequence > state.cursor);
  if (!fresh.length) return state;
  const sorted = [...fresh].sort((a, b) => a.sequence - b.sequence);
  const unique: AgentEvent[] = [];
  for (const e of sorted)
    if (!unique.length || unique[unique.length - 1].sequence !== e.sequence)
      unique.push(e);
  const events = [...state.events, ...unique].slice(-MAX_EVENTS);
  return {
    ...state,
    events,
    cursor: unique[unique.length - 1].sequence,
    revoked:
      state.revoked || unique.some((e) => e.type === "ACCESS_REVOKED"),
  };
}

export function eventLogReducer(
  state: EventLogState,
  action: EventLogAction,
): EventLogState {
  switch (action.type) {
    case "reset":
      return initialEventLog;
    case "page": {
      // A changed access epoch invalidates everything derived under the old authorization.
      if (state.accessEpoch !== null && action.accessEpoch < state.accessEpoch)
        return state;
      if (state.accessEpoch !== null && action.accessEpoch > state.accessEpoch)
        return {
          ...initialEventLog,
          accessEpoch: action.accessEpoch,
        };
      return append(
        { ...state, accessEpoch: action.accessEpoch, gapAfter: null },
        action.events,
      );
    }
    case "frame": {
      const e = action.event;
      if (e.sequence <= state.cursor) return state; // duplicate or old frame
      if (state.gapAfter !== null) return state; // wait for JSON backfill
      if (e.sequence !== state.cursor + 1)
        return { ...state, gapAfter: state.cursor };
      return append(state, [e]);
    }
  }
}

/** A newer authoritative snapshot wins; an older response arriving late never overwrites it. */
export function pickNewerSnapshot(
  current: MissionSnapshot | undefined,
  incoming: MissionSnapshot,
): MissionSnapshot {
  if (!current) return incoming;
  if (incoming.mission.id !== current.mission.id) return incoming;
  if (incoming.snapshotSequence < current.snapshotSequence) return current;
  if (
    incoming.snapshotSequence === current.snapshotSequence &&
    incoming.mission.version < current.mission.version
  )
    return current;
  return incoming;
}

export type InvitationTrack = {
  invitationId: string;
  participantId: string;
  status: Invitation["status"];
  proposalRevision: number | null;
  sequence: number;
  occurredAt: string;
};

/** Latest committed invitation status per participant (newest proposal revision wins). */
export function invitationTracks(events: AgentEvent[]): InvitationTrack[] {
  const byParticipant = new Map<string, InvitationTrack>();
  for (const e of events) {
    if (!e.type.startsWith("INVITATION_")) continue;
    const p = e.payload as {
      invitationId: string;
      participantId: string;
      invitationStatus: Invitation["status"];
    };
    const prev = byParticipant.get(p.participantId);
    if (prev && prev.sequence > e.sequence) continue;
    byParticipant.set(p.participantId, {
      invitationId: p.invitationId,
      participantId: p.participantId,
      status: p.invitationStatus,
      proposalRevision: e.proposalRevision,
      sequence: e.sequence,
      occurredAt: e.occurredAt,
    });
  }
  return [...byParticipant.values()].sort((a, b) => a.sequence - b.sequence);
}

export function latestOf<T extends AgentEvent["type"]>(
  events: AgentEvent[],
  type: T,
): Extract<AgentEvent, { type: T }> | undefined {
  for (let i = events.length - 1; i >= 0; i--)
    if (events[i].type === type)
      return events[i] as Extract<AgentEvent, { type: T }>;
  return undefined;
}

/** The proposal revision the creator most recently selected (invitations are issued against it). */
export function selectedRevision(events: AgentEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === "INVITATION_SENT" && e.proposalRevision !== null)
      return e.proposalRevision;
  }
  return null;
}

// The eight approved event-bound motion meanings (Design System v1.0 §7).
export type MotionMeaning =
  | "network-emergence"
  | "mission-formation"
  | "agent-execution"
  | "discovery"
  | "invitation-ready"
  | "decline-repair"
  | "activation"
  | "voice";

export function motionFor(event: AgentEvent): MotionMeaning | null {
  switch (event.type) {
    case "PROFILE_CHANGED":
      return "network-emergence";
    case "REQUIREMENT_CONFIRMED":
    case "REQUIREMENT_CREATED":
      return "mission-formation";
    case "AGENT_STARTED":
    case "AGENT_COMPLETED":
    case "AGENT_FAILED":
    case "TOOL_STARTED":
    case "TOOL_COMPLETED":
    case "TOOL_FAILED":
    case "EXTRACTION_STARTED":
    case "EXTRACTION_COMPLETED":
    case "SCOUT_SEARCH_STARTED":
      return "agent-execution";
    case "CANDIDATES_FOUND":
    case "OPPORTUNITIES_FOUND":
      return "discovery";
    case "INVITATION_SENT":
      return "invitation-ready";
    case "INVITATION_DECLINED":
    case "REPLAN_STARTED":
    case "REPLAN_COMPLETED":
      return "decline-repair";
    case "MISSION_ACTIVATED":
      return "activation";
    default:
      return null;
  }
}
