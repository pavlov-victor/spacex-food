import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireOrganization, requireFile, boundedText } from "./lib/access";
import { importedCategory, importedProduct, confirmed } from "./validators";
import type { Id } from "./_generated/dataModel";
export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const rows = await ctx.db
      .query("jobs")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(100);
    return rows.map(({ input, ...job }) => {
      void input;
      return job;
    });
  },
});
export const get = query({
  args: { organizationId: v.id("organizations"), jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== args.organizationId)
      throw new Error("Job not found.");
    const { input: _, ...result } = job;
    return result;
  },
});
export const importMenu = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    fileIds: v.array(v.id("files")),
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrganization(ctx, args.organizationId);
    boundedText(args.requestId, "Request ID", 100);
    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_organizationId_and_requestId", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("requestId", args.requestId),
      )
      .unique();
    if (existing) {
      if (existing.kind !== "menu") throw new Error("Request ID already used.");
      return existing._id;
    }
    if (args.fileIds.length < 1 || args.fileIds.length > 5)
      throw new Error("Choose 1–5 menu photos.");
    for (const id of args.fileIds)
      await requireFile(ctx, args.organizationId, id, "menu");
    const menuId = await ctx.db.insert("menus", {
      organizationId: args.organizationId,
      name: boundedText(args.name, "Menu name", 120),
      status: "processing",
      fileIds: args.fileIds,
      warnings: [],
      productCount: 0,
    });
    const jobId = await ctx.db.insert("jobs", {
      organizationId: args.organizationId,
      requestedBy: userId,
      requestId: args.requestId,
      kind: "menu",
      menuId,
      status: "queued",
      input: { fileIds: args.fileIds },
      attempt: 0,
    });
    await ctx.scheduler.runAfter(0, internal.workflows.run, { jobId });
    return jobId;
  },
});
export const generateCard = mutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("products"),
    requestId: v.string(),
    dishFileId: v.optional(v.id("files")),
    imagePrompt: v.optional(v.string()),
    restaurantContext: v.optional(v.string()),
    targetLanguages: v.optional(v.string()),
    confirmed: v.optional(confirmed),
  },
  handler: async (ctx, args) => {
    const { userId, organization } = await requireOrganization(
      ctx,
      args.organizationId,
    );
    boundedText(args.requestId, "Request ID", 100);
    const existing = await ctx.db
      .query("jobs")
      .withIndex("by_organizationId_and_requestId", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("requestId", args.requestId),
      )
      .unique();
    if (existing) {
      if (existing.kind !== "product" || existing.productId !== args.productId)
        throw new Error("Request ID already used.");
      return existing._id;
    }
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== args.organizationId)
      throw new Error("Product not found.");
    if (product.activeJobId)
      throw new Error("This product already has an active generation.");
    if (args.dishFileId)
      await requireFile(ctx, args.organizationId, args.dishFileId, "dish");
    if (organization.tableFileId)
      await requireFile(
        ctx,
        args.organizationId,
        organization.tableFileId,
        "table",
      );
    const category = await ctx.db.get(product.categoryId);
    const evidence = args.confirmed ?? product.confirmed;
    const source = JSON.parse(product.sourceJson) as Record<string, unknown>;
    const productJson = JSON.stringify({
      ...source,
      id: product._id,
      name: product.name,
      category_id: product.categoryId,
      category_name: category?.name ?? "",
      description: product.description,
      price: product.price,
      currency: product.currency,
      portion: product.portion,
      confirmed: evidence,
    });
    const context = [organization.context, args.restaurantContext ?? ""]
      .filter(Boolean)
      .join("\n");
    const languages = args.targetLanguages ?? "sr,en,ru";
    if (
      productJson.length > 20000 ||
      context.length > 5000 ||
      (args.imagePrompt?.length ?? 0) > 2000 ||
      !/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?(?:,[a-z]{2,3}(?:-[A-Za-z]{2,4})?){0,5}$/.test(
        languages,
      )
    )
      throw new Error("Invalid or oversized generation inputs.");
    const jobId = await ctx.db.insert("jobs", {
      organizationId: args.organizationId,
      requestedBy: userId,
      requestId: args.requestId,
      kind: "product",
      productId: args.productId,
      status: "queued",
      attempt: 0,
      input: {
        productJson,
        tableFileId: organization.tableFileId,
        dishFileId: args.dishFileId,
        restaurantContext: context,
        imagePrompt: args.imagePrompt ?? "",
        targetLanguages: languages,
      },
    });
    await ctx.db.patch(product._id, {
      activeJobId: jobId,
      confirmed: evidence,
    });
    await ctx.scheduler.runAfter(0, internal.workflows.run, { jobId });
    return jobId;
  },
});
export const retry = mutation({
  args: { organizationId: v.id("organizations"), jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const job = await ctx.db.get(args.jobId);
    if (
      !job ||
      job.organizationId !== args.organizationId ||
      job.status !== "failed"
    )
      throw new Error("Only failed jobs can be retried.");
    if (job.productId) {
      const p = await ctx.db.get(job.productId);
      if (!p || p.activeJobId)
        throw new Error("Product unavailable or already processing.");
      await ctx.db.patch(p._id, { activeJobId: job._id });
    }
    if (job.menuId) await ctx.db.patch(job.menuId, { status: "processing" });
    await ctx.db.patch(job._id, {
      status: "queued",
      error: undefined,
      finishedAt: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.workflows.run, { jobId: job._id });
    return job._id;
  },
});
export const claim = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "queued") return null;
    const attempt = job.attempt + 1;
    await ctx.db.patch(job._id, {
      status: "running",
      attempt,
      startedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(9 * 60 * 1000, internal.jobs.fail, {
      jobId: job._id,
      attempt,
      error: "Workflow timed out. You can retry the job.",
    });
    return { ...job, attempt };
  },
});
export const fileUrl = internalQuery({
  args: { organizationId: v.id("organizations"), fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await requireFile(ctx, args.organizationId, args.fileId);
    const url = await ctx.storage.getUrl(file.storageId);
    if (!url) throw new Error("Source image no longer exists.");
    return url;
  },
});
export const fail = internalMutation({
  args: { jobId: v.id("jobs"), attempt: v.number(), error: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "running" || job.attempt !== args.attempt)
      return null;
    await ctx.db.patch(job._id, {
      status: "failed",
      error: args.error.slice(0, 1000),
      finishedAt: Date.now(),
    });
    if (job.menuId) await ctx.db.patch(job.menuId, { status: "failed" });
    if (job.productId) {
      const p = await ctx.db.get(job.productId);
      if (p?.activeJobId === job._id)
        await ctx.db.patch(p._id, { activeJobId: undefined });
    }
    return null;
  },
});
export const finishMenu = internalMutation({
  args: {
    jobId: v.id("jobs"),
    attempt: v.number(),
    categories: v.array(importedCategory),
    products: v.array(importedProduct),
    warnings: v.array(v.string()),
    workflowRunId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (
      !job ||
      job.status !== "running" ||
      job.attempt !== args.attempt ||
      !job.menuId
    )
      return null;
    const ids = new Map<string, Id<"categories">>();
    for (const category of args.categories) {
      const key = category.name.trim().toLocaleLowerCase();
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_organizationId_and_key", (q) =>
          q.eq("organizationId", job.organizationId).eq("key", key),
        )
        .unique();
      const id =
        existing?._id ??
        (await ctx.db.insert("categories", {
          organizationId: job.organizationId,
          name: category.name,
          key,
        }));
      ids.set(category.id, id);
    }
    for (const p of args.products) {
      const categoryId = ids.get(p.categorySourceId);
      if (!categoryId) throw new Error("Unknown category in extraction.");
      await ctx.db.insert("products", {
        organizationId: job.organizationId,
        menuId: job.menuId,
        categoryId,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        portion: p.portion,
        sourceJson: p.sourceJson,
        confirmed: {},
        needsReview: true,
      });
    }
    await ctx.db.patch(job.menuId, {
      status: "draft",
      productCount: args.products.length,
      warnings: args.warnings,
    });
    await ctx.db.patch(job._id, {
      status: "succeeded",
      workflowRunId: args.workflowRunId,
      finishedAt: Date.now(),
    });
    return null;
  },
});
export const finishCard = internalMutation({
  args: {
    jobId: v.id("jobs"),
    attempt: v.number(),
    draftJson: v.string(),
    warnings: v.array(v.string()),
    imageFileId: v.optional(v.id("files")),
    partial: v.boolean(),
    workflowRunId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (
      !job ||
      job.status !== "running" ||
      job.attempt !== args.attempt ||
      !job.productId
    )
      return null;
    const cardId = await ctx.db.insert("cards", {
      organizationId: job.organizationId,
      productId: job.productId,
      jobId: job._id,
      draftJson: args.draftJson,
      warnings: args.warnings,
      imageFileId: args.imageFileId,
      status: args.partial ? "partial" : "draft",
    });
    await ctx.db.patch(job.productId, {
      cardId,
      activeJobId: undefined,
      needsReview: true,
    });
    await ctx.db.patch(job._id, {
      status: args.partial ? "partial" : "succeeded",
      workflowRunId: args.workflowRunId,
      finishedAt: Date.now(),
    });
    return null;
  },
});

export const rememberRun = internalMutation({
  args: { jobId: v.id("jobs"), attempt: v.number(), workflowRunId: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (
      job &&
      job.attempt === args.attempt &&
      (job.status === "running" || job.status === "failed")
    )
      await ctx.db.patch(job._id, { workflowRunId: args.workflowRunId });
    return null;
  },
});
