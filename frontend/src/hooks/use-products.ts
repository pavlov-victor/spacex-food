import { useEffect, useRef, useState } from "react";
import { productsRepository } from "@/data/products";
import type { ProductRepository } from "@/data/products";
import type { CreateProductInput, Product } from "@/domain/product";

export type CreateProductResult =
  { ok: true; product: Product } | { ok: false; error: string };

// Keep the injected repository stable for the lifetime of this hook.
export function useProducts(
  repository: ProductRepository = productsRepository,
) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then(
        (value) => {
          if (active) setProducts(value);
        },
        (cause) => {
          if (active)
            setError(
              cause instanceof Error
                ? cause.message
                : "Could not load products.",
            );
        },
      )
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  async function createProduct(
    input: CreateProductInput,
  ): Promise<CreateProductResult> {
    if (isLoading || saving.current)
      return { ok: false, error: "Please wait for the current operation." };
    saving.current = true;
    setIsSaving(true);
    try {
      const product = await repository.create(input);
      setProducts((current) => [...current, product]);
      setError(null);
      return { ok: true, product };
    } catch (cause) {
      return {
        ok: false,
        error:
          cause instanceof Error ? cause.message : "Could not save product.",
      };
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  return { products, isLoading, isSaving, error, createProduct };
}
