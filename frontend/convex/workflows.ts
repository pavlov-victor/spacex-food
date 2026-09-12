import { internalAction, env } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  executeWorkflow,
  getWorkflowRun,
  normalizeMenu,
  normalizeCard,
  downloadGeneratedImage,
} from "./lib/dify";
import type { Id } from "./_generated/dataModel";
export const run = internalAction({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args): Promise<null> => {
    const job = await ctx.runMutation(internal.jobs.claim, args);
    if (!job) return null;
    try {
      const key = job.kind === "menu" ? env.DIFY_MENU_API : env.DIFY_PERSON_API;
      if (!key)
        throw new Error(
          `Configure ${job.kind === "menu" ? "DIFY_MENU_API" : "DIFY_PERSON_API"} on this Convex deployment.`,
        );
      const inputs: Record<string, unknown> = {};
      if (job.kind === "menu") {
        inputs.menu_images = await Promise.all(
          (job.input.fileIds ?? []).map(async (fileId) => ({
            type: "image",
            transfer_method: "remote_url",
            url: await ctx.runQuery(internal.jobs.fileUrl, {
              organizationId: job.organizationId,
              fileId,
            }),
          })),
        );
      } else {
        inputs.product_json = job.input.productJson;
        inputs.target_languages = job.input.targetLanguages ?? "sr,en,ru";
        inputs.restaurant_context = job.input.restaurantContext ?? "";
        inputs.image_prompt = job.input.imagePrompt ?? "";
        inputs.table_image_url = job.input.tableFileId
          ? await ctx.runQuery(internal.jobs.fileUrl, {
              organizationId: job.organizationId,
              fileId: job.input.tableFileId,
            })
          : "";
        inputs.dish_image_url = job.input.dishFileId
          ? await ctx.runQuery(internal.jobs.fileUrl, {
              organizationId: job.organizationId,
              fileId: job.input.dishFileId,
            })
          : "";
      }
      const baseUrl = env.DIFY_API_URL ?? "https://api.dify.ai/v1";
      const recovered = job.workflowRunId
        ? await getWorkflowRun(baseUrl, key, job.workflowRunId)
        : null;
      const result =
        recovered ??
        (await executeWorkflow(
          baseUrl,
          key,
          inputs,
          `org:${job.organizationId}:user:${job.requestedBy}`,
          async (workflowRunId) => {
            await ctx.runMutation(internal.jobs.rememberRun, {
              jobId: job._id,
              attempt: job.attempt,
              workflowRunId,
            });
          },
        ));
      if (job.kind === "menu")
        await ctx.runMutation(internal.jobs.finishMenu, {
          jobId: job._id,
          attempt: job.attempt,
          ...normalizeMenu(result.outputs),
          workflowRunId: result.workflowRunId,
        });
      else {
        const card = normalizeCard(result.outputs);
        let imageFileId: Id<"files"> | undefined;
        if (card.imageUrl) {
          try {
            const blob = await downloadGeneratedImage(card.imageUrl);
            const storageId = await ctx.storage.store(blob);
            try {
              imageFileId = await ctx.runMutation(internal.files.record, {
                organizationId: job.organizationId,
                storageId,
                kind: "generated",
                name: `card-${job.productId}`,
                contentType: blob.type,
                size: blob.size,
              });
            } catch (error) {
              await ctx.storage.delete(storageId);
              throw error;
            }
            card.image.url = await ctx.storage.getUrl(storageId);
            card.image.url_is_temporary = false;
          } catch {
            card.partial = true;
            card.warnings.push(
              "Could not persist the generated image. Text draft preserved; generate a new card to retry.",
            );
            card.image.url = null;
            card.image.status = "failed";
          }
        }
        if (!imageFileId) card.partial = true;
        card.draft.warnings = card.warnings;
        if (card.partial) card.draft.status = "partial";
        await ctx.runMutation(internal.jobs.finishCard, {
          jobId: job._id,
          attempt: job.attempt,
          draftJson: JSON.stringify(card.draft),
          warnings: card.warnings,
          imageFileId,
          partial: card.partial,
          workflowRunId: result.workflowRunId,
        });
      }
    } catch (error) {
      let message = error instanceof Error ? error.message : "Workflow failed.";
      for (const key of [env.DIFY_MENU_API, env.DIFY_PERSON_API])
        if (key) message = message.split(key).join("[redacted]");
      await ctx.runMutation(internal.jobs.fail, {
        jobId: job._id,
        attempt: job.attempt,
        error: message,
      });
    }
    return null;
  },
});
