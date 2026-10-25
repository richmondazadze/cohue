import { test, expect } from "@playwright/test";
test("production entry page renders the approved proposition", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "What could we make happen together?" }),
  ).toBeVisible();
});
