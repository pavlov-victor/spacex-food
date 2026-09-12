import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrganization, requireFile, boundedText } from "./lib/access";
import type { Id } from "./_generated/dataModel";
const kind = v.union(v.literal("menu"), v.literal("table"), v.literal("dish"));
export const upload = action({
  args: {
    organizationId: v.id("organizations"),
    kind,
    name: v.string(),
    contentType: v.string(),
    bytes: v.bytes(),
  },
  handler: async (ctx, args): Promise<Id<"files">> => {
    await ctx.runQuery(internal.organizations.access, {
      organizationId: args.organizationId,
    });
    const name = boundedText(args.name, "Filename", 200);
    const bytes = new Uint8Array(args.bytes);
    if (!bytes.length || bytes.length > 10 * 1024 * 1024)
      throw new Error("File must be between 1 byte and 10 MB.");
    const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png =
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    if (!(
      (args.contentType === "image/jpeg" && jpeg) ||
      (args.contentType === "image/png" && png) ||
      (args.kind === "menu" && args.contentType === "application/pdf" && pdf)
    ))
      throw new Error("Upload JPG/PNG, or a PDF for menu import.");
    const storageId = await ctx.storage.store(
      new Blob([args.bytes], { type: args.contentType }),
    );
    try {
      return await ctx.runMutation(internal.files.record, {
        organizationId: args.organizationId,
        storageId,
        kind: args.kind,
        name,
        contentType: args.contentType,
        size: bytes.length,
      });
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
  },
});
export const record = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    storageId: v.id("_storage"),
    kind: v.union(kind, v.literal("generated")),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("files", args);
    if (args.kind === "table")
      await ctx.db.patch(args.organizationId, { tableFileId: id });
    return id;
  },
});
export const url = query({
  args: { organizationId: v.id("organizations"), fileId: v.id("files") },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const file = await requireFile(ctx, args.organizationId, args.fileId);
    return ctx.storage.getUrl(file.storageId);
  },
});
