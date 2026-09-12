import { invalidateMenuPdf } from "./lib/menuPdf";
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOrganization, boundedText } from "./lib/access";
import { publicItem } from "./storefrontSchema";

export const menu = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), v.object({ name: v.string(), demo: v.boolean(), coverImageUrl: v.union(v.string(), v.null()), items: v.array(v.object({ id: v.string(), ...publicItem })) })),
  handler: async (ctx, { slug }) => {
    const menu = await ctx.db.query("publicMenus").withIndex("by_slug", q => q.eq("slug", slug)).unique();
    if (!menu?.published) return null;
    const items = await ctx.db.query("publicMenuItems").withIndex("by_menu", q => q.eq("publicMenuId", menu._id)).take(250);
    const restaurant = await ctx.db.get(menu.organizationId);
    const cover = restaurant?.tableFileId ? await ctx.db.get(restaurant.tableFileId) : null;
    const coverImageUrl = cover?.organizationId === menu.organizationId && cover.kind === 'table'
      ? await ctx.storage.getUrl(cover.storageId) : null;
    return { name: menu.name, demo: menu.demo, coverImageUrl, items: items.map(({ _id, _creationTime: _time, publicMenuId: _menu, ...item }) => ({ id: _id, ...item })) };
  },
});

export const publish = mutation({
  args: { menuId: v.id("menus"), slug: v.string(), name: v.string(), reviewed: v.boolean() },
  returns: v.id("publicMenus"),
  handler: async (ctx, args) => {
    const menu = await ctx.db.get(args.menuId);
    if (!menu) throw new ConvexError("Menu not found.");
    await requireOrganization(ctx, menu.organizationId);
    if (!args.reviewed || menu.status !== "draft") throw new ConvexError("Review the completed menu before publishing.");
    const slug = boundedText(args.slug, "Slug", 64).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ConvexError("Use lowercase letters, numbers and hyphens.");
    const existing = await ctx.db.query("publicMenus").withIndex("by_slug", q => q.eq("slug", slug)).unique();
    if (existing && (existing.organizationId !== menu.organizationId || existing.menuId !== menu._id)) throw new ConvexError("This address is already used.");
    const products = await ctx.db.query("products").withIndex("by_organizationId_and_menuId", q => q.eq("organizationId", menu.organizationId).eq("menuId", menu._id)).take(251);
    if (!products.length || products.length > 250) throw new ConvexError("Publish between 1 and 250 products.");
    const values = { organizationId: menu.organizationId, menuId: menu._id, slug, name: boundedText(args.name, "Name", 100), published: true, demo: false };
    const id = existing?._id ?? await ctx.db.insert("publicMenus", values);
    if (existing) {
      await ctx.db.patch(id, { name: values.name, published: true });
      for (const item of await ctx.db.query("publicMenuItems").withIndex("by_menu", q => q.eq("publicMenuId", id)).take(251)) await ctx.db.delete(item._id);
    }
    for (const product of products) {
      if (product.activeJobId || (product.cardId && product.acceptedCardId !== product.cardId)) throw new ConvexError("Apply the latest generated cards before publishing.");
      const category = await ctx.db.get(product.categoryId);
      const card = product.cardId ? await ctx.db.get(product.cardId) : null;
      const file = card?.imageFileId ? await ctx.db.get(card.imageFileId) : null;
      const imageUrl = file?.organizationId === menu.organizationId ? await ctx.storage.getUrl(file.storageId) : null;
      const flags = product.confirmed;
      const tags = [flags.vegan && "Vegan", flags.spicy && "Spicy", flags.served_hot && "Served hot", flags.low_calorie && "Light", flags.kids_menu && "Kids", flags.takeaway && "Takeaway"].filter((x): x is string => !!x);
      await ctx.db.insert("publicMenuItems", { publicMenuId: id, name: product.name, description: product.description ?? "", category: category?.name ?? "Menu", price: product.price, currency: product.currency ?? "RSD", portion: product.portion ?? "", tags, ingredients: flags.ingredients ?? [], allergens: flags.allergens ?? [], allergensComplete: flags.allergens_complete === true, imageUrl });
    }
    await invalidateMenuPdf(ctx, menu._id);
    return id;
  },
});
export const unpublish = mutation({
  args: { slug: v.string() }, returns: v.null(),
  handler: async (ctx, { slug }) => {
    const menu = await ctx.db.query("publicMenus").withIndex("by_slug", q => q.eq("slug", slug)).unique();
    if (!menu) throw new ConvexError("Menu not found.");
    await requireOrganization(ctx, menu.organizationId);
    await ctx.db.patch(menu._id, { published: false });
    await invalidateMenuPdf(ctx, menu.menuId);
    return null;
  },
});

export const publications = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    return ctx.db.query("publicMenus").withIndex("by_organizationId", q => q.eq("organizationId", organizationId)).take(100);
  },
});

export const readiness = query({
  args: { menuId: v.id("menus") },
  handler: async (ctx, { menuId }) => {
    const menu = await ctx.db.get(menuId);
    if (!menu) throw new ConvexError("Menu not found.");
    await requireOrganization(ctx, menu.organizationId);
    const products = await ctx.db.query("products").withIndex("by_organizationId_and_menuId", q => q.eq("organizationId", menu.organizationId).eq("menuId", menuId)).take(251);
    return {
      blockers: products.filter(p => p.activeJobId || (p.cardId && p.acceptedCardId !== p.cardId)).map(p => ({ productId: p._id, name: p.name, reason: p.activeJobId ? "generating" as const : "review" as const })),
      menuError: menu.status !== "draft" ? "Wait for the menu import to finish." : !products.length ? "Add dishes before publishing." : products.length > 250 ? "A published menu can contain up to 250 dishes." : null,
    };
  },
});
