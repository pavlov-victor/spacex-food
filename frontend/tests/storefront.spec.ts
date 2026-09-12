import { expect, test } from "@playwright/test";
test("mobile public menu: categories and dish details", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/menu/sava");
  await expect(page.getByRole("heading", { name: "Explore the menu" })).toBeVisible();
  await expect(page.locator(".sf-card")).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/storefront-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Salads 2", exact: true }).click();
  await expect(page.locator(".sf-card")).toHaveCount(2);
  await page.getByRole("button", { name: "All dishes 10", exact: true }).click();
  await expect(page.locator(".sf-card")).toHaveCount(10);
  await page.getByRole("button", { name: "View Karađorđe's schnitzel" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("desktop and unpublished menu", async ({ page }) => {
  await page.goto("/menu/sava");
  await expect(page.locator(".sf-card")).toHaveCount(10);
  await expect(page.locator(".sf-card img").first()).toHaveJSProperty("naturalWidth", 1024);
  await page.screenshot({ path: "test-results/storefront-desktop.png", fullPage: true });
  await page.goto("/menu/not-published");
  await expect(page.getByRole("heading", { name: "Menu unavailable" })).toBeVisible();
});
