import type { CreateProductInput, Product } from "@/domain/product";
import { isProduct, validateProduct } from "@/domain/product";

// UI depends on this contract, never on localStorage or a backend SDK.
export interface ProductRepository {
  list(): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
}

const storageKey = "spacex-food-products-v1";
function read(): Product[] {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isProduct)) {
    throw new Error(
      "Stored products are invalid. Export or repair browser data before continuing.",
    );
  }
  return value;
}

export const productsRepository: ProductRepository = {
  async list() {
    try {
      return read();
    } catch {
      throw new Error("Could not load saved products. Check browser storage.");
    }
  },
  async create(input) {
    const product = { ...validateProduct(input), id: crypto.randomUUID() };
    try {
      // Read immediately before writing so sequential operations keep prior products.
      const current = read();
      localStorage.setItem(storageKey, JSON.stringify([...current, product]));
    } catch {
      throw new Error(
        "Could not save the product. Browser storage is unavailable or invalid.",
      );
    }
    return product;
  },
};
