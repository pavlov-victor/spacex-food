import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { confirmed, jobInput, jobStatus } from "./validators";

import { storefrontTables } from "./storefrontSchema";

export default defineSchema({
  ...storefrontTables,
  ...authTables,
  organizations: defineTable({
    name: v.string(),
    ownerUserId: v.id("users"),
    context: v.string(),
    tableFileId: v.optional(v.id("files")),
  }),
  memberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.literal("admin"),
  })
    .index("by_userId", ["userId"])
    .index("by_organizationId_and_userId", ["organizationId", "userId"]),
  files: defineTable({
    organizationId: v.id("organizations"),
    storageId: v.id("_storage"),
    kind: v.union(
      v.literal("menu"),
      v.literal("table"),
      v.literal("dish"),
      v.literal("generated"),
    ),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
  }).index("by_organizationId", ["organizationId"]),
  menus: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("draft"),
      v.literal("failed"),
    ),
    pdfRevision: v.optional(v.number()),
    pdfGeneratedRevision: v.optional(v.number()),
    pdfStatus: v.optional(v.union(v.literal("queued"), v.literal("running"), v.literal("succeeded"), v.literal("failed"))),
    pdfError: v.optional(v.string()),
    pdfStorageId: v.optional(v.id("_storage")),
    pdfPreviewStorageId: v.optional(v.id("_storage")),
    pdfUpdatedAt: v.optional(v.number()),
    fileIds: v.array(v.id("files")),
    warnings: v.array(v.string()),
    productCount: v.number(),
  }).index("by_organizationId", ["organizationId"]),
  categories: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    key: v.string(),
  })
    .index("by_organizationId_and_key", ["organizationId", "key"])
    .index("by_organizationId", ["organizationId"]),
  products: defineTable({
    organizationId: v.id("organizations"),
    menuId: v.optional(v.id("menus")),
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    price: v.union(v.number(), v.null()),
    currency: v.union(v.string(), v.null()),
    portion: v.union(v.string(), v.null()),
    sourceJson: v.string(),
    confirmed,
    needsReview: v.boolean(),
    originalName: v.optional(v.string()),
    acceptedCardId: v.optional(v.id("cards")),
    cardId: v.optional(v.id("cards")),
    activeJobId: v.optional(v.id("jobs")),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_and_menuId", ["organizationId", "menuId"]),
  cards: defineTable({
    organizationId: v.id("organizations"),
    productId: v.id("products"),
    jobId: v.id("jobs"),
    draftJson: v.string(),
    imageFileId: v.optional(v.id("files")),
    warnings: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("partial")),
  }).index("by_organizationId_and_productId", ["organizationId", "productId"]),
  jobs: defineTable({
    organizationId: v.id("organizations"),
    requestedBy: v.id("users"),
    requestId: v.string(),
    kind: v.union(v.literal("menu"), v.literal("product")),
    menuId: v.optional(v.id("menus")),
    productId: v.optional(v.id("products")),
    status: jobStatus,
    input: jobInput,
    attempt: v.number(),
    error: v.optional(v.string()),
    preparedFileIds: v.optional(v.array(v.id("files"))),
    workflowRunId: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_and_requestId", ["organizationId", "requestId"]),
});
