import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Sign in to continue.");
  return userId;
}
export async function requireOrganization(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
) {
  const userId = await requireUser(ctx);
  const member = await ctx.db
    .query("memberships")
    .withIndex("by_organizationId_and_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", userId),
    )
    .unique();
  if (!member) throw new ConvexError("Organization access denied.");
  const organization = await ctx.db.get(organizationId);
  if (!organization) throw new ConvexError("Organization not found.");
  return { userId, organization };
}
export function boundedText(value: string, label: string, max: number) {
  const text = value.trim();
  if (!text || text.length > max)
    throw new ConvexError(`${label} must contain 1–${max} characters.`);
  return text;
}
export async function requireFile(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  fileId: Id<"files">,
  kind?: string,
) {
  const file = await ctx.db.get(fileId);
  if (
    !file ||
    file.organizationId !== organizationId ||
    (kind && file.kind !== kind)
  )
    throw new ConvexError("File access denied or wrong file type.");
  return file;
}
