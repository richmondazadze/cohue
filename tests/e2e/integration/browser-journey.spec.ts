import { test, expect, type Browser, type Page } from "@playwright/test";
import { Device } from "./support/device";
import { backendStatus, baseURL, join, requireBackend, retire, runId, type Person } from "./support/journey";

// Real UI on the real API and database: creator browser plus separate phone contexts. No mocks.
test.describe.configure({ mode: "serial", timeout: 600_000 });

let unavailable: string | null = null;
const people: Person[] = [];
test.beforeAll(async () => {
  unavailable = await backendStatus();
  if (unavailable && requireBackend) throw new Error(unavailable);
});
test.beforeEach(() => test.skip(unavailable !== null, unavailable ?? ""));
test.afterAll(async () => {
  await retire(people);
});

const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
// Broad availability so the composer's default window (tomorrow 09:00–21:00 local) overlaps everyone.
const wide = [{ start: iso(Date.now() + 3600_000), end: iso(Date.now() + 40 * 3600_000), timezone: "America/Chicago" }];

async function linkFor(page: Page, name: RegExp): Promise<string> {
  const box = page.getByRole("textbox", { name });
  // The row re-renders as committed state arrives; keep opening the matching row until its link shows.
  await expect(async () => {
    if (await box.isVisible()) return;
    const row = page.getByRole("listitem").filter({ has: page.getByText(new RegExp(name.source.replace("Invitation link for ", ""))) });
    await row.getByRole("button", { name: /Show invitation link/ }).first().click({ timeout: 2_000 });
    await expect(box).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  return box.inputValue();
}

async function respondOnPhone(browser: Browser, link: string, action: "accept" | "decline") {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "America/Chicago" });
  const p = await phone.newPage();
  await p.goto(new URL(link).pathname.replace(/^/, baseURL));
  await p.getByRole("button", { name: "Open my invitation" }).click();
  await expect(p).toHaveURL(/\/invitations\/opened\/[0-9a-f-]{36}$/);
  await expect(p.getByRole("heading", { name: "Responsibilities" })).toBeVisible();
  if (action === "accept") {
    await p.getByRole("button", { name: "Accept these terms" }).click();
    await expect(p.getByText("✓ You approved these terms")).toBeVisible({ timeout: 20_000 });
  } else {
    await p.getByRole("button", { name: "Decline", exact: true }).click();
    await p.getByRole("button", { name: "Decline invitation" }).click();
    await expect(p.getByText(/declined/i).first()).toBeVisible({ timeout: 20_000 });
  }
  await phone.close();
}

test("creator UI and phone UIs complete decline, repair, reconsent and activation", async ({ browser }) => {
  const creatorCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "America/Chicago", baseURL });
  const creator = await join("creator", "coordination", 3, "en", { device: Device.fromContext("creator", creatorCtx.request), availability: wide });
  const designer = await join("designer", "design", 3, "es", { availability: wide });
  const builderA = await join("builder-a", "hardware", 4, "fr", { availability: wide });
  const builderB = await join("builder-b", "hardware", 3, "en", { availability: wide });
  people.push(creator, designer, builderA, builderB);
  const page = await creatorCtx.newPage();

  await page.goto("/missions/new");
  await page.getByLabel("Objective").fill(`[integration ${runId}] Build an accessible hardware prototype`);
  await page.getByLabel("Expected output").fill("An agreed prototype plan and first tasks");
  await page.getByLabel("Skill").first().selectOption("design");
  await page.getByRole("button", { name: /Add (a )?requirement/i }).click();
  await page.getByLabel("Skill").nth(1).selectOption("hardware");
  await page.getByLabel("Smallest group").selectOption("3");
  await page.getByLabel("Largest group").selectOption("3");
  await page.getByRole("button", { name: "Review requirements" }).click();
  await page.getByRole("button", { name: "Start discovery" }).click();
  await expect(page).toHaveURL(/\/missions\/[0-9a-f-]{36}$/);

  await expect(page.getByRole("heading", { name: "Review proposed groups" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Select this group/ }).first().click();
  await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Activate mission" })).toBeDisabled();

  const designerLink = await linkFor(page, /Invitation link for .*designer/);
  await respondOnPhone(browser, designerLink, "accept");
  // Whichever builder the deterministic matcher chose declines on their phone.
  const builderLink = await linkFor(page, /Invitation link for .*builder-[ab]/);
  await respondOnPhone(browser, builderLink, "decline");

  await expect(page.getByRole("heading", { name: "Review the repaired proposal" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /Select this group/ }).first().click();
  await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible({ timeout: 20_000 });
  // Changed group terms: the designer must approve again, and the replacement builder for the first time.
  await respondOnPhone(browser, await linkFor(page, /Invitation link for .*designer/), "accept");
  await respondOnPhone(browser, await linkFor(page, /Invitation link for .*builder-[ab]/), "accept");

  await expect(page.getByRole("button", { name: "Activate mission" })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("button", { name: "Activate mission" }).click();
  await page.getByRole("link", { name: "Open Mission Room" }).click({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/room$/);
  const status = page.getByLabel(/^Status for/).first();
  await status.selectOption("IN_PROGRESS");
  await expect(page.getByText("✓ Saved").first()).toBeVisible({ timeout: 20_000 });
  await creatorCtx.close();
});
