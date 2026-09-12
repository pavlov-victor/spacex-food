import { internalMutation, internalQuery, mutation, query, env } from "./_generated/server";
import { v } from "convex/values";
import { requireOrganization } from "./lib/access";
import { invalidateMenuPdf } from "./lib/menuPdf";
import { internal } from "./_generated/api";

export const regenerate = mutation({
  args: { menuId: v.id("menus") },
  handler: async (ctx, { menuId }) => {
    const menu = await ctx.db.get(menuId);
    if (!menu) throw new Error("Menu not found.");
    await requireOrganization(ctx, menu.organizationId);
    if (menu.status !== "draft") throw new Error("Wait for menu import to finish.");
    await invalidateMenuPdf(ctx, menuId);
    return null;
  },
});
export const status = query({
  args: { menuId: v.id("menus") },
  handler: async (ctx, { menuId }) => {
    const menu = await ctx.db.get(menuId);
    if (!menu) return null;
    await requireOrganization(ctx, menu.organizationId);
    return {
      status: menu.pdfStatus ?? "idle", revision: menu.pdfRevision ?? 0,
      generatedRevision: menu.pdfGeneratedRevision ?? null,
      isStale: menu.pdfGeneratedRevision !== menu.pdfRevision,
      error: menu.pdfError ?? null, updatedAt: menu.pdfUpdatedAt ?? null,
      pdfUrl: menu.pdfStorageId ? await ctx.storage.getUrl(menu.pdfStorageId) : null,
      previewUrl: menu.pdfPreviewStorageId ? await ctx.storage.getUrl(menu.pdfPreviewStorageId) : null,
    };
  },
});
export const claim = internalMutation({
  args: { menuId: v.id("menus"), revision: v.number() },
  handler: async (ctx, args) => {
    const menu = await ctx.db.get(args.menuId);
    if (!menu || menu.pdfRevision !== args.revision || menu.pdfStatus !== "queued") return false;
    await ctx.db.patch(menu._id, { pdfStatus: "running" });
    await ctx.scheduler.runAfter(8 * 60 * 1000, internal.menuPdfState.fail, { ...args, error: "PDF task timed out. Retry generation." });
    return true;
  },
});
export const snapshot = internalQuery({
  args: { menuId: v.id("menus"), revision: v.number() },
  handler: async (ctx, args) => {
    const menu = await ctx.db.get(args.menuId);
    if (!menu || menu.pdfRevision !== args.revision || menu.pdfStatus !== "running") return null;
    const products = await ctx.db.query("products").withIndex("by_organizationId_and_menuId", q => q.eq("organizationId", menu.organizationId).eq("menuId", menu._id)).take(501);
    if (products.length > 500) throw new Error("Printable menus support at most 500 products.");
    const publications = await ctx.db.query("publicMenus").withIndex("by_organizationId", q => q.eq("organizationId", menu.organizationId)).take(100);
    const publication = publications.find(p => p.menuId === menu._id && p.published);
    const items = await Promise.all(products.map(async p => ({
      name: p.name, description: p.description, price: p.price, currency: p.currency,
      portion: p.portion, category: (await ctx.db.get(p.categoryId))?.name ?? "Menu",
    })));
    items.sort((a, b) => a.category.localeCompare(b.category));
    return { task: "render", name: menu.name, items,
      url: publication && env.PUBLIC_APP_URL ? new URL(`/menu/${encodeURIComponent(publication.slug)}`, env.PUBLIC_APP_URL).href : null };
  },
});
export const finish = internalMutation({
  args: { menuId: v.id("menus"), revision: v.number(), pdfStorageId: v.id("_storage"), previewStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const menu = await ctx.db.get(args.menuId);
    if (!menu || menu.pdfRevision !== args.revision || menu.pdfStatus !== "running") {
      await ctx.storage.delete(args.pdfStorageId);
      await ctx.storage.delete(args.previewStorageId);
      return null;
    }
    if (menu.pdfStorageId) await ctx.storage.delete(menu.pdfStorageId);
    if (menu.pdfPreviewStorageId) await ctx.storage.delete(menu.pdfPreviewStorageId);
    await ctx.db.patch(menu._id, {
      pdfStorageId: args.pdfStorageId, pdfPreviewStorageId: args.previewStorageId,
      pdfStatus: "succeeded", pdfGeneratedRevision: args.revision, pdfUpdatedAt: Date.now(), pdfError: undefined,
    });
    return null;
  },
});
export const fail = internalMutation({
  args: { menuId: v.id("menus"), revision: v.number(), error: v.string() },
  handler: async (ctx, args) => {
    const menu = await ctx.db.get(args.menuId);
    if (menu?.pdfRevision === args.revision && menu.pdfStatus === "running")
      await ctx.db.patch(menu._id, { pdfStatus: "failed", pdfError: args.error.slice(0, 500) });
    return null;
  },
});
