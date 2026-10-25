import { describe, expect, it } from "vitest";
import type { AgentEvent, MissionSnapshot } from "@/contracts";
import {
  eventLogReducer,
  initialEventLog,
  invitationTracks,
  motionFor,
  pickNewerSnapshot,
  selectedRevision,
} from "@/client/events";

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const LIVE = { executionMode: "LIVE", showcaseId: null } as const;
function ev(seq: number, type: AgentEvent["type"], payload: object = {}, extra: object = {}): AgentEvent {
  return {
    schemaVersion: 1, id: id(1000 + seq), missionId: id(1), scope: LIVE, runId: null, agent: null,
    sequence: seq, missionVersion: seq, proposalRevision: null, correlationId: id(2), causationId: null,
    occurredAt: "2026-10-25T14:00:00Z", status: "SUCCEEDED", durationMs: null, type, payload, ...extra,
  } as AgentEvent;
}
const page = (events: AgentEvent[], accessEpoch = 1) => ({
  type: "page" as const, events, accessEpoch,
  nextSequence: events.length ? events[events.length - 1].sequence : 0,
});

describe("event log reducer", () => {
  it("orders and de-duplicates committed events across overlapping pages", () => {
    let s = eventLogReducer(initialEventLog, page([ev(1, "MISSION_CREATED", { state: "DRAFT" }), ev(2, "TASK_CREATED", { taskId: id(3) })]));
    s = eventLogReducer(s, page([ev(2, "TASK_CREATED", { taskId: id(3) }), ev(3, "TASK_UPDATED", { taskId: id(3) })]));
    expect(s.events.map((e) => e.sequence)).toEqual([1, 2, 3]);
    expect(s.cursor).toBe(3);
  });
  it("ignores old or duplicate pushed frames and flags gaps for JSON backfill", () => {
    let s = eventLogReducer(initialEventLog, page([ev(1, "MISSION_CREATED", { state: "DRAFT" })]));
    s = eventLogReducer(s, { type: "frame", event: ev(1, "MISSION_CREATED", { state: "DRAFT" }) });
    expect(s.events).toHaveLength(1);
    s = eventLogReducer(s, { type: "frame", event: ev(3, "TASK_CREATED", { taskId: id(3) }) });
    expect(s.gapAfter).toBe(1);
    expect(s.cursor).toBe(1);
    s = eventLogReducer(s, { type: "frame", event: ev(2, "TASK_CREATED", { taskId: id(3) }) });
    expect(s.cursor).toBe(1); // still waiting for backfill
    s = eventLogReducer(s, page([ev(2, "TASK_CREATED", { taskId: id(3) }), ev(3, "TASK_CREATED", { taskId: id(4) })]));
    expect(s.gapAfter).toBeNull();
    expect(s.cursor).toBe(3);
  });
  it("clears everything when the access epoch advances and ignores older epochs", () => {
    let s = eventLogReducer(initialEventLog, page([ev(1, "MISSION_CREATED", { state: "DRAFT" })], 2));
    expect(eventLogReducer(s, page([ev(2, "TASK_CREATED", { taskId: id(3) })], 1))).toBe(s);
    s = eventLogReducer(s, page([ev(2, "TASK_CREATED", { taskId: id(3) })], 3));
    expect(s.events).toEqual([]);
    expect(s.accessEpoch).toBe(3);
  });
  it("drops private event history immediately when a denied stream/backfill revokes access", () => {
    const s = eventLogReducer(initialEventLog, page([ev(1, "MISSION_CREATED", { state: "DRAFT" })]));
    const revoked = eventLogReducer(s, { type: "revoke" });
    expect(revoked.events).toEqual([]);
    expect(revoked.cursor).toBe(0);
    expect(revoked.revoked).toBe(true);
  });
  it("marks ACCESS_REVOKED as revoked", () => {
    const s = eventLogReducer(initialEventLog, page([ev(1, "ACCESS_REVOKED", { reason: "OPT_OUT" })]));
    expect(s.revoked).toBe(true);
  });
});

describe("projections", () => {
  const inv = (seq: number, type: AgentEvent["type"], status: string, rev: number, pid = id(10)) =>
    ev(seq, type, { invitationId: id(20 + seq), participantId: pid, invitationStatus: status }, { proposalRevision: rev });
  it("tracks the newest committed invitation status per person; counter never becomes acceptance", () => {
    const tracks = invitationTracks([
      inv(1, "INVITATION_SENT", "PENDING", 1),
      inv(2, "INVITATION_COUNTERPROPOSED", "COUNTERPROPOSED", 1),
      inv(3, "INVITATION_SENT", "PENDING", 1, id(11)),
    ]);
    expect(tracks.find((t) => t.participantId === id(10))?.status).toBe("COUNTERPROPOSED");
    expect(selectedRevision([inv(1, "INVITATION_SENT", "PENDING", 2)])).toBe(2);
  });
  it("maps events to the eight motion meanings only", () => {
    expect(motionFor(ev(1, "MISSION_ACTIVATED", { membershipIds: [], taskIds: [] }))).toBe("activation");
    expect(motionFor(inv(1, "INVITATION_SENT", "PENDING", 1))).toBe("invitation-ready");
    expect(motionFor(inv(1, "INVITATION_ACCEPTED", "ACCEPTED", 1))).toBeNull();
  });
  it("never lets an older snapshot overwrite a newer one", () => {
    const snap = (seq: number, version: number) =>
      ({ snapshotSequence: seq, mission: { id: id(1), version } }) as unknown as MissionSnapshot;
    expect(pickNewerSnapshot(snap(5, 3), snap(4, 9)).snapshotSequence).toBe(5);
    expect(pickNewerSnapshot(snap(5, 3), snap(6, 3)).snapshotSequence).toBe(6);
    expect(pickNewerSnapshot(snap(5, 3), snap(5, 2)).mission.version).toBe(3);
  });
});
