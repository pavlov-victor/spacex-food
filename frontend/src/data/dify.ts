// Dify workflow client for menu extraction and product enrichment
// Uses public Workflow API: https://docs.dify.ai/guides/workflow/workflow-call-api

export interface DifyMenuInput {
  menu_images: string[]; // URLs or base64
}

export interface DifyMenuProduct {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  portion: string | null;
  source_images: number[];
  needs_review: boolean;
}

export interface DifyMenuCategory {
  id: string;
  name: string;
  inferred: boolean;
}

export interface DifyMenuResponse {
  products: DifyMenuProduct[];
  categories: DifyMenuCategory[];
  warnings: string[];
  status: "ok" | "needs_review" | "empty";
  schema_version: string;
}

export async function extractMenuFromImages(): Promise<DifyMenuResponse> {
  const apiKey = import.meta.env.VITE_DIFY_MENU_API;
  
  if (!apiKey) {
    throw new Error("VITE_DIFY_MENU_API not configured");
  }

  // Full implementation requires file upload to backend/Convex
  throw new Error("Dify menu extraction requires Convex or backend for file upload");
}

// Mock data based on Dify workflow examples until backend is ready
export function getMockMenuProducts(): DifyMenuProduct[] {
  return [
    {
      id: "1",
      category_id: "cat1",
      name: "Karađorđeva šnicla",
      description: "Pork or veal cutlet rolled with kajmak and ham, breaded and fried",
      price: 1200,
      currency: "RSD",
      portion: "300g",
      source_images: [1],
      needs_review: false,
    },
    {
      id: "2",
      category_id: "cat1",
      name: "Teleća čorba",
      description: "Traditional Serbian beef soup with vegetables",
      price: 350,
      currency: "RSD",
      portion: "250ml",
      source_images: [1],
      needs_review: false,
    },
    {
      id: "3",
      category_id: "cat2",
      name: "Domaća kafa",
      description: "Traditional Serbian coffee",
      price: 150,
      currency: "RSD",
      portion: "100ml",
      source_images: [1],
      needs_review: false,
    },
  ];
}

export function getMockCategories(): DifyMenuCategory[] {
  return [
    { id: "cat1", name: "Main dishes", inferred: false },
    { id: "cat2", name: "Beverages", inferred: false },
  ];
}
