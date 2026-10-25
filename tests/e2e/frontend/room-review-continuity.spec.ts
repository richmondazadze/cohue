import { test, expect } from "@playwright/test";
import { MockBackend } from "./support/mock-backend";
import { fixtureId, fixtureTime } from "./support/mock-data";

// Synthetic UI contract harness, not deployed authorization/provider evidence.
test("Room brief edit survives orientation and tab changes until explicit review", async ({ page }) => {
  const mock = new MockBackend();
  mock.mission.state = "ACTIVATED";
  mock.localizations.push({ id: fixtureId(882), sourceId: mock.mission.id, sourceVersion: 1, version: 1, canonicalTextHash: "b".repeat(64), language: "es", originalLanguage: "en", text: "Resumen sintético para revisión.", status: "REVIEW_REQUIRED", generatedAt: fixtureTime });
  await mock.install(page);
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`${process.env.COHUE_FRONTEND_BASE_URL ?? ""}/missions/${mock.mission.id}/room`);
  await page.getByRole("button", { name: "Organizer: review this translation" }).click();
  const text = page.getByLabel("Reviewed translation");
  const draft = "Resumen sintético corregido; las condiciones originales siguen vigentes.";
  await text.fill(draft);
  for (const width of [390, 1024, 1440, 768]) {
    await page.setViewportSize({ width, height: 900 });
    if (width < 768) {
      await expect(text).not.toBeVisible();
      await page.getByRole("tab", { name: "Brief", exact: true }).click();
    }
    await expect(text).toBeVisible();
    await expect(text).toHaveValue(draft);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("tab", { name: "Tasks", exact: true }).click();
  await expect(text).not.toBeVisible();
  await page.getByRole("tab", { name: "Brief", exact: true }).click();
  await expect(text).toHaveValue(draft);
  await expect(page.getByRole("button", { name: "Listen in Español", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Approve translation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Listen in Español", exact: true })).toBeVisible();
});
