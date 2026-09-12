import { internalAction, internalQuery } from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
export const existing = internalQuery({
  args: {},
  handler: async (ctx) =>
    ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", "admin"),
      )
      .unique(),
});
export const seed = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    if (await ctx.runQuery(internal.bootstrap.existing, {}))
      return "Admin already exists; credentials unchanged.";
    await createAccount(ctx, {
      provider: "password",
      account: { id: "admin", secret: "123" },
      profile: { email: "admin", name: "SpaceX Food Demo" },
    });
    return "Created SpaceX Food Demo and its admin account.";
  },
});
