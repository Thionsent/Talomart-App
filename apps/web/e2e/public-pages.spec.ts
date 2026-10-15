import { test, expect } from "@playwright/test";

const publicPages = ["/", "/offers", "/help", "/contact", "/returns", "/shipping", "/warranty", "/payments", "/about", "/sign-in", "/sign-up"];

test.describe("public customer pages", () => {
  for (const path of publicPages) {
    test(`${path} loads without an application error`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    });
  }
});

test("Today's Deals offers usable filters and a clear empty state", async ({ page }) => {
  await page.goto("/offers");
  await expect(page.getByRole("heading", { name: "Today's Deals" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search deals" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search deals" }).fill("unlikely-product-name-xyz");
  await page.getByRole("button", { name: "Show deals" }).click();
  await expect(page.getByRole("heading", { name: "No deals match those filters" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
});

test("footer exposes real support channels and no app-store placeholders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("talomartelectricals@gmail.com").first()).toBeVisible();
  await expect(page.getByText("+254 113 375 517").first()).toBeVisible();
  await expect(page.getByText("Download Our App")).toHaveCount(0);
  await expect(page.getByText("Admin Portal")).toHaveCount(0);
});

for (const path of ["/sign-in", "/sign-up"]) {
  test(`${path} offers Google authentication`, async ({ page }) => {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible();
  });
}
