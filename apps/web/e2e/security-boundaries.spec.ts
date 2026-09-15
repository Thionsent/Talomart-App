import { test, expect } from "@playwright/test";

test("admin area does not expose dashboard to an anonymous visitor", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBeLessThan(500);
  await expect(page).toHaveURL(/\/admin(\/sign-in)?/);
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("order tracking page renders a safe lookup form", async ({ page }) => {
  const response = await page.goto("/track");
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole("textbox", { name: /order number/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /track/i })).toBeVisible();
});
