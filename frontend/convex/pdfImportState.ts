import type { Id } from "./_generated/dataModel";
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFile } from "./lib/access";
export const sources = internalQuery({
  args: { jobId: v.id("jobs"), attempt: v.number() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.kind !== "menu" || job.status !== "running" || job.attempt !== args.attempt) throw new Error("Import attempt is no longer active.");
    const sources = await Promise.all((job.input.fileIds ?? []).map(async id => {
      const file = await requireFile(ctx, job.organizationId, id, "menu");
      const url = await ctx.storage.getUrl(file.storageId);
      if (!url) throw new Error("Source file is unavailable.");
      return { ...file, url };
    }));
    return { sources, prepared: job.preparedFileIds };
  },
});
export const save = internalMutation({
  args: {
    jobId: v.id("jobs"), attempt: v.number(),
    pages: v.array(v.object({storageId: v.id("_storage"), name: v.string(), size: v.number()})),
    ordered: v.array(v.union(v.object({fileId: v.id("files")}), v.object({page: v.number()}))),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "running" || job.attempt !== args.attempt) throw new Error("Import attempt is no longer active.");
    if (job.preparedFileIds) {
      for (const p of args.pages) await ctx.storage.delete(p.storageId);
      return job.preparedFileIds;
    }
    if (args.ordered.length < 1 || args.ordered.length > 5) throw new Error("Use 1–5 pages/images.");
    const ids: Id<"files">[] = [];
    for (const p of args.pages) ids.push(await ctx.db.insert("files", {
      ...p, organizationId: job.organizationId, kind: "menu", contentType: "image/png",
    }));
    const preparedFileIds = args.ordered.map(p => "fileId" in p ? p.fileId : ids[p.page]);
    await ctx.db.patch(job._id, { preparedFileIds });
    return preparedFileIds;
  },
});
