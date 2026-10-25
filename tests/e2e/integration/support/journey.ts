import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import type {
  ApiInput,
  Invitation,
  MissionState,
  MissionSnapshot,
} from "@/contracts";
import { Device } from "./device";
import { newIdempotencyKey } from "./contract-client";

// Shared journey steps for I2/I3. Runs against a real backend only; there is no fixture fallback.
export const baseURL =
  process.env.COHUE_INTEGRATION_BASE_URL ?? "http://127.0.0.1:3100";
export const requireBackend = process.env.COHUE_REQUIRE_INTEGRATION === "1";
export const progressTimeoutMs = Number(
  process.env.COHUE_INTEGRATION_TIMEOUT_MS ?? 90000,
);
export const runId = randomUUID().slice(0, 8);
const LIVE = { executionMode: "LIVE", showcaseId: null } as const;

// A missing route is reported as a skip with its reason unless the run demands a backend.
export async function backendStatus(): Promise<string | null> {
  const probe = await Device.open("probe", baseURL);
  try {
    const result = await probe.call("taxonomy");
    return result.ok ? null : `taxonomy returned ${result.error.code}`;
  } catch (error) {
    return `backend contract routes unavailable at ${baseURL}: ${(error as Error).message.slice(0, 160)}`;
  } finally {
    await probe.close();
  }
}

export function teamWindow() {
  const start = new Date();
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(start.getUTCHours() + 2);
  const end = new Date(start.getTime() + 2 * 3600_000);
  const iso = (d: Date) => d.toISOString().replace(".000Z", "Z");
  return { start: iso(start), end: iso(end), timezone: "America/Chicago" };
}

export type Person = { device: Device; participantId: string; label: string };

export async function join(
  label: string,
  skill: string,
  level: number,
  language = "en",
): Promise<Person> {
  const device = await Device.open(label, baseURL);
  await device.ok("createSession", { input: LIVE });
  const taxonomy = await device.ok("taxonomy");
  const entry = taxonomy.skills.find((s) => s.id === skill);
  if (!entry) throw new Error(`taxonomy lacks ${skill}`);
  const participant = await device.ok("createParticipant", {
    input: {
      displayName: `[integration ${runId}] ${label}`,
      language,
      needs: [],
      interests: ["accessibility"],
      availability: [teamWindow()],
      capabilities: [
        {
          normalizedSkillId: skill,
          category: entry.category,
          level,
          evidence: null,
          confirmedByUser: true,
          normalizationVersion: "taxonomy-1",
        },
      ],
      visibility: { publicGraph: false, discoverable: true },
      participationOptIn: true,
    },
  });
  expect(participant.scope).toEqual(LIVE);
  return { device, participantId: participant.id, label };
}

export const missionInput = (
  requirements: ApiInput<"createMission">["requirements"],
): ApiInput<"createMission"> => ({
  objective: `[integration ${runId}] Build an accessible hardware prototype`,
  expectedOutput: "An agreed prototype plan and assigned first tasks",
  language: "en",
  constraints: {
    minGroupSize: 3,
    maxGroupSize: 3,
    minOverlapMinutes: 60,
    window: teamWindow(),
    creatorParticipates: true,
    preferences: ["accessibility"],
  },
  requirements,
});

export const humanRequirement = (
  skill: string,
  category: string,
  level: number,
) =>
  ({
    kind: "HUMAN",
    normalizedSkillId: skill,
    category,
    priority: "REQUIRED",
    minimumCoverage: 1,
    minimumLevel: level,
    outcome: null,
  }) as const;

// Polls the creator snapshot; events are committed truth, so the test never assumes timer-driven progress.
export async function waitForState(
  creator: Person,
  missionId: string,
  states: MissionState[],
): Promise<MissionSnapshot> {
  let last: MissionSnapshot | undefined;
  await expect
    .poll(
      async () => {
        last = await creator.device.ok("snapshot", {
          params: { id: missionId },
        });
        return states.includes(last.mission.state)
          ? last.mission.state
          : `waiting:${last.mission.state}`;
      },
      { timeout: progressTimeoutMs, intervals: [500, 1000, 2000] },
    )
    .toMatch(new RegExp(`^(${states.join("|")})$`));
  return last as MissionSnapshot;
}

export async function pendingInvitation(
  person: Person,
  missionId: string,
  minRevision = 1,
): Promise<Invitation> {
  let found: Invitation | undefined;
  await expect
    .poll(
      async () => {
        const inbox = await person.device.ok("inbox", {
          params: { id: person.participantId },
          input: { limit: 100 },
        });
        found = inbox.invitations.find(
          (i) =>
            i.missionId === missionId &&
            i.status === "PENDING" &&
            i.proposalRevision >= minRevision,
        );
        return Boolean(found);
      },
      { timeout: progressTimeoutMs, intervals: [500, 1000, 2000] },
    )
    .toBe(true);
  return found as Invitation;
}

// Owner fetches the share link, then a fresh device (the "phone that scanned the QR") redeems it.
export async function openOnSecondDevice(
  person: Person,
  invitation: Invitation,
) {
  const link = await person.device.ok("issueInvitationLink", {
    params: { id: invitation.id },
    input: { rotate: false },
  });
  expect(link.invitationId).toBe(invitation.id);
  const phone = await Device.open(`${person.label}-phone`, baseURL);
  const preview = await phone.ok("previewInvitation", {
    params: { token: link.token },
  });
  expect(preview.invitationId).toBe(invitation.id);
  expect(preview.available).toBe(true);
  // Preview is non-consuming: a second GET still reports the same invitation.
  expect(
    (await phone.ok("previewInvitation", { params: { token: link.token } }))
      .available,
  ).toBe(true);
  const redeemed = await phone.ok("redeemInvitation", {
    params: { token: link.token },
  });
  expect(redeemed.session.kind).toBe("INVITATION");
  expect(redeemed.session.invitationId).toBe(invitation.id);
  const detail = await phone.ok("getInvitation", {
    params: { id: invitation.id },
  });
  expect(detail.invitation.termsHash).toBe(invitation.termsHash);
  return { phone, invitation: detail.invitation };
}

// Soft-delete this run's profiles so later runs on the same database never match them.
export async function retire(people: Person[]): Promise<void> {
  for (const person of people) {
    const current = await person.device
      .call("getParticipant", { params: { id: person.participantId } })
      .catch(() => null);
    if (current?.ok)
      await person.device
        .call("deleteParticipant", {
          params: { id: person.participantId },
          input: { expectedVersion: current.data.profileVersion },
          idempotencyKey: newIdempotencyKey(),
        })
        .catch(() => undefined);
  }
}
