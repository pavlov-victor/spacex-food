import { useMutation, usePaginatedQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useWorkspace } from "./use-workspace";
import type { CreateProductInput, Product } from "@/domain/product";
export type CreateProductResult =
  { ok: true; product: Product } | { ok: false; error: string };
export function useProducts(menuId?: Id<"menus">) {
  const {
    organizationId,
    isAuthenticated,
    isLoading: workspaceLoading,
  } = useWorkspace();
  const page = usePaginatedQuery(
    api.catalog.products,
    organizationId ? { organizationId, menuId } : "skip",
    { initialNumItems: 100 },
  );
  const create = useMutation(api.catalog.createProduct);
  const [isSaving, setSaving] = useState(false);
  const saving = useRef(false);
  const products: Product[] = (page.results ?? []).map((p) => ({
    id: p._id,
    name: p.name,
    category: p.category,
    description: p.description ?? "",
    price: p.price,
    currency: p.currency,
    menuId: p.menuId,
    categoryId: p.categoryId,
    needsReview: p.needsReview,
    cardId: p.cardId,
  }));
  async function createProduct(
    input: CreateProductInput,
  ): Promise<CreateProductResult> {
    if (!organizationId || !isAuthenticated)
      return { ok: false, error: "Sign in and select an organization." };
    if (saving.current)
      return { ok: false, error: "A product is already being saved." };
    saving.current = true;
    setSaving(true);
    try {
      const id = await create({
        organizationId,
        ...input,
        currency: input.currency ?? "RSD",
      });
      return { ok: true, product: { ...input, id } };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not save product.",
      };
    } finally {
      saving.current = false;
      setSaving(false);
    }
  }
  return {
    products,
    isLoading:
      workspaceLoading ||
      (!!organizationId && page.status === "LoadingFirstPage"),
    isSaving,
    error:
      !isAuthenticated && !workspaceLoading
        ? "Sign in to load your organization products."
        : null,
    createProduct,
    loadMore: () => page.loadMore(100),
    hasMore: page.status === "CanLoadMore",
    isLoadingMore: page.status === "LoadingMore",
  };
}
