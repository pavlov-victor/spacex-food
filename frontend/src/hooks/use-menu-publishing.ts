import { ConvexError } from "convex/values";
import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { api } from "../../convex/_generated/api";
import { useWorkspace } from "./use-workspace";

/** Same-origin URL works on localhost and the final Render domain. */
export function publicMenuUrl(slug: string) {
  return new URL(`/menu/${encodeURIComponent(slug)}`, window.location.origin).href;
}

export function useMenuPublishing(menuId?: Id<"menus">) {
  const { organizationId } = useWorkspace();
  const publishMenu = useMutation(api.storefront.publish);
  const approveAll = useMutation(api.menuBatch.approveAll);
  const unpublishMenu = useMutation(api.storefront.unpublish);
  const publications = useQuery(api.storefront.publications, organizationId ? { organizationId } : "skip");
  const readiness = useQuery(api.storefront.readiness, organizationId && menuId ? { menuId } : "skip");
  return {
    readiness,
    async approveAll() {
      if (!menuId) throw new Error("Select a menu.");
      try { return await approveAll({menuId}); }
      catch { throw new Error("Could not approve the cards. Please try again."); }
    },
    isLoading: !!organizationId && (publications === undefined || (!!menuId && readiness === undefined)),
    publications: (publications ?? []).map(item => ({ ...item, url: publicMenuUrl(item.slug) })),
    async publish(input: FunctionArgs<typeof api.storefront.publish>) {
      if (!organizationId) throw new Error("Select an organization.");
      let id;
      try { id = await publishMenu(input); }
      catch (error) {
        throw new Error(error instanceof ConvexError && typeof error.data === "string" ? error.data : "Could not publish the menu. Please try again.");
      }
      const slug = input.slug.trim().toLowerCase();
      return { id, slug, url: publicMenuUrl(slug) };
    },
    async unpublish(slug: string) {
      if (!organizationId) throw new Error("Select an organization.");
      return unpublishMenu({ slug });
    },
  };
}
