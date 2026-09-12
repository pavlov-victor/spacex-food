import { defineTable } from "convex/server";
import { v } from "convex/values";
export const publicItem = {
  name: v.string(), description: v.string(), category: v.string(),
  price: v.union(v.number(), v.null()), currency: v.string(), portion: v.string(),
  tags: v.array(v.string()), ingredients: v.array(v.string()), allergens: v.array(v.string()),
  allergensComplete: v.boolean(), imageUrl: v.union(v.string(), v.null()),
};
export const storefrontTables = {
  publicMenus: defineTable({ organizationId: v.id("organizations"), menuId: v.id("menus"), slug: v.string(), name: v.string(), published: v.boolean(), demo: v.boolean() }).index("by_slug", ["slug"]).index("by_organizationId", ["organizationId"]),
  publicMenuItems: defineTable({ publicMenuId: v.id("publicMenus"), ...publicItem }).index("by_menu", ["publicMenuId"]),
};
