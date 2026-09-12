import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
/** Public, allowlisted published snapshot; no CRM session required. */
export function usePublicMenu(slug: string) {
  return useQuery(api.storefront.menu, { slug });
}
