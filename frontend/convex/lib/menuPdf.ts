import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/** Transactional event hook. Revisions coalesce edits and fence late workers. */
export async function invalidateMenuPdf(ctx: MutationCtx, menuId?: Id<"menus">) {
  if (!menuId) return;
  const menu = await ctx.db.get(menuId);
  if (!menu || menu.status !== "draft") return;
  const revision = (menu.pdfRevision ?? 0) + 1;
  await ctx.db.patch(menuId, { pdfRevision: revision, pdfStatus: "queued", pdfError: undefined });
  await ctx.scheduler.runAfter(3000, internal.menuPdf.render, { menuId, revision });
}
