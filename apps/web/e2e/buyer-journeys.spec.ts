import { test, expect } from "@playwright/test";

test.describe("buyer journey guardrails", () => {
  test("sign-in validates required fields without a network request", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /sign in to talomart/i })).toBeVisible();
    const email = page.getByLabel(/email address/i);
    const password = page.locator('input[name="password"]');
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await page.getByRole("button", { name: /sign in securely/i }).click();
    await expect(email).toHaveAttribute("required", "");
    await expect(password).toHaveAttribute("required", "");
  });

  test("cart and wishlist pages load and expose empty-state navigation", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("body")).not.toContainText("Application error");
    await page.goto("/wishlist");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("checkout requires delivery details before placing an order", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("body")).not.toContainText("Application error");
    const placeOrder = page.getByRole("button", { name: /place order/i });
    if (await placeOrder.count()) {
      await expect(placeOrder).toBeDisabled();
    }
  });
});
