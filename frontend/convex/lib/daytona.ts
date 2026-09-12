/// <reference types="node" />
"use node";
import { Buffer } from "node:buffer";
import { Daytona, type Sandbox } from "@daytona/sdk";
import { PDF_WORKER } from "./pdfWorker";

export async function withPdfSandbox<T>(
  config: { apiKey?: string; snapshot?: string },
  task: (sandbox: Sandbox) => Promise<T>,
): Promise<T> {
  if (!config.apiKey) throw new Error("Configure DAYTONA_API_KEY on the Convex deployment.");
  const daytona = new Daytona({ apiKey: config.apiKey });
  const sandbox = await daytona.create({
    language: "python", snapshot: config.snapshot,
    autoStopInterval: 5, autoDeleteInterval: 0,
  }, { timeout: 60 });
  try {
    const install = await sandbox.process.executeCommand(
      "python3 -m pip install --disable-pip-version-check pymupdf==1.26.7 'qrcode[pil]==8.2'",
      undefined, undefined, 120,
    );
    if (install.exitCode !== 0) throw new Error("Daytona PDF dependency installation failed.");
    await sandbox.fs.uploadFile(Buffer.from(PDF_WORKER), "pdf_worker.py");
    return await task(sandbox);
  } finally {
    // Auto-stop/delete is the fallback if the API is temporarily unavailable.
    await sandbox.delete(20).catch(() => undefined);
  }
}

export async function runPdfTask(sandbox: Sandbox, input: Record<string, unknown>) {
  await sandbox.fs.uploadFile(Buffer.from(JSON.stringify(input)), "input.json");
  const result = await sandbox.process.executeCommand("python3 pdf_worker.py", undefined, undefined, 90);
  if (result.exitCode !== 0) {
    if (result.result.includes("Password-protected")) throw new Error("Password-protected PDF is not supported.");
    if (result.result.includes("PDF must have")) throw new Error("PDF input exceeds the 5-page menu limit.");
    throw new Error("Daytona could not process the PDF. Check that it is a valid, unencrypted PDF.");
  }
  const manifest: unknown = JSON.parse((await sandbox.fs.downloadFile("manifest.json")).toString());
  if (!Array.isArray(manifest) || manifest.length > 5 || !manifest.every(x => typeof x === "string" && /^(page-\d{3}\.png|menu\.pdf|preview\.png)$/.test(x)))
    throw new Error("Invalid PDF task output.");
  return manifest as string[];
}
