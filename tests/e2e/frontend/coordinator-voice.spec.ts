import { test, expect } from "@playwright/test";
import { apiContracts } from "@/contracts";
import { MockBackend } from "./support/mock-backend";
import { fixtureId } from "./support/mock-data";

const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";
test.use({ launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] } });

test("Coordinator waveform measures actual playing audio and stops with its control", async ({ page }) => {
  const mock = new MockBackend(); await mock.install(page);
  await page.addInitScript(() => localStorage.setItem("cohue.coordinator.speak", "1"));
  // An authored PCM tone, not a provider fixture pretending to be a successful real provider call.
  const rate = 44100, samples = rate * 4;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 2067 / rate) * 16000), 44 + i * 2);
  await page.route("**/api/missions/coordinate", route => route.fulfill({ json: apiContracts.coordinateMission.response.parse({
    data: { reply: "Let’s refine your idea.", questions: ["What should the group make?"],
      draft: { objective: "A repair café", expectedOutput: null, requirements: [], constraintsDraft: {}, unknowns: [], requiresConfirmation: true },
      drafter: "META", strategist: null, speech: { text: "Let’s refine your idea.", signature: "a".repeat(43) } }, correlationId: fixtureId(900),
  }) }));
  await page.route("**/api/missions/coordinate/speech", route => route.fulfill({ json: apiContracts.speakCoordinator.response.parse({
    data: { mimeType: "audio/mpeg", base64: wav.toString("base64") }, correlationId: fixtureId(900),
  }) }));
  await page.goto(`${base}/missions/new`);
  await mock.organize(page);
  await page.getByLabel("Describe the mission").fill("Make a repair café.");
  await page.getByRole("button", { name: "Talk to the Coordinator" }).click();
  const bars = page.locator(".coordinator-speaking .voice-intensity > span");
  await expect(bars).toHaveCount(7);
  await expect.poll(async () => bars.evaluateAll(elements => elements.some(element => Number((element as HTMLElement).style.transform.match(/scaleY\(([^)]+)\)/)?.[1] ?? 0) > .2))).toBe(true);
  await page.getByRole("button", { name: "Stop voice" }).click();
  await expect(bars).toHaveCount(0);
});

test("turning voice off fences a delayed voice response", async ({ page }) => {
  const mock = new MockBackend();
  await mock.install(page);
  await page.addInitScript(() => {
    localStorage.setItem("cohue.coordinator.speak", "1");
    Object.defineProperty(window, "Audio", { value: class { constructor() { throw new Error("Late voice must not play"); } } });
  });
  await page.route("**/api/missions/coordinate", route => route.fulfill({ json: apiContracts.coordinateMission.response.parse({
    data: { reply: "Who would you like to bring together?", questions: ["Which skills do you need?"],
      draft: { objective: "A repair café", expectedOutput: null, requirements: [], constraintsDraft: {}, unknowns: [], requiresConfirmation: true },
      drafter: "GEMINI", strategist: { model: "fixture", note: "Keep the first group small." },
      speech: { text: "Who would you like to bring together?", signature: "a".repeat(43) } }, correlationId: fixtureId(900),
  }) }));
  let finishVoice: (() => void) | undefined;
  await page.route("**/api/missions/coordinate/speech", async route => {
    await new Promise<void>(resolve => { finishVoice = resolve; });
    await route.fulfill({ json: apiContracts.speakCoordinator.response.parse({ data: { mimeType: "audio/mpeg", base64: "" }, correlationId: fixtureId(900) }) });
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/missions/new`);
  await mock.organize(page);
  await page.getByLabel("Describe the mission").fill("Let us start a repair café.");
  await page.getByRole("button", { name: "Talk to the Coordinator" }).click();
  await expect(page.getByText("Preparing the Coordinator’s voice…")).toBeVisible();
  await expect(page.getByText("Coordinator · Gemini", { exact: true })).toBeVisible();
  await expect(page.getByText("Keep the first group small.")).toBeVisible();
  await page.getByRole("checkbox", { name: "Speak replies aloud" }).uncheck();
  expect(finishVoice).toBeDefined();
  finishVoice!();
  await expect(page.getByText("Preparing the Coordinator’s voice…")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop voice" })).toHaveCount(0);
  expect(errors).toEqual([]);
});
