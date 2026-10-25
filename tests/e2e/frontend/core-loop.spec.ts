import { test, expect } from "@playwright/test";
import { MockBackend } from "./support/mock-backend";

// UI journey over a contract-validated mock backend (fixture data). Proves rendering, registry-correct
// commands and honest states; real second-device consent is covered by tests/e2e/integration.
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";
const shots = process.env.COHUE_FRONTEND_SHOTS;

test.describe.configure({ mode: "serial" });

for (const width of [390, 1280]) {
  test(`create -> select -> invite link -> accept -> activate -> room at ${width}px`, async ({ browser }) => {
    const mock = new MockBackend();
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await mock.install(page);
    const shot = async (name: string) => {
      if (shots) await page.screenshot({ path: `${shots}/${name}-${width}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    };

    await page.goto(`${base}/missions/new`);

    await mock.organize(page);
    await page.getByLabel("Objective").fill("Build a community repair café");
    await page.getByLabel("Expected output").fill("A first repair evening with volunteers");
    await page.getByLabel("Skill").selectOption("design");
    await page.getByRole("button", { name: "Review requirements" }).click();
    await expect(page.getByRole("heading", { name: "Review before discovery" })).toBeVisible();
    await shot("composer-review");
    await page.getByRole("button", { name: "Start discovery" }).click();
    await expect(page).toHaveURL(/\/missions\/[0-9a-f-]{36}$/);
    await expect(page.getByText("The planner is working from your confirmed requirements.")).toBeVisible();
    await expect(page.getByText(/Current step: search opted-in people/)).toBeVisible();
    await shot("theater-planning");

    mock.completeDiscovery();
    await expect(page.getByRole("heading", { name: "Review proposed groups" })).toBeVisible({ timeout: 10_000 });
    // The desktop-only requirement rail repeats names; assert the visible proposal copy at every width.
    await expect(page.getByText("Sofía Ruiz").filter({ visible: true }).first()).toBeVisible();
    await shot("theater-proposed");
    await page.getByRole("tab", { name: /map/i }).click();
    await page.getByRole("button", { name: "List", exact: true }).click();
    await expect(page.getByRole("heading", { name: /People · 3/ })).toBeVisible();
    await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(6, { timeout: 10_000 });
    await shot("theater-map");
    await page.getByRole("tab", { name: "Mission" }).click();
    await page.getByRole("button", { name: /Select this group/ }).click();
    await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Activate mission" })).toBeDisabled();

    // Share link + QR for the designer; no token in this page's URL.
    await page.getByRole("button", { name: /Show invitation link/ }).nth(1).click();
    const linkBox = page.getByRole("textbox", { name: /Invitation link for Sofía Ruiz/ });
    await expect(linkBox).toBeVisible();
    await expect(page.getByRole("img", { name: /QR code for Sofía Ruiz/ })).toBeVisible();
    const link = await linkBox.inputValue();
    expect(page.url()).not.toContain("mockShareToken");
    await shot("theater-invite-link");

    // Second "device": separate context opens the link, previews, explicitly redeems, accepts.
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p2 = await phone.newPage();
    await mock.install(p2);
    await p2.goto(base ? link.replace(/^https?:\/\/[^/]+/, base) : new URL(link).pathname);
    await expect(p2.getByRole("button", { name: "Open my invitation" })).toBeVisible();
    await p2.getByRole("button", { name: "Open my invitation" }).click();
    await expect(p2).toHaveURL(/\/invitations\/opened\/[0-9a-f-]{36}$/);
    expect(p2.url()).not.toContain("mockShareToken");
    await expect(p2.getByRole("heading", { name: "Responsibilities" })).toBeVisible();
    if (shots) await p2.screenshot({ path: `${shots}/invitation-terms-390.png`, fullPage: true });
    await p2.getByRole("button", { name: "Accept these terms" }).click();
    await expect(p2.getByText("✓ You approved these terms")).toBeVisible();
    await phone.close();

    mock.acceptOthers();
    await expect(page.getByRole("button", { name: "Activate mission" })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole("button", { name: "Activate mission" }).click();
    await expect(page.getByRole("link", { name: "Open Mission Room" })).toBeVisible({ timeout: 10_000 });
    await shot("theater-activated");
    await page.getByRole("link", { name: "Open Mission Room" }).click();
    await expect(page.getByText("Sketch the accessible interface", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kickoff plan for your first hour" })).toBeVisible();
    await expect(page.getByText(/five-minute round of introductions/)).toBeVisible();
    await page.getByRole("button", { name: "es" }).click();
    await expect(page.getByRole("button", { name: "es" })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel(/Status for Sketch/).selectOption("DONE");
    await expect(page.getByText("Someone else changed this task")).toBeVisible();
    await shot("room-stale");
    await page.getByLabel(/Status for Sketch/).selectOption("DONE");
    await expect(page.getByText("✓ Saved")).toBeVisible();

    // Every command carried an idempotency key; distinct decisions used distinct keys.
    const keys = mock.commands.map((c) => c.key);
    expect(keys.every(Boolean)).toBe(true);
    const tasks = mock.commands.filter((c) => c.op === "updateTask");
    expect(new Set(tasks.map((t) => t.key)).size).toBe(2);
    await ctx.close();
  });
}

test("API unavailable shows an honest error, never fixture data", async ({ page }) => {
  await page.route("**/api/**", (r) => r.fulfill({ status: 503, body: "upstream down" }));
  await page.goto(`${base}/missions/00000000-0000-4000-8000-000000000064`);
  await expect(page.getByRole("alert").filter({ hasText: "We couldn’t reach the service" })).toBeVisible();
  await page.goto(`${base}/join`);
  await expect(page.getByText("Skill list unavailable")).toBeVisible();
});
