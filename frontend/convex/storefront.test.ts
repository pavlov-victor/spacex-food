/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
test("public snapshots require owner approval, isolate drafts and hide private fields", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(ctx => ctx.db.insert("users", { name: "Owner" }));
  const owner = t.withIdentity({ subject: `${userId}|session` });
  const organizationId = await owner.mutation(api.organizations.create, { name: "Cafe" });
  const { menuId, productId } = await t.run(async ctx => {
    const menuId = await ctx.db.insert("menus", { organizationId, name: "Draft", status: "draft", fileIds: [], warnings: [], productCount: 1 });
    const categoryId = await ctx.db.insert("categories", { organizationId, name: "Mains", key: "mains" });
    const productId = await ctx.db.insert("products", { organizationId, menuId, categoryId, name: "Salad", description: "Fresh", price: 500, currency: "RSD", portion: "200 g", sourceJson: "PRIVATE", confirmed: { vegan: true, spicy: false }, needsReview: false });
    return { menuId, productId };
  });
  expect(await t.query(api.storefront.menu, { slug: "test" })).toBeNull();
  const args = { menuId, slug: "test", name: "Cafe", reviewed: true };
  await expect(t.mutation(api.storefront.publish, args)).rejects.toThrow();
  await expect(owner.mutation(api.storefront.publish, { ...args, reviewed: false })).rejects.toThrow();
  await owner.mutation(api.storefront.publish, args);
  const snapshot = await t.query(api.storefront.menu, { slug: "test" });
  expect(snapshot?.items[0].tags).toEqual(["Vegan"]);
  expect(JSON.stringify(snapshot)).not.toMatch(/PRIVATE|organizationId|sourceJson|menuId/);
  await t.run(ctx => ctx.db.patch(productId, { name: "Unreviewed change" }));
  expect((await t.query(api.storefront.menu, { slug: "test" }))?.items[0].name).toBe("Salad");
  const otherId = await t.run(ctx => ctx.db.insert("users", { name: "Other" }));
  const other = t.withIdentity({ subject: `${otherId}|session` });
  await expect(other.mutation(api.storefront.unpublish, { slug: "test" })).rejects.toThrow();
  await expect(other.mutation(api.storefront.publish, args)).rejects.toThrow();
  await owner.mutation(api.storefront.unpublish, { slug: "test" });
  expect(await t.query(api.storefront.menu, { slug: "test" })).toBeNull();
});
