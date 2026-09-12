/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi, afterEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import {
  normalizeMenu,
  normalizeCard,
  readWorkflowResponse,
  downloadGeneratedImage,
} from "./lib/dify";
const modules = import.meta.glob("./**/*.ts");
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function setup() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Owner", email: "owner" }),
  );
  const otherId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Other", email: "other" }),
  );
  const owner = t.withIdentity({
    subject: `${userId}|session`,
    issuer: "https://test.convex.site",
  });
  const other = t.withIdentity({
    subject: `${otherId}|session`,
    issuer: "https://test.convex.site",
  });
  const organizationId = await owner.mutation(api.organizations.create, {
    name: "First cafe",
  });
  const otherOrg = await other.mutation(api.organizations.create, {
    name: "Second cafe",
  });
  const fileId = await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["image"], { type: "image/jpeg" }),
    );
    return ctx.db.insert("files", {
      organizationId,
      storageId,
      kind: "menu",
      name: "menu.jpg",
      contentType: "image/jpeg",
      size: 5,
    });
  });
  const productId = await owner.mutation(api.catalog.createProduct, {
    organizationId,
    name: "Dish",
    category: "Mains",
    price: null,
    description: "Original menu text",
  });
  return { t, owner, other, organizationId, otherOrg, fileId, productId };
}
const menuOutput = {
  categories: [{ id: "cat_1", name: "Mains" }],
  products: [
    {
      id: "prod_1",
      category_id: "cat_1",
      name: "Karađorđeva",
      description: null,
      price: null,
      currency: null,
      portion: null,
    },
  ],
  warnings: [],
};
describe("organization boundaries", () => {
  test("anonymous callers cannot list/create organizations", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.organizations.list, {})).rejects.toThrow(
      "Sign in",
    );
    await expect(
      t.mutation(api.organizations.create, { name: "No" }),
    ).rejects.toThrow("Sign in");
  });
  test("each owner sees only own organization", async () => {
    const s = await setup();
    expect(
      (await s.owner.query(api.organizations.list, {})).map((o) => o.name),
    ).toEqual(["First cafe"]);
    expect(
      (await s.other.query(api.organizations.list, {})).map((o) => o.name),
    ).toEqual(["Second cafe"]);
  });
  test("cross-organization reads and mutations fail", async () => {
    const s = await setup();
    await expect(
      s.other.query(api.catalog.products, {
        organizationId: s.organizationId,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow("access denied");
    await expect(
      s.other.mutation(api.catalog.updateProduct, {
        organizationId: s.organizationId,
        productId: s.productId,
        name: "Hijack",
      }),
    ).rejects.toThrow("access denied");
    await expect(
      s.other.query(api.files.url, {
        organizationId: s.otherOrg,
        fileId: s.fileId,
      }),
    ).rejects.toThrow("File access denied");
    await expect(
      s.other.mutation(api.jobs.importMenu, {
        organizationId: s.otherOrg,
        name: "Stolen",
        fileIds: [s.fileId],
        requestId: "steal",
      }),
    ).rejects.toThrow("File access denied");
    await expect(
      s.other.mutation(api.jobs.generateCard, {
        organizationId: s.otherOrg,
        productId: s.productId,
        requestId: "steal-card",
      }),
    ).rejects.toThrow("Product not found");
  });
  test("categories deduplicate only within the same organization", async () => {
    const s = await setup();
    await s.owner.mutation(api.catalog.createProduct, {
      organizationId: s.organizationId,
      name: "Another",
      category: "mains",
      price: 100,
      description: "",
    });
    expect(
      await s.owner.query(api.catalog.categories, {
        organizationId: s.organizationId,
      }),
    ).toHaveLength(1);
    expect(
      await s.other.query(api.catalog.categories, {
        organizationId: s.otherOrg,
      }),
    ).toHaveLength(0);
  });
  test("deleteCategory removes the category and its dishes", async () => {
    const s = await setup();
    const extras = await s.owner.query(api.catalog.categories, {
      organizationId: s.organizationId,
    });
    expect(extras).toHaveLength(1);
    await s.owner.mutation(api.catalog.deleteCategory, {
      organizationId: s.organizationId,
      categoryId: extras[0]!._id,
    });
    expect(
      await s.owner.query(api.catalog.categories, {
        organizationId: s.organizationId,
      }),
    ).toHaveLength(0);
    expect(
      (
        await s.owner.query(api.catalog.products, {
          organizationId: s.organizationId,
          paginationOpts: { numItems: 10, cursor: null },
        })
      ).page,
    ).toHaveLength(0);
  });
});
describe("durable jobs", () => {
  test("import is idempotent and completion cannot insert twice", async () => {
    vi.useFakeTimers();
    const s = await setup();
    const args = {
      organizationId: s.organizationId,
      name: "Lunch",
      fileIds: [s.fileId],
      requestId: "same",
    };
    const jobId = await s.owner.mutation(api.jobs.importMenu, args);
    expect(await s.owner.mutation(api.jobs.importMenu, args)).toBe(jobId);
    const claim = await s.t.mutation(internal.jobs.claim, { jobId });
    expect(claim?.attempt).toBe(1);
    expect(await s.t.mutation(internal.jobs.claim, { jobId })).toBeNull();
    const finish = {
      jobId,
      attempt: 1,
      ...normalizeMenu(menuOutput),
      workflowRunId: "run-1",
    };
    await s.t.mutation(internal.jobs.finishMenu, finish);
    await s.t.mutation(internal.jobs.finishMenu, finish);
    const products = await s.owner.query(api.catalog.products, {
      organizationId: s.organizationId,
      paginationOpts: { numItems: 100, cursor: null },
    });
    expect(products.page).toHaveLength(2);
    expect(
      products.page.find((p) => p.name === "Karađorđeva")?.price,
    ).toBeNull();
    expect(
      (
        await s.owner.query(api.jobs.get, {
          organizationId: s.organizationId,
          jobId,
        })
      ).status,
    ).toBe("succeeded");
  });
  test("generation uses stored context/table and trusted recipe, and rejects concurrent runs", async () => {
    vi.useFakeTimers();
    const s = await setup();
    const tableFileId = await s.t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["table"]));
      return ctx.db.insert("files", {
        organizationId: s.organizationId,
        storageId,
        kind: "table",
        name: "table.jpg",
        contentType: "image/jpeg",
        size: 5,
      });
    });
    await s.owner.mutation(api.organizations.update, {
      organizationId: s.organizationId,
      context: "Cafe context",
      tableFileId,
    });
    const jobId = await s.owner.mutation(api.jobs.generateCard, {
      organizationId: s.organizationId,
      productId: s.productId,
      requestId: "card",
      confirmed: { ingredients: ["potatoes"], vegan: true },
    });
    const job = await s.t.mutation(internal.jobs.claim, { jobId });
    expect(job?.input.tableFileId).toBe(tableFileId);
    expect(job?.input.restaurantContext).toBe("Cafe context");
    expect(JSON.parse(job!.input.productJson!).description).toBe(
      "Original menu text",
    );
    expect(JSON.parse(job!.input.productJson!).confirmed).toEqual({
      ingredients: ["potatoes"],
      vegan: true,
    });
    await expect(
      s.owner.mutation(api.jobs.generateCard, {
        organizationId: s.organizationId,
        productId: s.productId,
        requestId: "second",
      }),
    ).rejects.toThrow("active generation");
  });
  test("failed card keeps source product and can be explicitly retried; stale completion ignored", async () => {
    vi.useFakeTimers();
    const s = await setup();
    const jobId = await s.owner.mutation(api.jobs.generateCard, {
      organizationId: s.organizationId,
      productId: s.productId,
      requestId: "fail",
    });
    await s.t.mutation(internal.jobs.claim, { jobId });
    await s.t.mutation(internal.jobs.fail, {
      jobId,
      attempt: 1,
      error: "Dify unavailable",
    });
    expect(
      (
        await s.owner.query(api.catalog.product, {
          organizationId: s.organizationId,
          productId: s.productId,
        })
      ).description,
    ).toBe("Original menu text");
    await s.owner.mutation(api.jobs.retry, {
      organizationId: s.organizationId,
      jobId,
    });
    await s.t.mutation(internal.jobs.claim, { jobId });
    await s.t.mutation(internal.jobs.fail, {
      jobId,
      attempt: 1,
      error: "Stale timeout",
    });
    expect(
      (
        await s.owner.query(api.jobs.get, {
          organizationId: s.organizationId,
          jobId,
        })
      ).status,
    ).toBe("running");
    await s.t.mutation(internal.jobs.finishCard, {
      jobId,
      attempt: 2,
      draftJson: '{"product":{"name":"Dish"}}',
      warnings: ["Image failed"],
      partial: true,
      workflowRunId: "run2",
    });
    const product = await s.owner.query(api.catalog.product, {
      organizationId: s.organizationId,
      productId: s.productId,
    });
    expect(product.card?.status).toBe("partial");
    expect(product.needsReview).toBe(true);
  });
});
describe("Dify boundary", () => {
  test("unknown prices stay null; source text survives", () => {
    const result = normalizeMenu(menuOutput);
    expect(result.products[0].price).toBeNull();
    expect(JSON.parse(result.products[0].sourceJson).name).toBe("Karađorđeva");
  });
  test("invalid result rejected before saving any products", () => {
    expect(() =>
      normalizeMenu({
        ...menuOutput,
        products: [{ ...menuOutput.products[0], price: "100" }],
      }),
    ).toThrow("Invalid price");
    expect(() =>
      normalizeMenu({
        ...menuOutput,
        products: [{ ...menuOutput.products[0], category_id: "other" }],
      }),
    ).toThrow("Unknown product category");
  });
  test("AI card is always a draft and requires review", () => {
    const result = normalizeCard({
      product: {
        name: "Dish",
        needs_review: false,
        publication_status: "published",
        image: { status: "failed" },
      },
    });
    expect(result.draft.product).toMatchObject({
      needs_review: true,
      publication_status: "draft",
    });
    expect(result.partial).toBe(true);
  });
  test("SSE parser handles chunked Unicode and ignores node events", async () => {
    const streamText = `data: {"event":"node_finished","data":{}}\r\n\r\ndata: ${JSON.stringify({ event: "workflow_finished", workflow_run_id: "r1", data: { status: "succeeded", outputs: menuOutput } })}\r\n\r\n`;
    const bytes = new TextEncoder().encode(streamText);
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (let i = 0; i < bytes.length; i += 7)
            controller.enqueue(bytes.slice(i, i + 7));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    );
    expect((await readWorkflowResponse(response)).outputs).toEqual(menuOutput);
  });
  test("failed/truncated streams fail rather than inventing success", async () => {
    await expect(
      readWorkflowResponse(
        new Response(
          'data: {"event":"workflow_finished","data":{"status":"failed"}}\n\n',
        ),
      ),
    ).rejects.toThrow("workflow failed");
    await expect(
      readWorkflowResponse(
        new Response('data: {"event":"workflow_started"}\n\n'),
      ),
    ).rejects.toThrow("before the workflow finished");
  });
  test("generated downloads cannot target internal/untrusted hosts", async () => {
    await expect(
      downloadGeneratedImage("http://127.0.0.1/private"),
    ).rejects.toThrow("expected image provider");
    await expect(
      downloadGeneratedImage("https://example.com/image.png"),
    ).rejects.toThrow("expected image provider");
  });
});

describe("workflow action integration", () => {
  test("partial-succeeded is accepted and a saved run ID can be recovered", async () => {
    const response = new Response(
      `data: ${JSON.stringify({ event: "workflow_started", workflow_run_id: "run-x" })}\n\ndata: ${JSON.stringify({ event: "workflow_finished", workflow_run_id: "run-x", data: { status: "partial-succeeded", outputs: { product: { name: "Dish" }, status: "partial" } } })}\n\n`,
    );
    const remembered: string[] = [];
    const result = await readWorkflowResponse(response, async (id) => {
      remembered.push(id);
    });
    expect(remembered).toEqual(["run-x"]);
    expect(result.outputs.status).toBe("partial");
  });
  test.each(["https://imgen.x.ai/mock.png", "https://v3b.fal.media/files/mock.png"])("provider image %s is copied to Convex storage", async (imageUrl) => {
    vi.useFakeTimers();
    vi.stubEnv("DIFY_PERSON_API", "mock-product-key");
    const s = await setup();
    const jobId = await s.owner.mutation(api.jobs.generateCard, {
      organizationId: s.organizationId,
      productId: s.productId,
      requestId: "image-success",
    });
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("/workflows/run"))
          return new Response(
            JSON.stringify({
              workflow_run_id: "mock-run",
              data: {
                status: "succeeded",
                outputs: {
                  product: {
                    name: "Dish",
                    image: {
                      url: imageUrl,
                      status: "ok",
                      url_is_temporary: true,
                    },
                  },
                  status: "needs_review",
                  warnings: [],
                },
              },
            }),
            { headers: { "content-type": "application/json" } },
          );
        return new Response(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), {
          headers: { "content-type": "image/png" },
        });
      }),
    );
    await s.t.action(internal.workflows.run, { jobId });
    const product = await s.owner.query(api.catalog.product, {
      organizationId: s.organizationId,
      productId: s.productId,
    });
    expect(product.card?.imageFileId).toBeTruthy();
    expect(product.card?.imageUrl).toBeTruthy();
    expect(product.card?.status).toBe("draft");
    const draft = JSON.parse(product.card!.draftJson);
    expect(draft.product.image.url_is_temporary).toBe(false);
    expect(calls).toHaveLength(2);
  });
  test("partial image failure preserves text and does not overwrite source", async () => {
    vi.useFakeTimers();
    vi.stubEnv("DIFY_PERSON_API", "mock-product-key");
    const s = await setup();
    const jobId = await s.owner.mutation(api.jobs.generateCard, {
      organizationId: s.organizationId,
      productId: s.productId,
      requestId: "image-partial",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              workflow_run_id: "mock-run",
              data: {
                status: "partial-succeeded",
                outputs: {
                  product: {
                    name: "Dish",
                    description: "Generated draft",
                    image: { url: null, status: "failed" },
                  },
                  status: "partial",
                  warnings: ["Image failed"],
                },
              },
            }),
            { headers: { "content-type": "application/json" } },
          ),
      ),
    );
    await s.t.action(internal.workflows.run, { jobId });
    const product = await s.owner.query(api.catalog.product, {
      organizationId: s.organizationId,
      productId: s.productId,
    });
    expect(product.description).toBe("Original menu text");
    expect(JSON.parse(product.card!.draftJson).product.description).toBe(
      "Generated draft",
    );
    expect(product.card?.status).toBe("partial");
  });
});

test("password signup creates an organization and subsequent sign-in reuses it", async () => {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", keys.privateKey),
  );
  const base64 = btoa(
    Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
  );
  vi.stubEnv(
    "JWT_PRIVATE_KEY",
    `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`,
  );
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  const t = convexTest(schema, modules);
  const params = {
    username: "new-cafe",
    password: "Test-password-349!",
    organizationName: "New cafe",
  };
  const registration = await t.action(api.auth.signIn, {
    provider: "password",
    params: { ...params, flow: "signUp" },
  });
  expect(registration.tokens?.token).toBeTruthy();
  const login = await t.action(api.auth.signIn, {
    provider: "password",
    params: {
      username: params.username,
      password: params.password,
      flow: "signIn",
    },
  });
  expect(login.tokens?.token).toBeTruthy();
  const orgs = await t.run((ctx) => ctx.db.query("organizations").take(10));
  expect(orgs).toHaveLength(1);
  expect(orgs[0].name).toBe("New cafe");
  await expect(
    t.action(api.auth.signIn, {
      provider: "password",
      params: { username: params.username, password: "wrong", flow: "signIn" },
    }),
  ).rejects.toThrow();
});

test("fal host checks reject lookalikes and invalid response types", async () => {
  for (const url of ["https://fal.media.evil.com/x", "https://evilfal.media/x", "https://user:pass@v3.fal.media/x", "http://v3.fal.media/x"]) {
    await expect(downloadGeneratedImage(url)).rejects.toThrow("expected image provider");
  }
  vi.stubGlobal("fetch", vi.fn(async () => new Response("html", { headers: { "content-type": "text/html" } })));
  await expect(downloadGeneratedImage("https://v3.fal.media/x")).rejects.toThrow("unsupported format");
});
