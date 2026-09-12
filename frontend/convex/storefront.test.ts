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

test("applying the current reviewed card publishes its English copy without accepting AI recipe claims", async () => {
  const t = convexTest(schema, modules);
  const userId = await t.run(ctx => ctx.db.insert("users", { name: "Owner" }));
  const owner = t.withIdentity({ subject: `${userId}|session` });
  const organizationId = await owner.mutation(api.organizations.create, { name: "Cafe" });
  const ids = await t.run(async ctx => {
    const menuId = await ctx.db.insert("menus", { organizationId, name: "Menu", status: "draft", fileIds: [], warnings: [], productCount: 1 });
    const categoryId = await ctx.db.insert("categories", { organizationId, name: "Mains", key: "mains" });
    const productId = await ctx.db.insert("products", { organizationId, menuId, categoryId, name: "Čorba", description: null, price: 190, currency: "RSD", portion: null, sourceJson: "{}", confirmed: {}, needsReview: true });
    const jobId = await ctx.db.insert("jobs", { organizationId, requestedBy: userId, requestId: "test", kind: "product", productId, status: "succeeded", attempt: 1, input: {} });
    const cardId = await ctx.db.insert("cards", { organizationId, productId, jobId, draftJson: JSON.stringify({ product: { translations: { en: { name: "Soup", description: "A warm soup." } }, confirmed_ingredients: ["invented"], price: 999 } }), warnings: [], status: "draft" });
    await ctx.db.patch(productId, { cardId });
    return { menuId, productId, cardId };
  });
  const publish = { menuId: ids.menuId, slug: "approved-test", name: "Cafe", reviewed: true };
  expect((await owner.query(api.storefront.readiness, {menuId: ids.menuId})).blockers).toEqual([{productId:ids.productId,name:"Čorba",reason:"review"}]);
  await expect(t.query(api.storefront.readiness, {menuId:ids.menuId})).rejects.toThrow();
  await expect(owner.mutation(api.storefront.publish, publish)).rejects.toThrow("Apply the latest");
  const apply = { organizationId, productId: ids.productId, cardId: ids.cardId, reviewed: true };
  await expect(t.mutation(api.catalog.applyCard, apply)).rejects.toThrow();
  await expect(owner.mutation(api.catalog.applyCard, { ...apply, reviewed: false })).rejects.toThrow("Review");
  await owner.mutation(api.catalog.applyCard, apply);
  expect((await owner.query(api.storefront.readiness, {menuId:ids.menuId})).blockers).toEqual([]);
  const product = await owner.query(api.catalog.product, { organizationId, productId: ids.productId });
  expect(product).toMatchObject({ name: "Soup", originalName: "Čorba", description: "A warm soup.", price: 190, confirmed: {}, needsReview: false });
  await owner.mutation(api.storefront.publish, publish);
  expect((await t.query(api.storefront.menu, { slug: publish.slug }))?.items[0]).toMatchObject({ name: "Soup", description: "A warm soup.", ingredients: [], price: 190 });
  expect((await owner.query(api.storefront.publications, { organizationId }))[0].slug).toBe(publish.slug);
  await t.run(ctx => ctx.db.patch(ids.productId, { cardId: undefined }));
  await expect(owner.mutation(api.catalog.applyCard, apply)).rejects.toThrow("card changed");
});
