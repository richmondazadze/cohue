import { test, expect } from "@playwright/test";
import { MockBackend } from "./support/mock-backend";
import { fixtureId } from "./support/mock-data";
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";
const shots = process.env.COHUE_FRONTEND_SHOTS;
const error = { error: { code: "INTERNAL_ERROR", message: "SECRET server database failure", retryable: true }, correlationId: fixtureId(901) };

for (const width of [390, 1440]) test(`plain-language toast, duplicate suppression and dismiss at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const mock = new MockBackend();
  await mock.install(page);
  await page.route("**/api/taxonomy", r => r.fulfill({ status: 500, json: error }));
  await page.goto(`${base}/join`);
  const stack = page.getByRole("region", { name: "Notifications" });
  const toast = stack.getByRole("group", { name: "Something went wrong on our side" });
  await expect(toast).toBeVisible();
  await expect(toast).toContainText("check the latest status");
  await expect(page.locator("body")).not.toContainText("SECRET");
  await expect(page.getByRole("alert").filter({ hasText: "Skill list unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(stack.getByRole("group")).toHaveCount(1);
  if (shots) await page.screenshot({ path: `${shots}/error-toast-${width}.png`, animations: "disabled" });
  await toast.getByRole("button", { name: /Dismiss notification/ }).click();
  await expect(toast).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "Skill list unavailable" })).toBeVisible();
  await page.getByText("Support details", { exact: true }).click();
  await expect(page.getByText("Code: INTERNAL_ERROR", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("reduced motion fades rather than slides and does not move focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mock = new MockBackend(); await mock.install(page);
  await page.route("**/api/taxonomy", r => r.fulfill({ status: 500, json: error }));
  await page.goto(`${base}/join`);
  const toast = page.locator(".error-toast");
  await expect(toast).toBeVisible();
  expect(await toast.evaluate(el => getComputedStyle(el).animationName)).toBe("error-toast-fade-in");
  await expect(toast.getByRole("button")).not.toBeFocused();
});
