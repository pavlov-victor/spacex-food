import { test, expect } from "@playwright/test";
import { signInDemo } from "./auth-helper";
test("anonymous CRM shows sign-in requirement without exposing organization products", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText("Sign in");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(page.getByText("Karađorđeva", { exact: false })).toHaveCount(0);
});
test("authenticated browser reads organization products from Convex", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_BACKEND_E2E !== "1",
    "Requires configured dev deployment and seeded demo account.",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signInDemo(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile navigation stays within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Products", exact: true }),
  ).toBeVisible();
});
