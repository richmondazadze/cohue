import { test, expect } from "@playwright/test";
import { AgentEventSchema, type MissionState } from "@/contracts";
import { MockBackend } from "./support/mock-backend";
import { fixtureId, fixtureTime, scope } from "./support/mock-data";

const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";
const states: [MissionState, string][] = [
  ["DRAFT", "Ready when you are"], ["PLANNING", "Working on your mission"],
  ["DISCOVERING", "Working on your mission"], ["PROPOSED", "Review proposed groups"],
  ["AWAITING_APPROVAL", "Invitations"], ["REPLANNING", "Looking for a valid repair"],
  ["REPROPOSED", "Review the repaired proposal"], ["PAUSED_FOR_HUMAN", "More information is needed"],
  ["FAILED", "A step failed"], ["ACTIVATED", "Open Mission Room"], ["CANCELLED", "Cancelled"], ["EXPIRED", "Expired"],
];
for (const width of [390, 1440]) {
  test.describe(`redesign state surfaces at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const [state, copy] of states) test(state, async ({ page }) => {
      const mock = new MockBackend();
      mock.mission = { ...mock.mission, state };
      if (state === "PAUSED_FOR_HUMAN") mock.events = [AgentEventSchema.parse({
        schemaVersion: 1, id: fixtureId(5001), missionId: mock.mission.id, scope, runId: null,
        agent: null, sequence: 1, missionVersion: 1, proposalRevision: null,
        correlationId: fixtureId(800), causationId: null, occurredAt: fixtureTime,
        status: "SUCCEEDED", durationMs: null, type: "PAUSED_FOR_HUMAN",
        payload: { reason: "MISSING_INPUT", checkpoint: fixtureId(701) },
      })];
      await mock.install(page);
      await page.goto(`${base}/missions/${mock.mission.id}`);
      await expect(page.getByText(copy, { exact: false }).first()).toBeVisible();
      if (state === "PAUSED_FOR_HUMAN") await expect(page.getByRole("button", { name: "Resume from checkpoint" })).toBeVisible();
      if (state === "FAILED") await expect(page.getByText(/Retry from a server checkpoint is not available/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (process.env.COHUE_FRONTEND_SHOTS && ["PROPOSED", "PAUSED_FOR_HUMAN"].includes(state)) {
        await page.screenshot({ path: `${process.env.COHUE_FRONTEND_SHOTS}/theater-${state.toLowerCase()}-${width}.png`, fullPage: true });
      }
    });
  });
}
