import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const username =
          typeof params.username === "string"
            ? params.username.trim().toLowerCase()
            : "";
        if (!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(username))
          throw new ConvexError(
            "Login must contain 3–64 letters, numbers, dots, underscores or hyphens.",
          );
        if (params.flow === "signUp" && username === "admin")
          throw new ConvexError("This login is reserved.");
        const name =
          typeof params.organizationName === "string"
            ? params.organizationName.trim()
            : "";
        if (params.flow === "signUp" && (!name || name.length > 120))
          throw new ConvexError(
            "Enter an organization name (up to 120 characters).",
          );
        return { email: username, ...(name ? { name } : {}) };
      },
      validatePasswordRequirements(password) {
        if (
          typeof password !== "string" ||
          password.length < 8 ||
          password.length > 128
        )
          throw new ConvexError("New passwords must contain 8–128 characters.");
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(rawCtx, args) {
      if (args.existingUserId) return;
      const ctx = rawCtx as MutationCtx;
      const name =
        typeof args.profile.name === "string"
          ? args.profile.name
          : "My restaurant";
      const organizationId = await ctx.db.insert("organizations", {
        name,
        ownerUserId: args.userId,
        context: "",
      });
      await ctx.db.insert("memberships", {
        organizationId,
        userId: args.userId,
        role: "admin",
      });
    },
  },
});
