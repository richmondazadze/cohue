import { test, expect } from "@playwright/test";
import type { GroupProposal, MissionSnapshot } from "@/contracts";
import { newIdempotencyKey } from "./support/contract-client";
import type { Device } from "./support/device";
import {
  backendStatus,
  humanRequirement,
  join,
  missionInput,
  openOnSecondDevice,
  pendingInvitation,
  progressTimeoutMs,
  requireBackend,
  retire,
  waitForState,
  type Person,
} from "./support/journey";

// I3: second-device consent, decline -> genuine repair -> reconsent -> transactional activation -> room/task.
test.describe.configure({ mode: "serial", timeout: 600_000 });

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

test("decline triggers repair, changed group needs reconsent, activation opens the room", async () => {
  const creator = await join("creator", "coordination", 3);
  const designer = await join("designer", "design", 3, "es");
  const builderA = await join("builder-a", "hardware", 4, "fr");
  const builderB = await join("builder-b", "hardware", 3, "en");
  people.push(creator, designer, builderA, builderB);
  devices.push(...people.map((p) => p.device));
  const byId = new Map(people.map((p) => [p.participantId, p]));

  const created = await creator.device.ok("createMission", {
    input: missionInput([
      humanRequirement("design", "product", 2),
      humanRequirement("hardware", "engineering", 2),
    ]),
  });
  await creator.device.ok("startMission", {
    params: { id: created.id },
    input: { expectedVersion: created.version },
  });
  let snapshot = await waitForState(creator, created.id, ["PROPOSED"]);
  const match = await creator.device.ok("proposals", {
    params: { id: created.id },
  });
  expect(match.feasibility).toBe("FEASIBLE");
  const first = match.proposals[0];
  for (const m of first.members)
    expect(
      byId.has(m.participantId),
      "foreign participant; use an isolated database",
    ).toBe(true);

  const selected = await creator.device.ok("selectProposal", {
    params: { id: created.id, proposalId: first.id },
    input: {
      expectedVersion: snapshot.mission.version,
      proposalRevision: first.revision,
    },
  });
  expect(selected.mission.state).toBe("AWAITING_APPROVAL");
  // Selecting is the creator's own explicit approval of the creator's terms; other members start PENDING.
  const creatorInvite = selected.invitations.find((i) => i.participantId === creator.participantId);
  expect(creatorInvite?.status).toBe("ACCEPTED");
  const invitedIds = selected.invitations
    .filter((i) => i.status === "PENDING")
    .map((i) => i.participantId);
  expect(new Set(invitedIds).size).toBe(invitedIds.length);

  const builder = first.members.find(
    (m) => m.participantId === builderA.participantId,
  )
    ? builderA
    : builderB;
  const replacement = builder === builderA ? builderB : builderA;

  // Designer accepts on a second device; exact replay is stable and a changed payload conflicts.
  const designerInvite = await pendingInvitation(
    designer,
    created.id,
    first.revision,
  );
  const designerPhone = await openOnSecondDevice(designer, designerInvite);
  devices.push(designerPhone.phone);
  const acceptKey = newIdempotencyKey();
  const accept = {
    action: "ACCEPT",
    termsHash: designerPhone.invitation.termsHash,
    responseVersion: designerPhone.invitation.responseVersion,
  } as const;
  const accepted = await designerPhone.phone.ok("respondInvitation", {
    params: { id: designerInvite.id },
    input: accept,
    idempotencyKey: acceptKey,
  });
  expect(accepted.response.action).toBe("ACCEPT");
  expect(
    await designerPhone.phone.ok("respondInvitation", {
      params: { id: designerInvite.id },
      input: accept,
      idempotencyKey: acceptKey,
    }),
  ).toEqual(accepted);
  await designerPhone.phone.fails("respondInvitation", "IDEMPOTENCY_CONFLICT", {
    params: { id: designerInvite.id },
    input: { ...accept, action: "DECLINE", reason: "changed my mind" },
    idempotencyKey: acceptKey,
  });

  // The invitation session is narrow: no creator theater access.
  const theater = await designerPhone.phone.call("snapshot", {
    params: { id: created.id },
  });
  expect(theater.ok).toBe(false);

  // Activation before every required member approves must not succeed.
  snapshot = await creator.device.ok("snapshot", {
    params: { id: created.id },
  });
  const early = await creator.device.call("activateMission", {
    params: { id: created.id },
    input: {
      expectedVersion: snapshot.mission.version,
      proposalRevision: first.revision,
    },
    idempotencyKey: newIdempotencyKey(),
  });
  expect(early.ok).toBe(false);

  // Remaining first-round invitees other than the builder accept; the builder declines.
  for (const id of invitedIds) {
    const person = byId.get(id);
    if (!person || person === designer || person === builder) continue;
    const invite = await pendingInvitation(person, created.id, first.revision);
    const { phone, invitation } = await openOnSecondDevice(person, invite);
    devices.push(phone);
    await phone.ok("respondInvitation", {
      params: { id: invite.id },
      input: {
        action: "ACCEPT",
        termsHash: invitation.termsHash,
        responseVersion: invitation.responseVersion,
      },
    });
  }
  const builderInvite = await pendingInvitation(
    builder,
    created.id,
    first.revision,
  );
  const builderPhone = await openOnSecondDevice(builder, builderInvite);
  devices.push(builderPhone.phone);
  const declined = await builderPhone.phone.ok("respondInvitation", {
    params: { id: builderInvite.id },
    input: {
      action: "DECLINE",
      termsHash: builderPhone.invitation.termsHash,
      responseVersion: builderPhone.invitation.responseVersion,
      reason: "No longer available",
    },
  });
  expect(declined.invitation.status).toBe("DECLINED");
  expect(declined.missionState).not.toBe("ACTIVATED");

  // Genuine replan: a newer proposal revision without the decliner.
  let repaired: GroupProposal | undefined;
  await expect
    .poll(
      async () => {
        snapshot = await creator.device.ok("snapshot", {
          params: { id: created.id },
        });
        repaired = snapshot.proposals.find((p) => p.revision > first.revision);
        return repaired &&
          ["REPROPOSED", "AWAITING_APPROVAL"].includes(snapshot.mission.state)
          ? "repaired"
          : `waiting:${snapshot.mission.state}`;
      },
      { timeout: progressTimeoutMs, intervals: [500, 1000, 2000] },
    )
    .toBe("repaired");
  const second = repaired as GroupProposal;
  const memberIds = second.members.map((m) => m.participantId);
  expect(memberIds).not.toContain(builder.participantId);
  expect(memberIds).toContain(replacement.participantId);
  if (snapshot.mission.state === "REPROPOSED")
    await creator.device.ok("selectProposal", {
      params: { id: created.id, proposalId: second.id },
      input: {
        expectedVersion: snapshot.mission.version,
        proposalRevision: second.revision,
      },
    });

  // The disclosed group changed, so the designer's earlier consent cannot carry: a new invitation needs a fresh answer.
  const reconsent = await pendingInvitation(
    designer,
    created.id,
    second.revision,
  );
  expect(reconsent.termsHash).not.toBe(designerInvite.termsHash);
  expect(reconsent.lineage).toBeNull();

  for (const person of people) {
    if (person === builder || person === creator) continue;
    const invite = await pendingInvitation(person, created.id, second.revision);
    const { phone, invitation } = await openOnSecondDevice(person, invite);
    devices.push(phone);
    await phone.ok("respondInvitation", {
      params: { id: invite.id },
      input: {
        action: "ACCEPT",
        termsHash: invitation.termsHash,
        responseVersion: invitation.responseVersion,
      },
    });
  }

  snapshot = await creator.device.ok("snapshot", {
    params: { id: created.id },
  });
  expect(snapshot.approvals.accepted).toBe(snapshot.approvals.required);
  const activateKey = newIdempotencyKey();
  const activate = {
    params: { id: created.id },
    input: {
      expectedVersion: snapshot.mission.version,
      proposalRevision: second.revision,
    },
    idempotencyKey: activateKey,
  };
  const room = await creator.device.ok("activateMission", activate);
  expect(await creator.device.ok("activateMission", activate)).toEqual(room);
  expect(room.mission.state).toBe("ACTIVATED");
  expect(room.memberships.map((m) => m.participantId).sort()).toEqual(
    [...memberIds].sort(),
  );

  const current = await creator.device.ok("room", {
    params: { id: created.id },
  });
  // Shared team brief: the canonical original, in the mission language, bound to this mission.
  const [canonicalBrief] = current.briefs;
  expect(canonicalBrief).toMatchObject({
    sourceId: created.id,
    status: "APPROVED",
    language: created.language,
  });
  expect(canonicalBrief.text).toContain(created.objective);
  const creatorMembership = current.memberships.find(
    (m) => m.participantId === creator.participantId,
  );
  const task =
    current.tasks.find((t) => t.ownerMembershipId === creatorMembership?.id) ??
    current.tasks[0];
  expect(task, "activation must create at least one task").toBeDefined();
  const moved = await creator.device.ok("updateTask", {
    params: { id: created.id, taskId: task.id },
    input: { expectedVersion: task.version, status: "IN_PROGRESS" },
  });
  expect(moved.status).toBe("IN_PROGRESS");
  await creator.device.fails("updateTask", "STALE_VERSION", {
    params: { id: created.id, taskId: task.id },
    input: { expectedVersion: task.version, status: "DONE" },
  });

  const final: MissionSnapshot = await waitForState(creator, created.id, [
    "ACTIVATED",
  ]);
  const events = await creator.device.ok("events", {
    params: { id: created.id },
    input: { after: 0, limit: 100, format: "json" },
  });
  const types = events.events.map((e) => e.type);
  for (const type of [
    "INVITATION_DECLINED",
    "REPLAN_STARTED",
    "INVITATION_REVOKED",
    "MISSION_ACTIVATED",
  ])
    expect(types).toContain(type);
  expect(types.filter((t) => t === "MISSION_ACTIVATED")).toHaveLength(1);
  expect(final.snapshotSequence).toBeGreaterThanOrEqual(events.nextSequence);

  // Read-only replay just before activation shows the historical state, not the current one.
  const activatedAt = events.events.find((e) => e.type === "MISSION_ACTIVATED")!.sequence;
  const before = await creator.device.ok("replay", { params: { id: created.id }, input: { atSequence: activatedAt - 1 } });
  expect(before.mission.state).toBe("AWAITING_APPROVAL");
  expect(before.snapshotSequence).toBe(activatedAt - 1);
  const after = await creator.device.ok("replay", { params: { id: created.id }, input: { atSequence: activatedAt } });
  expect(after.mission.state).toBe("ACTIVATED");
});
