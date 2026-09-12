export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Dify returned an invalid object.");
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 5000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`Invalid ${label} in Dify output.`);
  return value.trim();
}
function optionalText(value: unknown, max = 5000): string | null {
  if (value === null || value === undefined || value === "") return null;
  return text(value, "text", max);
}
export function warningList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((x): x is string => typeof x === "string")
        .slice(0, 100)
        .map((s) => s.slice(0, 1000))
    : [];
}
export function normalizeMenu(outputs: Record<string, unknown>) {
  const body = Array.isArray(outputs.products)
    ? outputs
    : object(JSON.parse(text(outputs.menu_json, "menu JSON", 700000)));
  if (
    !Array.isArray(body.categories) ||
    !Array.isArray(body.products) ||
    body.categories.length > 100 ||
    body.products.length > 250
  )
    throw new Error(
      "Menu must contain at most 100 categories and 250 products. Split larger menus into separate imports.",
    );
  const categories = body.categories.map((value) => {
    const c = object(value);
    return {
      id: text(c.id, "category ID", 100),
      name: text(c.name, "category name", 120),
    };
  });
  const ids = new Set(categories.map((c) => c.id));
  if (ids.size !== categories.length)
    throw new Error("Duplicate category IDs in Dify output.");
  const products = body.products.map((value) => {
    const p = object(value);
    const price = p.price ?? null;
    if (
      price !== null &&
      (typeof price !== "number" || !Number.isFinite(price) || price < 0)
    )
      throw new Error("Invalid price in Dify output.");
    const categorySourceId = text(p.category_id, "product category ID", 100);
    if (!ids.has(categorySourceId))
      throw new Error("Unknown product category in Dify output.");
    const sourceJson = JSON.stringify(p);
    if (sourceJson.length > 16000)
      throw new Error("Product source is too large.");
    return {
      sourceId: text(p.id, "product ID", 100),
      categorySourceId,
      name: text(p.name, "product name", 120),
      description: optionalText(p.description),
      price,
      currency: optionalText(p.currency, 20),
      portion: optionalText(p.portion, 200),
      sourceJson,
      needsReview: true,
    };
  });
  if (new Set(products.map((p) => p.sourceId)).size !== products.length)
    throw new Error("Duplicate product IDs in Dify output.");
  const result = { categories, products, warnings: warningList(body.warnings) };
  if (JSON.stringify(result).length > 650000)
    throw new Error(
      "Menu result is too large. Split the menu into separate imports.",
    );
  return result;
}
export function normalizeCard(outputs: Record<string, unknown>) {
  const body = outputs.product
    ? outputs
    : object(JSON.parse(text(outputs.product_json, "product JSON", 500000)));
  const product = object(body.product);
  text(product.name, "product name", 120);
  product.needs_review = true;
  product.publication_status = "draft";
  const image = product.image ? object(product.image) : {};
  const imageUrl = typeof image.url === "string" ? image.url : null;
  const warnings = warningList(body.warnings);
  const draft: Record<string, unknown> = { ...body, product };
  if (JSON.stringify(draft).length > 500000)
    throw new Error("Product card is too large.");
  return {
    draft,
    image,
    imageUrl,
    warnings,
    partial: body.status === "partial" || image.status !== "ok",
  };
}
export type WorkflowResult = {
  outputs: Record<string, unknown>;
  workflowRunId: string;
};
export async function readWorkflowResponse(
  response: Response,
  onRunId?: (id: string) => Promise<void>,
): Promise<WorkflowResult> {
  if (!response.ok)
    throw new Error(
      `Dify request failed (HTTP ${response.status}). Check the workflow API key and configuration.`,
    );
  if (response.headers.get("content-type")?.includes("application/json")) {
    const root = object(await response.json());
    const data = object(root.data);
    if (data.status !== "succeeded" && data.status !== "partial-succeeded")
      throw new Error("Dify workflow failed. Check its run history.");
    return {
      outputs: object(data.outputs),
      workflowRunId: String(root.workflow_run_id ?? data.id ?? ""),
    };
  }
  if (!response.body) throw new Error("Dify returned an empty response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: WorkflowResult | undefined;
  const processEvent = async (event: string) => {
    const content = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!content) return;
    const item = object(JSON.parse(content));
    if (
      item.event === "workflow_started" &&
      typeof item.workflow_run_id === "string" &&
      onRunId
    )
      await onRunId(item.workflow_run_id);
    if (item.event === "error")
      throw new Error(
        "Dify workflow reported an error. Check its run history.",
      );
    if (item.event === "workflow_finished") {
      const data = object(item.data);
      if (data.status !== "succeeded" && data.status !== "partial-succeeded")
        throw new Error(
          "Dify workflow failed. Check its run history and provider credentials.",
        );
      result = {
        outputs: object(data.outputs),
        workflowRunId: String(item.workflow_run_id ?? data.id ?? ""),
      };
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      if (buffer.length > 4 * 1024 * 1024)
        throw new Error("Dify response exceeded the size limit.");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        await processEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
      if (result) return result;
      if (done) {
        if (buffer.trim()) await processEvent(buffer);
        break;
      }
    }
  } finally {
    await reader.cancel();
  }
  if (!result)
    throw new Error("Dify stream ended before the workflow finished.");
  return result;
}
export async function executeWorkflow(
  baseUrl: string,
  key: string,
  inputs: Record<string, unknown>,
  user: string,
  onRunId?: (id: string) => Promise<void>,
): Promise<WorkflowResult> {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:") throw new Error("Dify API must use HTTPS.");
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/workflows/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs, user, response_mode: "streaming" }),
    signal: AbortSignal.timeout(8 * 60 * 1000),
  });
  return readWorkflowResponse(response, onRunId);
}
export async function downloadGeneratedImage(url: string): Promise<Blob> {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    (parsed.hostname !== "imgen.x.ai" && !parsed.hostname.endsWith(".x.ai"))
  )
    throw new Error(
      "Generated image URL is not from the expected image provider.",
    );
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok || !response.body)
    throw new Error("Generated image download failed.");
  const type = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(type))
    throw new Error("Generated image has an unsupported format.");
  const limit = 10 * 1024 * 1024;
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit)
        throw new Error("Generated image is larger than 10 MB.");
      chunks.push(new Uint8Array(value));
    }
  } finally {
    await reader.cancel();
  }
  return new Blob(chunks, { type });
}

export async function getWorkflowRun(
  baseUrl: string,
  key: string,
  runId: string,
): Promise<WorkflowResult | null> {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/workflows/run/${encodeURIComponent(runId)}`,
    {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Could not check the previous Dify run (HTTP ${response.status}). No new generation was started.`,
    );
  const data = object(await response.json());
  if (data.status === "succeeded" || data.status === "partial-succeeded")
    return {
      outputs:
        typeof data.outputs === "string"
          ? object(JSON.parse(data.outputs))
          : object(data.outputs),
      workflowRunId: runId,
    };
  if (data.status === "failed" || data.status === "stopped") return null;
  throw new Error(
    "The previous Dify run is still processing. Retry later; no new generation was started.",
  );
}
