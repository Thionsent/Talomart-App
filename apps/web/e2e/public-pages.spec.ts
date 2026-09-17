import { test, expect } from "@playwright/test";

const publicPages = ["/", "/help", "/contact", "/returns", "/shipping", "/warranty", "/payments", "/about", "/sign-in", "/sign-up"];

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
