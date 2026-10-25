import { test, expect } from "@playwright/test";
import { MockBackend } from "./support/mock-backend";

// UI-only (fixture backend): a mission this device created changes state while its creator is elsewhere,
// and an app-wide alert says so with a way back. Real polling against the live API is covered by the shared queries.
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";

test("creator hears about new teams while on another page", async ({ page }) => {
  const mock = new MockBackend();
  await mock.install(page);
  await page.goto(`${base}/missions/new`);
  await page.getByLabel("Objective").fill("Build a community repair café");
  await page.getByLabel("Expected output").fill("A first repair evening with volunteers");
  await page.getByLabel("Skill").selectOption("design");
  await page.getByRole("button", { name: "Review requirements" }).click();
  await page.getByRole("button", { name: "Start discovery" }).click();
  await expect(page).toHaveURL(/\/missions\/[0-9a-f-]{36}$/);
  const missionUrl = page.url();
  await expect(page.getByText("The planner is working from your confirmed requirements.")).toBeVisible();

  await page.goto(`${base}/join`);
  await expect(page.getByRole("status").filter({ hasText: "Teams are ready" })).toHaveCount(0);
  mock.completeDiscovery();
  const alert = page.getByRole("status").filter({ hasText: "Teams are ready for you to choose" });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText("Build a community repair café");
  await alert.getByRole("link", { name: "Open" }).click();
  await expect(page).toHaveURL(missionUrl);
  await expect(page.getByRole("heading", { name: "Review proposed groups" })).toBeVisible({ timeout: 10_000 });
  await expect(alert).toHaveCount(0);
});
