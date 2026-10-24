import { test, expect } from "@playwright/test";
test("production scaffold renders without claiming product functionality", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "COHUE", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Product experiences and provider integrations are not implemented.",
    ),
  ).toBeVisible();
});
