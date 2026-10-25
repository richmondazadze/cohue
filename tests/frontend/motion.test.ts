import { describe, expect, it } from "vitest";
import type { AgentEvent } from "@/contracts";
import { cuesOf, liveEvents } from "@/features/theater/motion";

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const ev = (seq: number, type: AgentEvent["type"], payload: object) =>
  ({ sequence: seq, id: id(seq), type, payload }) as unknown as AgentEvent;

describe("event-bound motion cues", () => {
  const events = [
    ev(1, "MISSION_CREATED", { state: "DRAFT" }),
    ev(2, "CANDIDATES_FOUND", { candidateIds: [] }),
    ev(3, "INVITATION_SENT", { invitationId: id(9), participantId: id(8), invitationStatus: "PENDING" }),
    ev(4, "MISSION_ACTIVATED", { membershipIds: [], taskIds: [] }),
  ];
  it("never animates history loaded before the baseline (reload shows end state)", () => {
    expect(liveEvents(events, null)).toEqual([]);
    expect(cuesOf(liveEvents(events, 4))).toEqual({});
  });
  it("cues only committed live events, newest per meaning", () => {
    const cues = cuesOf(liveEvents(events, 2));
    expect(cues.activation?.sequence).toBe(4);
    expect(cues["invitation-ready"]?.sequence).toBe(3);
    expect(cues.discovery).toBeUndefined();
  });
});
