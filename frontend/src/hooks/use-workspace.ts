import { useContext } from "react";
import { WorkspaceContext } from "../providers/workspace-context";
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Wrap the app in BackendProvider.");
  return value;
}
