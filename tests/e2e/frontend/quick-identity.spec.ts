import { test, expect } from "@playwright/test";
import { MockBackend } from "./support/mock-backend";

// UI-only (fixture backend): an organizer needs only a username and an avatar to start a mission.
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";

test("organizer starts with just a username and an avatar", async ({ page }) => {
  const mock = new MockBackend();
  await mock.install(page);
  await page.goto(`${base}/missions/new`);
  await expect(page.getByText("Who's organizing?")).toBeVisible();
  await page.getByRole("button", { name: "Continue as organizer" }).click();
  await expect(page.locator("#quick-username")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#quick-username").fill("Ada_Builds");
  await page.getByRole("button", { name: "Avatar 3" }).click();
  await page.getByRole("button", { name: "Continue as organizer" }).click();
  await expect(page.getByText("Who's organizing?")).toHaveCount(0);
  const created = mock.commands.find((c) => c.op === "createParticipant")?.body as Record<string, unknown>;
  expect(created).toMatchObject({
    username: "ada_builds",
    avatarId: "3d_3",
    displayName: "ada_builds",
    capabilities: [],
    availability: [],
    participationOptIn: false,
    visibility: { publicGraph: false, discoverable: false },
  });
  // The brief can now be reviewed and discovery started as before.
  await page.getByLabel("Objective").fill("Build a community repair café");
  await page.getByLabel("Expected output").fill("A first repair evening with volunteers");
  await page.getByLabel("Skill").selectOption("design");
  await page.getByRole("button", { name: "Review requirements" }).click();
  await page.getByRole("button", { name: "Start discovery" }).click();
  await expect(page).toHaveURL(/\/missions\/[0-9a-f-]{36}$/);
});
