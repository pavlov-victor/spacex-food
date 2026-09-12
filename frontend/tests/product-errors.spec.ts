import { test, expect } from "@playwright/test";

test("invalid saved data is surfaced and never overwritten by a new product", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("spacex-food-products-v1", "{broken"),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText(
    "Could not load saved products",
  );
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Product name").fill("Test dish");
  await page.getByLabel("Category", { exact: true }).fill("Main dishes");
  await page.getByLabel("Price (RSD)").fill("100");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Could not save the product",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("spacex-food-products-v1")),
  ).toBe("{broken");
});

test("domain validation rejects whitespace-only product names", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Product name").fill("   ");
  await page.getByLabel("Category", { exact: true }).fill("Main dishes");
  await page.getByLabel("Price (RSD)").fill("100");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Enter a product name",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("spacex-food-products-v1")),
  ).toBeNull();
});
