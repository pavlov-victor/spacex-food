import { v } from "convex/values";
export const confirmed = v.object({
  ingredients: v.optional(v.array(v.string())),
  allergens: v.optional(v.array(v.string())),
  allergens_complete: v.optional(v.boolean()),
  served_hot: v.optional(v.boolean()),
  vegan: v.optional(v.boolean()),
  spicy: v.optional(v.boolean()),
  low_calorie: v.optional(v.boolean()),
  kids_menu: v.optional(v.boolean()),
  takeaway: v.optional(v.boolean()),
});
export const jobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("partial"),
  v.literal("failed"),
);
export const jobInput = v.object({
  fileIds: v.optional(v.array(v.id("files"))),
  productJson: v.optional(v.string()),
  tableFileId: v.optional(v.id("files")),
  dishFileId: v.optional(v.id("files")),
  restaurantContext: v.optional(v.string()),
  imagePrompt: v.optional(v.string()),
  targetLanguages: v.optional(v.string()),
});
export const importedCategory = v.object({ id: v.string(), name: v.string() });
export const importedProduct = v.object({
  sourceId: v.string(),
  categorySourceId: v.string(),
  name: v.string(),
  description: v.union(v.string(), v.null()),
  price: v.union(v.number(), v.null()),
  currency: v.union(v.string(), v.null()),
  portion: v.union(v.string(), v.null()),
  sourceJson: v.string(),
  needsReview: v.boolean(),
});
