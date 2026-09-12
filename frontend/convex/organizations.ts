import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  requireUser,
  requireOrganization,
  boundedText,
  requireFile,
} from "./lib/access";
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);
    return Promise.all(
      memberships.map(async (member) => {
        const org = await ctx.db.get(member.organizationId);
        if (!org) throw new Error("Organization not found.");
        const file = org.tableFileId ? await ctx.db.get(org.tableFileId) : null;
        return {
          ...org,
          tableImageUrl: file ? await ctx.storage.getUrl(file.storageId) : null,
        };
      }),
    );
  },
});
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const organizationId = await ctx.db.insert("organizations", {
      name: boundedText(args.name, "Organization name", 120),
      ownerUserId: userId,
      context: "",
    });
    await ctx.db.insert("memberships", {
      organizationId,
      userId,
      role: "admin",
    });
    return organizationId;
  },
});
export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    context: v.optional(v.string()),
    tableFileId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    if (args.context && args.context.length > 5000)
      throw new Error("Restaurant context is too long.");
    if (args.tableFileId)
      await requireFile(ctx, args.organizationId, args.tableFileId, "table");
    const { organizationId, ...updates } = args;
    if (updates.name !== undefined)
      updates.name = boundedText(updates.name, "Organization name", 120);
    await ctx.db.patch(organizationId, updates);
    return null;
  },
});
export const access = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: requireOrganizationArgs,
});
async function requireOrganizationArgs(
  ctx: Parameters<typeof requireOrganization>[0],
  args: { organizationId: Parameters<typeof requireOrganization>[1] },
) {
  return requireOrganization(ctx, args.organizationId);
}
