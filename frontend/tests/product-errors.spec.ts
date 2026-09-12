import { test, expect } from "@playwright/test";
test("anonymous users see sign-in and the restaurant application placeholder", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByText("Please contact the administrator. The restaurant application form is not available yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add product" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);
});
