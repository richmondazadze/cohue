import { test, expect } from "@playwright/test";
import { newIdempotencyKey } from "./support/contract-client";
import {
  backendStatus,
  humanRequirement,
  join,
  missionInput,
  requireBackend,
  waitForState,
  type Person,
} from "./support/journey";

// I2: running backend -> persisted profiles/mission -> deterministic proposal. Requires an isolated database.
test.describe.configure({ mode: "serial", timeout: 300_000 });

let unavailable: string | null = null;
const people: Person[] = [];
test.beforeAll(async () => {
  unavailable = await backendStatus();
  if (unavailable && requireBackend) throw new Error(unavailable);
});
test.beforeEach(() => test.skip(unavailable !== null, unavailable ?? ""));
test.afterAll(async () => {
  for (const person of people) {
    // Deletion revokes discovery so later runs on the same database do not match stale test people.
    await person.device
      .call("getParticipant", { params: { id: person.participantId } })
      .then((r) =>
        r.ok
          ? person.device.call("deleteParticipant", {
              params: { id: person.participantId },
              input: { expectedVersion: r.data.profileVersion },
              idempotencyKey: newIdempotencyKey(),
            })
          : undefined,
      )
      .catch(() => undefined);
    await person.device.close();
  }
});

test("join -> create -> start persists a feasible deterministic proposal", async () => {
  const creator = await join("creator", "coordination", 3);
  const designer = await join("designer", "design", 3, "es");
  const builder = await join("builder", "hardware", 3, "fr");
  people.push(creator, designer, builder);

  const created = await creator.device.ok("createMission", {
    input: missionInput([
      humanRequirement("design", "product", 2),
      humanRequirement("hardware", "engineering", 2),
    ]),
  });
  expect(created.state).toBe("DRAFT");
  expect(created.creatorId).toBe(creator.participantId);

  const startKey = newIdempotencyKey();
  const started = await creator.device.ok("startMission", {
    params: { id: created.id },
    input: { expectedVersion: created.version },
    idempotencyKey: startKey,
  });
  // Exact replay returns the stored result rather than STALE_VERSION.
  const replay = await creator.device.ok("startMission", {
    params: { id: created.id },
    input: { expectedVersion: created.version },
    idempotencyKey: startKey,
  });
  expect(replay).toEqual(started);
  await creator.device.fails("startMission", "IDEMPOTENCY_CONFLICT", {
    params: { id: created.id },
    input: { expectedVersion: created.version + 1 },
    idempotencyKey: startKey,
  });

  const snapshot = await waitForState(creator, created.id, [
    "PROPOSED",
    "AWAITING_APPROVAL",
    "FAILED",
    "PAUSED_FOR_HUMAN",
  ]);
  expect(snapshot.mission.state).toMatch(/^(PROPOSED|AWAITING_APPROVAL)$/);

  const match = await creator.device.ok("proposals", {
    params: { id: created.id },
  });
  expect(match.feasibility).toBe("FEASIBLE");
  expect(match.uncoveredRequirementIds).toEqual([]);
  const top = match.proposals[0];
  const ours = new Set(people.map((p) => p.participantId));
  const foreign = top.members.filter((m) => !ours.has(m.participantId));
  expect(
    foreign,
    "proposal used participants from outside this run; use an isolated database",
  ).toEqual([]);
  expect(top.members.map((m) => m.participantId).sort()).toEqual(
    [...ours].sort(),
  );

  const events = await creator.device.ok("events", {
    params: { id: created.id },
    input: { after: 0, limit: 100, format: "json" },
  });
  expect(events.events.length).toBeGreaterThan(0);
  expect(events.events[0].type).toBe("MISSION_CREATED");
});

test("other sessions cannot read the creator's mission theater", async () => {
  test.skip(people.length < 3, "depends on the first journey");
  const [creator, designer] = people;
  const mission = await creator.device.ok("createMission", {
    input: missionInput([humanRequirement("design", "product", 2)]),
  });
  const denied = await designer.device.call("snapshot", {
    params: { id: mission.id },
  });
  expect(denied.ok).toBe(false);
  if (!denied.ok)
    expect(["FORBIDDEN", "NOT_FOUND"]).toContain(denied.error.code);
});

test("an unmatchable requirement reports exhausted no-solution, never a fabricated team", async () => {
  test.skip(people.length < 3, "depends on the first journey");
  const [creator] = people;
  const mission = await creator.device.ok("createMission", {
    input: missionInput([humanRequirement("research", "research", 5)]),
  });
  await creator.device.ok("startMission", {
    params: { id: mission.id },
    input: { expectedVersion: mission.version },
  });
  await waitForState(creator, mission.id, [
    "FAILED",
    "PAUSED_FOR_HUMAN",
    "PROPOSED",
  ]);
  const match = await creator.device.ok("proposals", {
    params: { id: mission.id },
  });
  expect(match.feasibility).toBe("NO_SOLUTION");
  expect(match.proposals).toEqual([]);
  expect(match.search.complete).toBe(true);
});
