import { describe, it, expect } from "vitest";
import { match, type MatchCandidate, type MatchInput } from "@/server/domain/matching/matcher";
import { mission, participants } from "@/fixtures/scenarios";

const H = 3600_000;
const T0 = Date.parse("2026-10-25T14:00:00Z");
const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const person = (n: number, skills: [string, number][], extra: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: id(n),
  capabilities: skills.map(([skillId, level]) => ({ skillId, level })),
  needs: [],
  interests: [],
  availability: [{ start: T0, end: T0 + 2 * H }],
  busy: [],
  ...extra,
});
const base = (candidates: MatchCandidate[], over: Partial<MatchInput> = {}): MatchInput => ({
  candidates,
  requirements: [
    { id: "r-design", kind: "HUMAN", skillId: "design", priority: "REQUIRED", minimumCoverage: 1, minimumLevel: 2 },
    { id: "r-hw", kind: "HUMAN", skillId: "hardware", priority: "REQUIRED", minimumCoverage: 1, minimumLevel: 2 },
  ],
  preferences: [],
  minGroupSize: 3,
  maxGroupSize: 3,
  minOverlapMinutes: 60,
  window: { start: T0, end: T0 + 2 * H },
  creatorId: id(1),
  acceptedGroup: null,
  ...over,
});

describe("bounded deterministic matcher", () => {
  it("forms the covering team including the creator", () => {
    const out = match(base([person(1, [["coordination", 3]]), person(2, [["design", 3]]), person(3, [["hardware", 3]])]));
    expect(out.feasibility).toBe("FEASIBLE");
    expect(out.groups[0].participantIds).toEqual([id(1), id(2), id(3)]);
    expect(out.search.complete).toBe(true);
  });
  it("treats missing availability and other-mission holds as unavailable", () => {
    const c = [
      person(1, [["coordination", 3]]),
      person(2, [["design", 3]], { availability: [] }),
      person(3, [["hardware", 3]]),
      person(4, [["design", 3]], { busy: [{ start: T0, end: T0 + 2 * H }] }),
    ];
    const out = match(base(c));
    expect(out.feasibility).toBe("NO_SOLUTION");
    expect(out.search.complete).toBe(true);
    expect(out.groups).toEqual([]);
  });
  it("enforces minimum level and common overlap", () => {
    const low = match(base([person(1, [["coordination", 3]]), person(2, [["design", 1]]), person(3, [["hardware", 3]])]));
    expect(low.feasibility).toBe("NO_SOLUTION");
    expect(low.uncoveredRequirementIds).toEqual(["r-design"]);
    const late = match(
      base([
        person(1, [["coordination", 3]]),
        person(2, [["design", 3]], { availability: [{ start: T0 + 90 * 60_000, end: T0 + 2 * H }] }),
        person(3, [["hardware", 3]]),
      ]),
    );
    expect(late.feasibility).toBe("NO_SOLUTION");
  });
  it("ranks by mutual benefit before team size, then by sorted UUID tuple", () => {
    const c = [
      person(1, [["coordination", 3]], { needs: ["research"] }),
      person(2, [["design", 3]]),
      person(3, [["hardware", 3]]),
      person(4, [["hardware", 3]]),
      person(5, [["research", 2]]),
    ];
    const out = match(base(c, { minGroupSize: 3, maxGroupSize: 4 }));
    expect(out.groups[0].participantIds).toEqual([id(1), id(2), id(3), id(5)]);
    expect(out.groups[0].score.mutualBenefit).toBe(1);
    const tie = match(base(c, { maxGroupSize: 3 }));
    expect(tie.groups.map((g) => g.participantIds)).toEqual([
      [id(1), id(2), id(3)],
      [id(1), id(2), id(4)],
    ]);
  });
  it("reports a node-bounded search as SEARCH_LIMIT_REACHED, never as no solution", () => {
    const out = match(base([person(1, [["coordination", 3]]), person(2, [["design", 3]]), person(3, [["hardware", 3]])], { maxNodes: 2 }));
    expect(out.search.complete).toBe(false);
    expect(out.search.stoppedBecause).toBe("NODE_LIMIT");
    expect(out.feasibility).not.toBe("NO_SOLUTION");
  });
  it("is reproducible on the 30 synthetic fixture profiles", () => {
    const candidates: MatchCandidate[] = participants.map((p) => ({
      id: p.id,
      capabilities: p.capabilities.map((c) => ({ skillId: c.normalizedSkillId, level: c.level })),
      needs: p.needs,
      interests: p.interests,
      availability: p.availability.map((i) => ({ start: Date.parse(i.start), end: Date.parse(i.end) })),
      busy: [],
    }));
    const input = base(candidates, {
      requirements: mission.requirements.map((r) => ({ id: r.id, kind: r.kind, skillId: r.normalizedSkillId, priority: r.priority, minimumCoverage: r.minimumCoverage, minimumLevel: r.minimumLevel })),
      preferences: mission.constraints.preferences,
      creatorId: mission.creatorId,
      window: { start: Date.parse(mission.constraints.window.start), end: Date.parse(mission.constraints.window.end) },
    });
    const a = match(input);
    const b = match(input);
    expect(a.feasibility).toBe("FEASIBLE");
    expect(a.groups.map((g) => g.participantIds)).toEqual(b.groups.map((g) => g.participantIds));
    expect(a.groups.length).toBeLessThanOrEqual(5);
    expect(a.groups[0].participantIds).toContain(mission.creatorId);
  });
});
