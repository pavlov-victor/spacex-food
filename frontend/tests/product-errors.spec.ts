import { test, expect } from "@playwright/test";
test("anonymous form cannot write organization data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Sign in");
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Product name").fill("Test dish");
  await page.getByLabel("Category", { exact: true }).fill("Main dishes");
  await page.getByLabel("Price (RSD)").fill("100");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Sign in",
  );
});
