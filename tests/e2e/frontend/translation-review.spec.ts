import { test, expect } from "@playwright/test";
import { MockBackend } from "./support/mock-backend";
import { fixtureId, fixtureTime } from "./support/mock-data";

// Synthetic contract harness only; the deployed provider/authorization checks are separate gates.
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";
test("creator reviews translation without redeeming a participant capability; failure retains text", async ({ page }) => {
  const mock = new MockBackend();
  await mock.install(page);
  await page.goto(`${base}/missions/new`);
  await mock.organize(page);
  await page.getByLabel("Objective").fill("Build a synthetic repair café");
  await page.getByLabel("Expected output").fill("A synthetic workshop");
  await page.getByLabel("Skill").selectOption("design");
  await page.getByRole("button", { name: "Review requirements" }).click();
  await page.getByRole("button", { name: "Start discovery" }).click();
  await expect(page).toHaveURL(/\/missions\/[0-9a-f-]{36}$/);
  mock.completeDiscovery();
  await page.getByRole("button", { name: /Select this group/ }).click();
  await expect(page.getByRole("heading", { name: "Invitations", exact: true })).toBeVisible();
  const inv = mock.invitations[1];
  mock.localizations.push({ id: fixtureId(881), sourceId: inv.id, sourceVersion: inv.proposalRevision, version: 1, canonicalTextHash: "a".repeat(64), language: "es", originalLanguage: "en", text: "Revisa el horario y las responsabilidades antes de decidir.", status: "REVIEW_REQUIRED", generatedAt: fixtureTime });
  await page.getByRole("button", { name: "Review terms & translations" }).nth(1).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Responsibilities" })).toBeVisible();
  await expect(dialog.getByText(/Revisa el horario/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Accept these terms" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /Listen in Español/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Organizer: review this translation" }).click();
  await dialog.getByLabel("Reviewed translation").fill("Revisa los términos originales y confirma tu disponibilidad.");
  // Rotation / tablet breakpoints must preserve the open sheet and its unsubmitted edit.
  for (const width of [390, 1024, 1440, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Reviewed translation")).toHaveValue("Revisa los términos originales y confirma tu disponibilidad.");
  }
  await dialog.getByRole("button", { name: "Approve translation", exact: true }).click();
  await expect(dialog.getByText(/Translation reviewed by the organizer/)).toBeVisible();
  await dialog.getByRole("button", { name: /Listen in Español/ }).click();
  await expect(dialog.getByText("Audio unavailable · the text above is complete")).toBeVisible();
  await expect(dialog.getByText("Revisa los términos originales y confirma tu disponibilidad.")).toBeVisible();
  expect(mock.commands.filter((c) => c.op === "redeemInvitation" || c.op === "respondInvitation")).toEqual([]);
  expect(mock.commands.find((c) => c.op === "approveLocalization")?.body).toMatchObject({ expectedVersion: 1, canonicalTextHash: "a".repeat(64) });
  await dialog.getByRole("button", { name: "Close", exact: true }).press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Review terms & translations" }).nth(1)).toBeFocused();
});
