import { createContext } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
export type WorkspaceState = {
  organizations: FunctionReturnType<typeof api.organizations.list>;
  organizationId: Id<"organizations"> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectOrganization: (id: Id<"organizations">) => void;
  createOrganization: (name: string) => Promise<Id<"organizations">>;
};
export const WorkspaceContext = createContext<WorkspaceState | null>(null);
