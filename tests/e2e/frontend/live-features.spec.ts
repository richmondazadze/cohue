import { test, expect, type Page } from "@playwright/test";

// Real UI on the real API (no mocks): SSE live updates, replay/impact, showcase scope, voice and text fallbacks.
// Run against a dev/staging server: COHUE_FRONTEND_BASE_URL=http://localhost:3300 (skips when unset).
const base = process.env.COHUE_FRONTEND_BASE_URL;
const shots = process.env.COHUE_FRONTEND_SHOTS;
const shot = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
};
test.describe.configure({ mode: "serial", timeout: 120_000 });
test.use({
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  permissions: ["microphone"],
  timezoneId: "America/Chicago",
});
test.beforeEach(() => test.skip(!base, "COHUE_FRONTEND_BASE_URL not set"));

const LIVE = { executionMode: "LIVE", showcaseId: null };
const tomorrow = () => {
  const s = new Date(Date.now() + 26 * 3600_000);
  s.setUTCMinutes(0, 0, 0);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  return { start: iso(s), end: iso(new Date(s.getTime() + 4 * 3600_000)), timezone: "America/Chicago" };
};

async function draftMission(page: Page) {
  const headers = (k: string) => ({ "idempotency-key": `ui-test-${k}-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await page.request.post(`${base}/api/sessions`, { data: LIVE, headers: headers("s") });
  // A creator profile is required; this one is not discoverable, so it never enters anyone's matching.
  const me = await page.request.post(`${base}/api/participants`, {
    headers: headers("p"),
    data: {
      displayName: "[frontend live test] creator",
      language: "en",
      needs: [],
      interests: [],
      availability: [tomorrow()],
      capabilities: [],
      visibility: { publicGraph: false, discoverable: false },
      participationOptIn: false,
    },
  });
  expect(me.status()).toBe(201);
  const res = await page.request.post(`${base}/api/missions`, {
    headers: headers("m"),
    data: {
      objective: "[frontend live test] Repair café pilot",
      expectedOutput: "A first repair evening plan",
      language: "en",
      constraints: { minGroupSize: 1, maxGroupSize: 2, minOverlapMinutes: 60, window: tomorrow(), creatorParticipates: false, preferences: [] },
      requirements: [
        { kind: "HUMAN", normalizedSkillId: "design", category: "product", priority: "REQUIRED", minimumCoverage: 1, minimumLevel: null, outcome: null },
      ],
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).data.id as string;
}

test("theater receives committed events over SSE and replay is read-only", async ({ page }) => {
  const id = await draftMission(page);
  await page.goto(`${base}/missions/${id}`);
  await expect(page.getByText(/Live · Verified/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Start discovery" }).click();
  // Any committed outcome is acceptable; the UI must move only on server events.
  await expect(
    page.getByRole("heading", { name: /Review proposed groups/ }).or(page.getByText(/No group can meet|Search stopped at its limit/)),
  ).toBeVisible({ timeout: 60_000 });
  const activityTab = page.getByRole("tab", { name: "Activity" });
  if (await activityTab.isVisible()) await activityTab.click();
  await expect(page.getByText("Mission brief saved as a draft").first()).toBeVisible();
  await shot(page, "live-theater-1280");

  await page.goto(`${base}/missions/${id}/replay`);
  await expect(page.getByText("Replay · read-only.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Impact", exact: true })).toBeVisible();
  const scrubber = page.getByLabel(/^Event \d+ of \d+$/);
  await scrubber.focus();
  await page.keyboard.press("Home");
  await expect(page.getByText(/Historical state at event #1\b/)).toBeVisible();
  await shot(page, "live-replay-1280");
  await expect(page.getByRole("button", { name: /Start discovery|Select this group|Activate/ })).toHaveCount(0);
});

test("text extraction and voice transcription fail honestly and keep typed text", async ({ page }) => {
  await page.goto(`${base}/missions/new`);
  const intention = page.getByLabel("Describe the mission in your own words");
  await intention.fill("Let's run a repair café next Saturday with a designer and a hardware tinkerer.");
  await page.getByRole("button", { name: "Draft structured brief" }).click();
  await expect(
    page.getByText(/Draft filled in below|Could not draft from text/).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(intention).toHaveValue(/repair café/);

  await page.getByRole("button", { name: /Describe it by voice/ }).click();
  await expect(page.getByText("● Recording")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Transcribe to text" }).click();
  await expect(
    page.getByText(/Transcript added as an editable draft|Transcription unavailable/).first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(intention).toHaveValue(/repair café/);
  await shot(page, "live-composer-voice-1280");
});

test("showcase mode is opt-in and visibly marked on every page", async ({ page }) => {
  await page.goto(`${base}/`);
  await page.getByRole("button", { name: /Explore the synthetic showcase/ }).click();
  await expect(page).toHaveURL(/\/missions\/new$/);
  await expect(page.getByText("Showcase · synthetic")).toBeVisible();
  await expect(page.getByText(/Synthetic showcase\./).first()).toBeVisible();
  await shot(page, "showcase-composer-1280");
  await page.goto(`${base}/join`);
  await expect(page.getByText("Showcase · synthetic")).toBeVisible();
  await page.getByRole("button", { name: "Return to live mode" }).click();
  await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Showcase · synthetic")).toHaveCount(0);
});
