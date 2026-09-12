import { defineApp } from "convex/server";
import { v } from "convex/values";
export default defineApp({
  env: {
    DIFY_API_URL: v.optional(v.string()),
    DIFY_MENU_API: v.optional(v.string()),
    DIFY_PERSON_API: v.optional(v.string()),
  },
});
