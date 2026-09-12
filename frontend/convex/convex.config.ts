import { defineApp } from "convex/server";
import { v } from "convex/values";
export default defineApp({
  env: {
    DAYTONA_API_KEY: v.optional(v.string()),
    DAYTONA_SNAPSHOT: v.optional(v.string()),
    PUBLIC_APP_URL: v.optional(v.string()),
    DIFY_API_URL: v.optional(v.string()),
    DIFY_MENU_API: v.optional(v.string()),
    DIFY_PERSON_API: v.optional(v.string()),
  },
});
