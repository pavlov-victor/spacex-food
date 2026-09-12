import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionArgs } from "convex/server";
import { useWorkspace } from "./use-workspace";
export type GenerateCardInput = Omit<
  FunctionArgs<typeof api.jobs.generateCard>,
  "organizationId" | "requestId"
> & { requestId?: string };
export function useMenuWorkflows() {
  const { organizationId } = useWorkspace();
  const upload = useAction(api.files.upload),
    startImport = useMutation(api.jobs.importMenu),
    startCard = useMutation(api.jobs.generateCard),
    retryJob = useMutation(api.jobs.retry),
    updateOrganization = useMutation(api.organizations.update),
    updateProduct = useMutation(api.catalog.updateProduct);
  const menus = useQuery(
    api.catalog.menus,
    organizationId ? { organizationId } : "skip",
  );
  const categories = useQuery(
    api.catalog.categories,
    organizationId ? { organizationId } : "skip",
  );
  const jobs = useQuery(
    api.jobs.list,
    organizationId ? { organizationId } : "skip",
  );
  function org() {
    if (!organizationId) throw new Error("Select an organization.");
    return organizationId;
  }
  async function uploadImage(file: File, kind: "menu" | "table" | "dish") {
    const selectedOrganization = org();
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 10 * 1024 * 1024 ||
      file.size === 0
    )
      throw new Error("Choose a JPG or PNG image up to 10 MB.");
    return upload({
      organizationId: selectedOrganization,
      kind,
      name: file.name,
      contentType: file.type,
      bytes: await file.arrayBuffer(),
    });
  }
  return {
    menus: menus ?? [],
    categories: categories ?? [],
    jobs: jobs ?? [],
    isLoading:
      !!organizationId &&
      (menus === undefined || categories === undefined || jobs === undefined),
    uploadImage,
    importMenu: (
      name: string,
      fileIds: Id<"files">[],
      requestId = crypto.randomUUID(),
    ) => startImport({ organizationId: org(), name, fileIds, requestId }),
    generateCard: ({
      requestId = crypto.randomUUID(),
      ...input
    }: GenerateCardInput) =>
      startCard({ organizationId: org(), requestId, ...input }),
    retry: (jobId: Id<"jobs">) => retryJob({ organizationId: org(), jobId }),
    updateOrganization: (
      input: Omit<
        FunctionArgs<typeof api.organizations.update>,
        "organizationId"
      >,
    ) => updateOrganization({ organizationId: org(), ...input }),
    updateProduct: (
      input: Omit<
        FunctionArgs<typeof api.catalog.updateProduct>,
        "organizationId"
      >,
    ) => updateProduct({ organizationId: org(), ...input }),
  };
}
export function useProductCard(productId: Id<"products"> | null) {
  const { organizationId } = useWorkspace();
  return useQuery(
    api.catalog.product,
    organizationId && productId ? { organizationId, productId } : "skip",
  );
}
