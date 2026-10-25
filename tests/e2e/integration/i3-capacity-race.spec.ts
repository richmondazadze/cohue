import { test, expect } from "@playwright/test";
import { newIdempotencyKey } from "./support/contract-client";
import type { Device } from "./support/device";
import {
  backendStatus,
  humanRequirement,
  join,
  missionInput,
  openOnSecondDevice,
  pendingInvitation,
  requireBackend,
  retire,
  waitForState,
  type Person,
} from "./support/journey";

// PostgreSQL concurrency through the real API: one person, two overlapping missions, simultaneous accepts.
test.describe.configure({ mode: "serial", timeout: 300_000 });

let unavailable: string | null = null;
const devices: Device[] = [];
const people: Person[] = [];
test.beforeAll(async () => {
  unavailable = await backendStatus();
  if (unavailable && requireBackend) throw new Error(unavailable);
});
test.beforeEach(() => test.skip(unavailable !== null, unavailable ?? ""));
test.afterAll(async () => {
  await retire(people);
  for (const device of devices) await device.close();
});

async function missionFor(creator: Person) {
  const input = missionInput([humanRequirement("hardware", "engineering", 2)]);
  input.constraints.minGroupSize = 2;
  input.constraints.maxGroupSize = 2;
  const startKey = newIdempotencyKey();
  const mission = await creator.device.ok("createMission", { input });
  // Concurrent first use of one key yields one execution and identical results.
  const [a, b] = await Promise.all(
    [0, 1].map(() =>
      creator.device.ok("startMission", {
        params: { id: mission.id },
        input: { expectedVersion: mission.version },
        idempotencyKey: startKey,
      }),
    ),
  );
  expect(a).toEqual(b);
  const snap = await waitForState(creator, mission.id, ["PROPOSED"]);
  const top = snap.proposals[0];
  await creator.device.ok("selectProposal", {
    params: { id: mission.id, proposalId: top.id },
    input: { expectedVersion: snap.mission.version, proposalRevision: top.revision },
  });
  return mission.id;
}

test("simultaneous accepts of overlapping missions cannot overbook one person", async () => {
  const creatorA = await join("race-creator-a", "coordination", 3);
  const creatorB = await join("race-creator-b", "coordination", 3);
  const builder = await join("race-builder", "hardware", 4);
  people.push(creatorA, creatorB, builder);
  devices.push(creatorA.device, creatorB.device, builder.device);
  const missionA = await missionFor(creatorA);
  const missionB = await missionFor(creatorB);
  const inviteA = await pendingInvitation(builder, missionA);
  const inviteB = await pendingInvitation(builder, missionB);
  const phoneA = await openOnSecondDevice(builder, inviteA);
  const phoneB = await openOnSecondDevice(builder, inviteB);
  devices.push(phoneA.phone, phoneB.phone);
  const results = await Promise.all(
    [phoneA, phoneB].map(({ phone, invitation }) =>
      phone.call("respondInvitation", {
        params: { id: invitation.id },
        input: { action: "ACCEPT", termsHash: invitation.termsHash, responseVersion: invitation.responseVersion },
        idempotencyKey: newIdempotencyKey(),
      }),
    ),
  );
  const ok = results.filter((r) => r.ok);
  const conflicts = results.filter((r) => !r.ok && r.error.code === "CAPACITY_CONFLICT");
  expect(ok).toHaveLength(1);
  expect(conflicts).toHaveLength(1);
});
