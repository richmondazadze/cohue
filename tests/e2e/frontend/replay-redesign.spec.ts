import { test, expect } from "@playwright/test";
import { apiContracts } from "@/contracts";
import { MockBackend } from "./support/mock-backend";
import { fixtureId } from "./support/mock-data";
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";

test("replay never displays a later snapshot while an earlier event loads", async ({ page }) => {
  const mock = new MockBackend(); mock.completeDiscovery(); await mock.install(page);
  let releaseEarlier: (() => void) | undefined;
  await page.route("**/api/missions/*/replay?*", async route => {
    const at = Number(new URL(route.request().url()).searchParams.get("atSequence"));
    if (at === 1) await new Promise<void>(resolve => { releaseEarlier = resolve; });
    const snapshot = mock.snapshot();
    snapshot.snapshotSequence = at; snapshot.graph.snapshotSequence = at;
    if (at === 1) {
      snapshot.mission = { ...snapshot.mission, state: "DRAFT" };
      snapshot.proposals = [];
      snapshot.graph.nodes = snapshot.graph.nodes.filter(node => node.kind !== "participant");
      snapshot.graph.edges = [];
    }
    await route.fulfill({ json: apiContracts.replay.response.parse({ data: snapshot, correlationId: fixtureId(900) }) });
  });
  await page.goto(`${base}/missions/${mock.mission.id}/replay`);
  await expect(page.getByRole("heading", { name: "Impact", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Recorded agent work" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Select this group|Start discovery/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Previous/ }).click();
  await expect(page.getByLabel("Loading historical state")).toBeVisible();
  await expect(page.getByRole("region", { name: "Recorded agent work" })).toHaveCount(0);
  releaseEarlier!();
  await expect(page.getByRole("region", { name: "Recorded agent work" })).toBeVisible();
  await expect(page.getByText("Historical state at event #1", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(page.getByText("Maya Chen", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Latest", exact: true }).click();
  await expect(page.getByText("Maya Chen", { exact: true })).toBeVisible();
  expect(mock.commands).toHaveLength(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  if (process.env.COHUE_FRONTEND_SHOTS) await page.screenshot({ path: `${process.env.COHUE_FRONTEND_SHOTS}/replay-desktop.png`, fullPage: true });
});

test("replay explains an empty history", async ({ page }) => {
  const mock = new MockBackend(); await mock.install(page);
  await page.goto(`${base}/missions/${mock.mission.id}/replay`);
  await expect(page.getByText("History unavailable: no committed events yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Previous|Latest/ })).toHaveCount(0);
});
