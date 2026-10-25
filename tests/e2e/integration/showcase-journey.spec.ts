import { test, expect } from "@playwright/test";
import { Device } from "./support/device";
import { backendStatus, baseURL, humanRequirement, openOnSecondDevice, requireBackend, waitForState } from "./support/journey";

// Full journey in the installed synthetic SHOWCASE scope (labeled operator decisions, real engine).
// Requires `npm run seed:showcase` (or an equivalent re-anchor) so availability overlaps tomorrow.
// COHUE_EXPECT_PROVIDERS=1 additionally requires real member-language brief drafts.
const SHOWCASE = "00000000-0000-4000-8000-000000000384";
test.describe.configure({ mode: "serial", timeout: 240_000 });

let unavailable: string | null = null;
test.beforeAll(async () => {
  unavailable = await backendStatus();
  if (unavailable && requireBackend) throw new Error(unavailable);
});
test.beforeEach(() => test.skip(unavailable !== null, unavailable ?? ""));

test("showcase operator forms, activates and briefs a multilingual synthetic team", async () => {
  const operator = await Device.open("operator", baseURL);
  await operator.ok("createSession", { input: { executionMode: "SHOWCASE", showcaseId: SHOWCASE } });
  const chicago = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const start = Date.parse(`${chicago}T14:00:00Z`) + 86_400_000;
  const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  const mission = await operator.ok("createMission", {
    input: {
      objective: "Synthetic showcase: build an accessible hardware prototype",
      expectedOutput: "An agreed prototype plan and first tasks",
      language: "en",
      constraints: {
        minGroupSize: 3,
        maxGroupSize: 3,
        minOverlapMinutes: 60,
        window: { start: iso(start), end: iso(start + 12 * 3600_000), timezone: "America/Chicago" },
        creatorParticipates: true,
        preferences: ["accessibility"],
      },
      requirements: [humanRequirement("design", "product", 2), humanRequirement("hardware", "engineering", 2)],
    },
  });
  const phones: Device[] = [];
  try {
    await operator.ok("startMission", { params: { id: mission.id }, input: { expectedVersion: mission.version } });
    const snap = await waitForState({ device: operator, participantId: mission.creatorId, label: "operator" }, mission.id, ["PROPOSED", "PAUSED_FOR_HUMAN"]);
    expect(snap.mission.state).toBe("PROPOSED");
    const top = snap.proposals[0];
    const selected = await operator.ok("selectProposal", {
      params: { id: mission.id, proposalId: top.id },
      input: { expectedVersion: snap.mission.version, proposalRevision: top.revision },
    });
    for (const invite of selected.invitations.filter((i) => i.status === "PENDING")) {
      // Labeled operator decision for a synthetic profile, through the same redemption/response commands.
      const opened = await openOnSecondDevice({ device: operator, participantId: invite.participantId, label: "synthetic" }, invite);
      phones.push(opened.phone);
      await opened.phone.ok("respondInvitation", {
        params: { id: invite.id },
        input: { action: "ACCEPT", termsHash: opened.invitation.termsHash, responseVersion: opened.invitation.responseVersion },
      });
    }
    const ready = await operator.ok("snapshot", { params: { id: mission.id } });
    expect(ready.approvals.accepted).toBe(ready.approvals.required);
    await operator.ok("activateMission", {
      params: { id: mission.id },
      input: { expectedVersion: ready.mission.version, proposalRevision: top.revision },
    });
    const room = await operator.ok("room", { params: { id: mission.id } });
    expect(room.mission.state).toBe("ACTIVATED");
    expect(room.briefs[0]).toMatchObject({ sourceId: mission.id, status: "APPROVED", language: "en" });
    const languages = room.briefs.map((b) => `${b.language}:${b.status}`);
    console.log(JSON.stringify({ missionId: mission.id, briefs: languages }));
    if (process.env.COHUE_EXPECT_PROVIDERS === "1") expect(room.briefs.length).toBeGreaterThan(1);
    if (process.env.COHUE_EXPECT_PROVIDERS === "1") {
      // The Coordinator's kickoff plan is readable by the room's audience, per role, in the requested language.
      const plan = await operator.ok("kickoffPlan", { params: { id: mission.id }, input: { language: "es" } });
      const roles = new Set(room.memberships.map((m) => m.approvedRole));
      expect(plan.language).toBe("es");
      expect(plan.steps.every((s) => roles.has(s.role))).toBe(true);
      console.log("kickoff plan", JSON.stringify(plan));
    }
  } finally {
    // Release synthetic capacity so the showcase stays usable.
    const current = await operator.call("snapshot", { params: { id: mission.id } });
    if (current.ok && !["CANCELLED", "EXPIRED"].includes(current.data.mission.state))
      await operator.call("cancelMission", {
        params: { id: mission.id },
        input: { expectedVersion: current.data.mission.version, reason: "Synthetic showcase journey complete" },
        idempotencyKey: `it-showcase-cancel-${mission.id}`,
      });
    for (const phone of phones) await phone.close();
    await operator.close();
  }
});
