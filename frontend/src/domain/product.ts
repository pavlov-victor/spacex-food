export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
};

export type CreateProductInput = Omit<Product, "id">;

export function validateProduct(input: CreateProductInput): CreateProductInput {
  const name = input.name.trim();
  const category = input.category.trim();
  const description = input.description.trim();
  if (!name || name.length > 120)
    throw new Error("Enter a product name (up to 120 characters).");
  if (!category || category.length > 80)
    throw new Error("Enter a category (up to 80 characters).");
  if (!Number.isFinite(input.price) || input.price < 0)
    throw new Error("Enter a valid non-negative price.");
  if (description.length > 2000)
    throw new Error("Description must be at most 2000 characters.");
  return { name, category, price: input.price, description };
}

export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Partial<Product>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.category === "string" &&
    typeof p.price === "number" &&
    Number.isFinite(p.price) &&
    p.price >= 0 &&
    typeof p.description === "string"
  );
}

export function filterProducts(products: Product[], search: string): Product[] {
  const query = search.trim().toLocaleLowerCase();
  return products.filter((p) => p.name.toLocaleLowerCase().includes(query));
}
