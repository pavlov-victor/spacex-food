import { test, expect } from "@playwright/test";

test("dashboard, product creation, persistence and search", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("168", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add product" }).click();
  await page.getByLabel("Product name").fill("Karađorđeva šnicla");
  await page.getByLabel("Category", { exact: true }).fill("Main dishes");
  await page.getByLabel("Price (RSD)").fill("1200");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("169", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("169", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Karađorđeva šnicla" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search products" })
    .fill("unmatched");
  await expect(page.getByText("No matching products.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile navigation, dialog and demo logout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(
    page.getByText("You have left the demo workspace."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Return to demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible();
});
