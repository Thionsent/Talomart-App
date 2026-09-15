import { test, expect } from "@playwright/test";

test.describe("administrator boundaries", () => {
  test("admin sign-in page is reachable without exposing dashboard data", async ({ page }) => {
    const response = await page.goto("/admin/sign-in");
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.getByRole("heading", { name: /admin/i }).first()).toBeVisible();
  });

  test("privileged routes remain protected when unauthenticated", async ({ page }) => {
    for (const path of ["/admin/products", "/admin/orders", "/admin/security", "/admin/audit-log"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page).toHaveURL(/\/admin(\/sign-in)?/);
    }
  });
});
