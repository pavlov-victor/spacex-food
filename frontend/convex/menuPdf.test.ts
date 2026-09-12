/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
async function setup() {
  vi.useFakeTimers();
  const t = convexTest(schema, modules);
  const user = await t.run(ctx => ctx.db.insert("users", { name: "PDF Owner" }));
  const owner = t.withIdentity({ subject: `${user}|session` });
  const organizationId = await owner.mutation(api.organizations.create, { name: "Kafana" });
  const menuId = await t.run(ctx => ctx.db.insert("menus", { organizationId, name: "Menu", status: "draft", fileIds: [], warnings: [], productCount: 0 }));
  return { t, owner, organizationId, menuId };
}
test("product edits coalesce; old worker cannot replace latest PDF", async () => {
  const {t, owner, organizationId, menuId} = await setup();
  const productId = await owner.mutation(api.catalog.createProduct, { organizationId, menuId, name: "Karađorđeva", category: "Main", price: 1200, description: "" });
  expect(await t.mutation(internal.menuPdfState.claim, {menuId, revision: 1})).toBe(true);
  await owner.mutation(api.catalog.updateProduct, { organizationId, productId, price: 1400 });
  const staleFiles = await t.run(async ctx => [await ctx.storage.store(new Blob(["old PDF"])), await ctx.storage.store(new Blob(["old preview"]))]);
  await t.mutation(internal.menuPdfState.finish, {menuId, revision:1, pdfStorageId:staleFiles[0], previewStorageId:staleFiles[1]});
  expect(await t.run(ctx => ctx.storage.get(staleFiles[0]))).toBeNull();
  expect((await owner.query(api.menuPdfState.status, {menuId}))?.status).toBe("queued");
  expect(await t.mutation(internal.menuPdfState.claim, {menuId, revision:1})).toBe(false);
  expect(await t.mutation(internal.menuPdfState.claim, {menuId, revision:2})).toBe(true);
  expect((await t.query(internal.menuPdfState.snapshot, {menuId, revision:2}))?.items[0].price).toBe(1400);
  const files = await t.run(async ctx => [await ctx.storage.store(new Blob(["new PDF"])), await ctx.storage.store(new Blob(["new preview"]))]);
  await t.mutation(internal.menuPdfState.finish, {menuId, revision:2, pdfStorageId:files[0], previewStorageId:files[1]});
  await t.mutation(internal.menuPdfState.fail, {menuId, revision:1, error:"Old timeout"});
  expect((await owner.query(api.menuPdfState.status, {menuId}))?.isStale).toBe(false);
  await owner.mutation(api.catalog.deleteProduct, {organizationId, productId});
  expect((await owner.query(api.menuPdfState.status, {menuId}))?.revision).toBe(3);
});
test("failed regeneration preserves previous download and can be retried", async () => {
  const {t, owner, menuId} = await setup();
  await owner.mutation(api.menuPdfState.regenerate, {menuId});
  await t.mutation(internal.menuPdfState.claim, {menuId, revision:1});
  const files = await t.run(async ctx => [await ctx.storage.store(new Blob(["pdf"])), await ctx.storage.store(new Blob(["png"]))]);
  await t.mutation(internal.menuPdfState.finish, {menuId, revision:1, pdfStorageId:files[0], previewStorageId:files[1]});
  await owner.mutation(api.catalog.renameMenu, {menuId, name:"Dinner"});
  await t.mutation(internal.menuPdfState.claim, {menuId, revision:2});
  await t.mutation(internal.menuPdfState.fail, {menuId, revision:2, error:"Unavailable"});
  const state = await owner.query(api.menuPdfState.status, {menuId});
  expect(state?.status).toBe("failed"); expect(state?.pdfUrl).toBeTruthy(); expect(state?.isStale).toBe(true);
  await owner.mutation(api.menuPdfState.regenerate, {menuId});
  expect((await owner.query(api.menuPdfState.status, {menuId}))?.status).toBe("queued");
});
test("print state and regeneration are private to organization members", async () => {
  const {t, menuId} = await setup();
  const otherId = await t.run(ctx => ctx.db.insert("users", {name:"Other"}));
  const other = t.withIdentity({subject:`${otherId}|session`});
  await expect(other.query(api.menuPdfState.status, {menuId})).rejects.toThrow();
  await expect(other.mutation(api.menuPdfState.regenerate, {menuId})).rejects.toThrow();
});
test("PDF upload is accepted only as menu and validates signature", async () => {
  const {owner, organizationId} = await setup();
  const bytes = new TextEncoder().encode("%PDF-1.7\nfixture").buffer;
  expect(await owner.action(api.files.upload, {organizationId, kind:"menu", name:"menu.pdf", contentType:"application/pdf", bytes})).toBeTruthy();
  await expect(owner.action(api.files.upload, {organizationId, kind:"dish", name:"menu.pdf", contentType:"application/pdf", bytes})).rejects.toThrow();
  await expect(owner.action(api.files.upload, {organizationId, kind:"menu", name:"menu.pdf", contentType:"application/pdf", bytes:new TextEncoder().encode("not pdf").buffer})).rejects.toThrow();
});
test("PDF pages are checkpointed in source order and reused on retry", async () => {
  const {t, owner, organizationId} = await setup();
  const pdf = await owner.action(api.files.upload, {organizationId,kind:"menu",name:"menu.pdf",contentType:"application/pdf",bytes:new TextEncoder().encode("%PDF-1.7").buffer});
  const jobId = await owner.mutation(api.jobs.importMenu, {organizationId,name:"Imported",fileIds:[pdf],requestId:"pdf-1"});
  const job = await t.mutation(internal.jobs.claim, {jobId});
  const pages = await t.run(async ctx => [
    {storageId:await ctx.storage.store(new Blob(["page1"])), name:"page-001.png",size:5},
    {storageId:await ctx.storage.store(new Blob(["page2"])), name:"page-002.png",size:5},
  ]);
  const ids = await t.mutation(internal.pdfImportState.save, {jobId,attempt:job!.attempt,pages,ordered:[{page:0},{page:1}]});
  expect((await t.query(internal.pdfImportState.sources, {jobId,attempt:job!.attempt})).prepared).toEqual(ids);
  expect((await t.run(ctx => ctx.db.get(ids[0])))?.name).toBe("page-001.png");
  await t.mutation(internal.jobs.fail, {jobId,attempt:job!.attempt,error:"Dify offline"});
  await owner.mutation(api.jobs.retry, {organizationId,jobId});
  const retry = await t.mutation(internal.jobs.claim, {jobId});
  expect((await t.query(internal.pdfImportState.sources, {jobId,attempt:retry!.attempt})).prepared).toEqual(ids);
  await expect(t.mutation(internal.pdfImportState.save, {jobId,attempt:job!.attempt,pages:[],ordered:[]})).rejects.toThrow();
});
