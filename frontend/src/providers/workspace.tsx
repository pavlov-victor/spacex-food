import { useState } from "react";
import { WorkspaceContext } from "./workspace-context";
import type { ReactNode } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const organizations = useQuery(
    api.organizations.list,
    isAuthenticated ? {} : "skip",
  );
  const [selected, setSelected] = useState<Id<"organizations"> | null>(null);
  const organizationId =
    organizations?.find((o) => o._id === selected)?._id ??
    organizations?.[0]?._id ??
    null;
  const create = useMutation(api.organizations.create);
  async function createOrganization(name: string) {
    const id = await create({ name });
    setSelected(id);
    return id;
  }
  return (
    <WorkspaceContext.Provider
      value={{
        organizations: organizations ?? [],
        organizationId,
        isAuthenticated,
        isLoading:
          isLoading || (isAuthenticated && organizations === undefined),
        selectOrganization: setSelected,
        createOrganization,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
