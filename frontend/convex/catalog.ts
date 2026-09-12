import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requireOrganization, boundedText } from "./lib/access";
import { confirmed } from "./validators";
export const menus = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    return ctx.db
      .query("menus")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(100);
  },
});
export const categories = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    return ctx.db
      .query("categories")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(500);
  },
});
export const products = query({
  args: {
    organizationId: v.id("organizations"),
    menuId: v.optional(v.id("menus")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const result = args.menuId
      ? await ctx.db
          .query("products")
          .withIndex("by_organizationId_and_menuId", (q) =>
            q
              .eq("organizationId", args.organizationId)
              .eq("menuId", args.menuId),
          )
          .order("desc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("products")
          .withIndex("by_organizationId", (q) =>
            q.eq("organizationId", args.organizationId),
          )
          .order("desc")
          .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (p) => {
          const category = await ctx.db.get(p.categoryId);
          return { ...p, category: category?.name ?? "" };
        }),
      ),
    };
  },
});
export const product = query({
  args: { organizationId: v.id("organizations"), productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== args.organizationId)
      throw new Error("Product not found.");
    const card = product.cardId ? await ctx.db.get(product.cardId) : null;
    const file = card?.imageFileId ? await ctx.db.get(card.imageFileId) : null;
    return {
      ...product,
      card: card
        ? {
            ...card,
            imageUrl: file ? await ctx.storage.getUrl(file.storageId) : null,
          }
        : null,
    };
  },
});
export const createProduct = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    category: v.string(),
    price: v.union(v.number(), v.null()),
    description: v.string(),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const name = boundedText(args.name, "Product name", 120),
      categoryName = boundedText(args.category, "Category", 80);
    if (args.price !== null && (!Number.isFinite(args.price) || args.price < 0))
      throw new Error("Invalid price.");
    if (args.description.length > 5000)
      throw new Error("Description is too long.");
    const key = categoryName.toLocaleLowerCase();
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_organizationId_and_key", (q) =>
        q.eq("organizationId", args.organizationId).eq("key", key),
      )
      .unique();
    const categoryId =
      existing?._id ??
      (await ctx.db.insert("categories", {
        organizationId: args.organizationId,
        name: categoryName,
        key,
      }));
    return ctx.db.insert("products", {
      organizationId: args.organizationId,
      categoryId,
      name,
      description: args.description || null,
      price: args.price,
      currency: args.currency ?? null,
      portion: null,
      sourceJson: "{}",
      confirmed: {},
      needsReview: true,
    });
  },
});
export const updateProduct = mutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    price: v.optional(v.union(v.number(), v.null())),
    currency: v.optional(v.union(v.string(), v.null())),
    portion: v.optional(v.union(v.string(), v.null())),
    confirmed: v.optional(confirmed),
  },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== args.organizationId)
      throw new Error("Product not found.");
    const { organizationId: _, productId, ...patch } = args;
    if (patch.name !== undefined)
      patch.name = boundedText(patch.name, "Product name", 120);
    if (
      patch.price !== undefined &&
      patch.price !== null &&
      (!Number.isFinite(patch.price) || patch.price < 0)
    )
      throw new Error("Invalid price.");
    if (JSON.stringify(patch).length > 18000)
      throw new Error("Product details are too long.");
    await ctx.db.patch(productId, { ...patch, needsReview: true });
    return null;
  },
});
