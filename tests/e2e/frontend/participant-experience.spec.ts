import { test, expect, type Page, type Route } from "@playwright/test";
import { apiContracts, type ApiOperation, type Invitation } from "@/contracts";
import { MockBackend } from "./support/mock-backend";
import {
  fixtureId,
  participants,
  proposal,
  scope,
  fixtureTime,
} from "./support/mock-data";

test.use({
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
    permissions: ["microphone"],
  });

// Contract-validated synthetic API responses. These are UI/regression tests, not provider or DB evidence.
const base = process.env.COHUE_FRONTEND_BASE_URL ?? "";
const shots = process.env.COHUE_FRONTEND_SHOTS;
const identity = {
  principalId: fixtureId(990),
  kind: "GUEST",
  scope,
  invitationId: null,
  expiresAt: "2026-12-01T00:00:00Z",
};
const failure = (code: string) => ({
  error: { code, message: `Synthetic UI test ${code}`, retryable: false },
  correlationId: fixtureId(901),
});
const success = (route: Route, op: ApiOperation, data: unknown, status = 200) =>
  route.fulfill({
    status,
    json: apiContracts[op].response.parse({
      data,
      correlationId: fixtureId(900),
    }),
  });

async function setup(page: Page, profile = false) {
  const mock = new MockBackend();
  mock.session = identity;
  await mock.install(page);
  if (profile)
    await page.addInitScript(
      ({ id, principal }) => {
        localStorage.setItem(
          `cohue.device.v2:LIVE:${principal}`,
          JSON.stringify({ participantId: id, missions: [] }),
        );
      },
      { id: participants[0].id, principal: identity.principalId },
    );
  return mock;
}
async function screenshot(page: Page, name: string) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  const modal = (await page.getByRole("dialog").count()) > 0;
  if (!modal)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  if (shots)
    await page.screenshot({
      path: `${shots}/${name}.png`,
      fullPage: !modal,
      animations: "disabled",
    });
}

for (const width of [390, 1440]) {
  test(`four onboarding steps, skill confirmation, review editing and save at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const mock = await setup(page);
    await page.goto(`${base}/join`);
    await expect(
      page.getByRole("heading", { name: "About you", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator(".onboarding-body").getByRole("alert")).toContainText(
      "Enter the name others will see.",
    );
    await page.getByLabel("Display name", { exact: true }).fill("Ari UI test");
    await page.getByLabel("Username", {exact:true}).fill("ari_ui_test");
    await screenshot(page, `join-about-${width}`);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("textbox", { name: "Find a skill" }).fill("design");
    await page.locator(".skill-list").getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator(".onboarding-body").getByRole("alert")).toContainText(
      "Confirm the skills you offer before saving.",
    );
    await page
      .getByRole("checkbox", {
        name: "I confirm these skills and levels describe me accurately.",
      })
      .check();
    await screenshot(page, `join-skills-${width}`);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("checkbox", {
        name: "I want to be considered for missions",
      }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Let mission searches find me" }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("checkbox", {
        name: "Show a minimal entry on the public network map",
      }),
    ).not.toBeChecked();
    await page
      .getByRole("checkbox", { name: "I want to be considered for missions" })
      .check();
    await page
      .getByRole("checkbox", { name: "Let mission searches find me" })
      .check();
    await screenshot(page, `join-time-${width}`);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Review", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Edit about you", exact: true })
      .click();
    await page.getByLabel("Display name", { exact: true }).fill("Ari reviewed");
    await page
      .getByRole("navigation", { name: "Onboarding progress" })
      .getByRole("button", { name: "Review", exact: true })
      .click();
    await screenshot(page, `join-review-${width}`);
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    await expect(page).toHaveURL(/\/me\?joined=1$/);
    await expect(
      page.getByText("Profile saved. A new possibility starts here."),
    ).toBeVisible();
    const saved = mock.commands.find((c) => c.op === "createParticipant");
    expect(saved?.body).toMatchObject({
      displayName: "Ari reviewed",
      participationOptIn: true,
      visibility: { discoverable: true, publicGraph: false },
    });
    expect(saved?.key).toBeTruthy();
  });

  test(`profile, empty inbox, mobile navigation and deletion sheet at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page, true);
    await page.goto(`${base}/me`);
    await expect(
      page.getByRole("heading", { name: "Room for your next possibility." }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Your profile" }),
    ).toContainText("Synthetic 1");
    await screenshot(page, `me-empty-${width}`);
    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      const nav = page.getByRole("dialog", { name: "COHUE navigation" });
      await expect(
        nav.getByRole("link", { name: "My profile & invitations" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close navigation" }).click();
      await expect(
        page.getByRole("button", { name: "Open navigation" }),
      ).toBeFocused();
    } else {
      await page.getByRole("button", { name: "Collapse sidebar" }).click();
      await expect(
        page
          .locator(".participant-sidebar")
          .getByRole("link", { name: "My profile & invitations" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Expand sidebar" }).click();
    }
    await page.getByRole("button", { name: "Delete my profile…" }).click();
    const sheet = page.getByRole("dialog", { name: "Delete your profile?" });
    await expect(sheet).toContainText("purged within 24 hours");
    await screenshot(page, `me-delete-sheet-${width}`);
    await page.getByRole("button", { name: "Keep profile" }).click();
    await expect(
      page.getByRole("button", { name: "Delete my profile…" }),
    ).toBeFocused();
  });
}

test("pending invitation shows terms, deadline and private QR controls", async ({
  page,
}) => {
  const mock = await setup(page, true);
  const member = proposal.members[0];
  mock.invitations = [
    {
      id: fixtureId(200),
      missionId: proposal.missionId,
      proposalId: proposal.id,
      proposalRevision: 1,
      participantId: participants[0].id,
      scope,
      language: "en",
      status: "PENDING",
      terms: member.terms,
      termsHash: member.termsHash,
      responseVersion: 1,
      expiresAt: "2026-12-01T00:00:00Z",
      lineage: null,
    },
  ] as Invitation[];
  await page.goto(`${base}/me`);
  await expect(
    page.getByText("Your proposed role", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Answer deadline", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show invitation link & QR" }).click();
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  expect(page.url()).not.toContain("mockShareToken");
  await screenshot(page, "me-pending-invitation");
});

test("lost profile access is private and can be forgotten without deleting", async ({
  page,
}) => {
  const mock = await setup(page, true);
  await page.route(`**/api/participants/${participants[0].id}`, (r) =>
    r.fulfill({ status: 403, json: failure("FORBIDDEN") }),
  );
  await page.goto(`${base}/me`);
  await expect(
    page.getByRole("heading", {
      name: "This browser no longer has access to the saved profile",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Your profile" }),
  ).toHaveCount(0);
  await screenshot(page, "me-access-lost");
  await page.getByRole("button", { name: "Forget it on this device" }).click();
  await expect(
    page.getByRole("heading", { name: "No profile on this device yet" }),
  ).toBeVisible();
  expect(mock.commands.some((c) => c.op === "deleteParticipant")).toBe(false);
});

test("AI draft remains review-only and errors retain written input", async ({
  page,
}) => {
  await setup(page);
  let fail = false;
  await page.route("**/api/participants/parse", (r) =>
    fail
      ? r.fulfill({ status: 503, json: failure("UNAVAILABLE") })
      : success(r, "parseProfile", {
          profile: { displayName: "Draft name", language: "en" },
          capabilities: [
            {
              normalizedSkillId: "design",
              category: "product",
              level: 3,
              evidence: "Synthetic test draft",
              normalizationVersion: "taxonomy-1",
            },
          ],
          unknowns: ["Please check your schedule."],
          requiresConfirmation: true,
        }),
  );
  await page.goto(`${base}/join`);
  await page
    .getByLabel("Describe yourself in your own words", { exact: false })
    .fill("Synthetic UI test description");
  await page.getByRole("button", { name: "Draft my profile" }).click();
  await expect(
    page.getByText(
      "Draft filled in. Review every step; suggested skills need your confirmation.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Draft name",
  );
  await page.getByLabel("Username", {exact:true}).fill("draft_user");
  fail = true;
  await page.getByRole("button", { name: "Draft my profile" }).click();
  await expect(
    page.getByText(
      "Could not draft from text. Your text is kept; fill the steps directly.",
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Describe yourself in your own words", { exact: false }),
  ).toHaveValue("Synthetic UI test description");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "I confirm these skills and levels describe me accurately.",
    }),
  ).not.toBeChecked();
});

test("session failure is distinct from having no saved profile", async ({
  page,
}) => {
  await page.route("**/api/session", (r) =>
    r.fulfill({ status: 503, json: failure("UNAVAILABLE") }),
  );
  await page.goto(`${base}/me`);
  await expect(
    page.getByRole("heading", { name: "Let’s reconnect your space." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No profile on this device yet" }),
  ).toHaveCount(0);
});

test("deletion requires confirmation and sends the profile version", async ({
  page,
}) => {
  await setup(page, true);
  let body: unknown;
  await page.route(`**/api/participants/${participants[0].id}`, (r) => {
    if (r.request().method() !== "DELETE") return r.fallback();
    body = r.request().postDataJSON();
    return success(
      r,
      "deleteParticipant",
      {
        deletionId: fixtureId(9001),
        status: "ACCEPTED",
        revokedAt: fixtureTime,
        purgeBy: "2026-10-26T14:00:00Z",
      },
      202,
    );
  });
  await page.goto(`${base}/me`);
  await page.getByRole("button", { name: "Delete my profile…" }).click();
  expect(body).toBeUndefined();
  await page
    .getByRole("button", { name: "Delete profile", exact: true })
    .click();
  await expect(page).toHaveURL(`${base}/`);
  expect(body).toEqual({ expectedVersion: participants[0].profileVersion });
});

test("drafting and saving expose pending states; save failure retains review", async ({
  page,
}) => {
  await setup(page);
  let releaseDraft!: () => void;
  const draftGate = new Promise<void>((resolve) => {
    releaseDraft = resolve;
  });
  await page.route("**/api/participants/parse", async (r) => {
    await draftGate;
    return success(r, "parseProfile", {
      profile: { displayName: "Reviewed synthetic profile", language: "en" },
      capabilities: [],
      unknowns: [],
      requiresConfirmation: true,
    });
  });
  let releaseSave!: () => void;
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route("**/api/participants", async (r) => {
    await saveGate;
    return r.fulfill({ status: 503, json: failure("UNAVAILABLE") });
  });
  await page.goto(`${base}/join`);
  await page
    .getByLabel("Describe yourself in your own words", { exact: false })
    .fill("Synthetic review-only draft");
  await page.getByRole("button", { name: "Draft my profile" }).click();
  await expect(
    page.getByRole("button", { name: "Drafting profile…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  releaseDraft();
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Reviewed synthetic profile",
  );
  await page.getByLabel("Username", {exact:true}).fill("pending_user");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saving profile…" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Back", exact: true }),
  ).toBeDisabled();
  releaseSave();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Review", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".onboarding-body")).toContainText(
    "Reviewed synthetic profile",
  );
  await expect(
    page.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeEnabled();
});

test("reduced motion and narrow viewport keep the form usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  await page.goto(`${base}/join`);
  await expect(
    page.getByRole("heading", { name: "About you", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".onboarding-step-content")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("dialog", { name: "COHUE navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
});

test.describe("profile voice review", () => {

  test("recording becomes editable text without automatically drafting or saving", async ({
    page,
  }) => {
    const mock = await setup(page);
    mock.session = null; // First-time visitor: voice must establish a session before uploading.
    let uploaded = false;
    await page.route("**/api/voice/transcribe", (r) => {
      expect(mock.session).not.toBeNull();
      expect(r.request().headers()["idempotency-key"]).toBeTruthy();
      uploaded = true;
      return success(r, "transcribe", {
        transcript: "Synthetic voice transcript to review",
        language: "en",
        status: "REVIEW_REQUIRED",
        rawAudioDeleted: true,
      });
    });
    await page.goto(`${base}/join`);
    await page.getByRole("button", { name: "Record instead" }).click();
    await expect(page.getByText("● Recording", { exact: true })).toBeVisible();
    await expect(page.getByText(/1s \/ 60s/)).toBeVisible();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await page.getByRole("button", { name: "Transcribe to text" }).click();
    await expect(
      page.getByText(
        "✓ Transcript added as an editable draft. Review it before using it.",
      ),
    ).toBeVisible();
    await expect(
      page.getByLabel("Describe yourself in your own words", { exact: false }),
    ).toHaveValue("Synthetic voice transcript to review");
    await page
      .getByLabel("Describe yourself in your own words", { exact: false })
      .fill("Edited by the person");
    expect(uploaded).toBe(true);
    expect(
      mock.commands.some(
        (c) => c.op === "createParticipant" || c.op === "parseProfile",
      ),
    ).toBe(false);
  });
});
