import { test, expect } from "@playwright/test";
import { apiContracts } from "@/contracts";
import { MockBackend } from "./support/mock-backend";
import { fixtureId } from "./support/mock-data";

// UI-only (fixture backend, fake microphone): a spoken conversation runs hands-free. Stopping a recording
// transcribes and sends it, the microphone reopens for the Coordinator's question, and a complete brief fills
// the form and flows on to review. Starting discovery still needs the creator's own tap.
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] } });

test("spoken conversation fills the brief and reaches review without typing", async ({ page }) => {
  const mock = new MockBackend();
  await mock.install(page);
  const said = ["Repair café on Saturday with a designer.", "Two designers and a working evening."];
  let transcribed = 0;
  const turns: { role: string; text: string }[][] = [];
  await page.route("**/api/voice/transcribe", (route) =>
    route.fulfill({ json: apiContracts.transcribe.response.parse({
      data: { transcript: said[transcribed++] ?? "More detail.", language: "en", status: "REVIEW_REQUIRED", rawAudioDeleted: true },
      correlationId: fixtureId(900),
    }) }));
  await page.route("**/api/missions/coordinate", (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    turns.push(body.turns);
    const done = turns.length > 1;
    return route.fulfill({ json: apiContracts.coordinateMission.response.parse({
      data: {
        reply: done ? "That's everything I need." : "A repair café, lovely.",
        questions: done ? [] : ["What exists when it succeeds?"],
        draft: {
          objective: "Run a neighborhood repair café",
          expectedOutput: done ? "A working repair evening" : null,
          requirements: [{ kind: "HUMAN", normalizedSkillId: "design", category: "product", priority: "REQUIRED", minimumCoverage: done ? 2 : 1, minimumLevel: null, outcome: null }],
          constraintsDraft: done ? { minGroupSize: 2, maxGroupSize: 3, minOverlapMinutes: 120 } : {},
          unknowns: [], requiresConfirmation: true,
        },
        drafter: "GEMINI", strategist: null, speech: { text: "x", signature: "a".repeat(43) },
      },
      correlationId: fixtureId(900),
    }) });
  });

  await page.goto(`${base}/missions/new`);
  await mock.organize(page);
  await page.getByRole("button", { name: /Describe it by voice/ }).click();
  await expect(page.getByText("● Recording")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Stop" }).click();
  // No Send tap: the transcript goes straight to the Coordinator.
  await expect(page.getByText("What exists when it succeeds?")).toBeVisible();
  expect(turns[0].at(-1)).toMatchObject({ role: "CREATOR", text: said[0] });
  await expect(page.getByLabel("Filled in the brief").first()).toContainText("Objective");
  await page.screenshot({ path: test.info().outputPath("handsfree-turn1.png") });
  // The microphone reopens for the answer.
  await expect(page.getByText("● Recording")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText("Taking you to review")).toBeVisible();
  await expect(page.getByLabel("Expected output")).toHaveValue("A working repair evening");
  await expect(page.getByRole("heading", { name: "Review before discovery" })).toBeVisible({ timeout: 6000 });
  // Consent stays with the creator.
  await expect(page.getByRole("button", { name: "Start discovery" })).toBeVisible();
  expect(mock.commands.some((c) => c.op === "createMission")).toBe(false);
});

test("composer stays locked until a username and avatar are saved", async ({ page }) => {
  const mock = new MockBackend();
  await mock.install(page);
  await page.goto(`${base}/missions/new`);
  await expect(page.locator(".composer-lockable")).toHaveAttribute("inert", "");
  await page.screenshot({ path: test.info().outputPath("locked.png") });
  await mock.organize(page);
  await expect(page.locator(".composer-lockable")).not.toHaveAttribute("inert", "");
});
