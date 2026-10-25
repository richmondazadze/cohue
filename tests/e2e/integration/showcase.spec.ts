import { test, expect } from "@playwright/test";
import { Device } from "./support/device";
import { backendStatus, baseURL, humanRequirement, requireBackend, waitForState } from "./support/journey";

// Requires `npm run seed:showcase` on the target database. The synthetic scope runs the real engine.
const SHOWCASE = "00000000-0000-4000-8000-000000000384";
test.describe.configure({ mode: "serial", timeout: 120_000 });

let unavailable: string | null = null;
test.beforeAll(async () => {
  unavailable = await backendStatus();
  if (unavailable && requireBackend) throw new Error(unavailable);
});
test.beforeEach(() => test.skip(unavailable !== null, unavailable ?? ""));

test("showcase operator runs the real matcher on synthetic profiles, isolated from LIVE", async () => {
  const operator = await Device.open("operator", baseURL);
  const session = await operator.ok("createSession", { input: { executionMode: "SHOWCASE", showcaseId: SHOWCASE } });
  expect(session.kind).toBe("SHOWCASE_OPERATOR");
  const stranger = await Device.open("stranger", baseURL);
  await stranger.fails("createSession", "SCOPE_MISMATCH", {
    input: { executionMode: "SHOWCASE", showcaseId: "00000000-0000-4000-8000-0000000003ff" },
  });
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
  expect(mission.scope).toEqual({ executionMode: "SHOWCASE", showcaseId: SHOWCASE });
  await operator.ok("startMission", { params: { id: mission.id }, input: { expectedVersion: mission.version } });
  const snap = await waitForState({ device: operator, participantId: mission.creatorId, label: "operator" }, mission.id, ["PROPOSED", "PAUSED_FOR_HUMAN"]);
  expect(snap.mission.state).toBe("PROPOSED");
  const match = await operator.ok("proposals", { params: { id: mission.id } });
  expect(match.feasibility).toBe("FEASIBLE");
  expect(match.proposals[0].members.every((m) => m.participantId.startsWith("00000000-0000-4000-8000-"))).toBe(true);
  // LIVE network never shows synthetic showcase people.
  const live = await stranger.ok("network", { input: { limit: 100 } });
  expect(live.graph.nodes.some((n) => n.label.startsWith("Synthetic Participant"))).toBe(false);
  await operator.close();
  await stranger.close();
});
