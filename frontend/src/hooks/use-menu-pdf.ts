import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
export function useMenuPdf(menuId: Id<"menus"> | null) {
  const state = useQuery(api.menuPdfState.status, menuId ? { menuId } : "skip");
  const regenerate = useMutation(api.menuPdfState.regenerate);
  return {
    ...state, isLoading: !!menuId && state === undefined,
    regenerate: async () => {
      if (!menuId) throw new Error("Select a menu.");
      await regenerate({ menuId });
    },
  };
}
