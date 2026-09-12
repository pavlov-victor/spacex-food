"use node";
import { Buffer } from "node:buffer";
import { internalAction, env } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { withPdfSandbox, runPdfTask } from "./lib/daytona";
import type { Id } from "./_generated/dataModel";

export const render = internalAction({
  args: { menuId: v.id("menus"), revision: v.number() },
  handler: async (ctx, args): Promise<null> => {
    if (!await ctx.runMutation(internal.menuPdfState.claim, args)) return null;
    const stored: Id<"_storage">[] = [];
    try {
      const input = await ctx.runQuery(internal.menuPdfState.snapshot, args);
      if (!input) return null;
      await withPdfSandbox({ apiKey: env.DAYTONA_API_KEY, snapshot: env.DAYTONA_SNAPSHOT }, async sandbox => {
        await runPdfTask(sandbox, input);
        for (const [name, type] of [["menu.pdf", "application/pdf"], ["preview.png", "image/png"]]) {
          const bytes = await sandbox.fs.downloadFile(`output/${name}`);
          stored.push(await ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })));
        }
      });
      await ctx.runMutation(internal.menuPdfState.finish, { ...args, pdfStorageId: stored[0], previewStorageId: stored[1] });
    } catch (error) {
      for (const id of stored) await ctx.storage.delete(id).catch(() => undefined);
      // SDK exceptions can carry request headers. Never persist them.
      const message = !env.DAYTONA_API_KEY ? "Configure DAYTONA_API_KEY on the Convex deployment." : "PDF generation failed. Retry generation or check the Daytona configuration.";
      void error;
      await ctx.runMutation(internal.menuPdfState.fail, { ...args, error: message });
    }
    return null;
  },
});

export const prepareImport = internalAction({
  args: { jobId: v.id("jobs"), attempt: v.number() },
  handler: async (ctx, args): Promise<Id<"files">[]> => {
    const input = await ctx.runQuery(internal.pdfImportState.sources, args);
    if (input.prepared) return input.prepared;
    if (!input.sources.some(f => f.contentType === "application/pdf")) return input.sources.map(f => f._id);
    const pages: {storageId: Id<"_storage">; name: string; size: number}[] = [];
    const ordered: ({ fileId: Id<"files"> } | { page: number })[] = [];
    try {
      // One sandbox per PDF prevents files from a preceding PDF leaking into the manifest.
      for (const source of input.sources) {
        if (source.contentType !== "application/pdf") { ordered.push({ fileId: source._id }); continue; }
        await withPdfSandbox({ apiKey: env.DAYTONA_API_KEY, snapshot: env.DAYTONA_SNAPSHOT }, async sandbox => {
          const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error("Cannot download source PDF.");
          const bytes = await response.arrayBuffer();
          if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("PDF exceeds 10 MB.");
          await sandbox.fs.uploadFile(Buffer.from(bytes), "source.pdf");
          const manifest = await runPdfTask(sandbox, { task: "split", limit: 5 - ordered.length });
          for (const name of manifest) {
            const bytes = await sandbox.fs.downloadFile(`output/${name}`);
            if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Rendered page exceeds 10 MB.");
            const storageId = await ctx.storage.store(new Blob([new Uint8Array(bytes)], {type: "image/png"}));
            ordered.push({ page: pages.length });
            pages.push({ storageId, name: `${source.name}-${name}`, size: bytes.length });
          }
        });
      }
      if (ordered.length > 5) throw new Error("Use at most 5 pages/images per menu import.");
      return await ctx.runMutation(internal.pdfImportState.save, { ...args, pages, ordered });
    } catch (error) {
      for (const page of pages) await ctx.storage.delete(page.storageId).catch(() => undefined);
      if (!env.DAYTONA_API_KEY) throw new Error("Configure DAYTONA_API_KEY on the Convex deployment.");
      void error;
      throw new Error("PDF preparation failed. Use an unencrypted PDF; at most 5 pages/images per import. Check Daytona configuration if the PDF meets these limits.");
    }
  },
});
