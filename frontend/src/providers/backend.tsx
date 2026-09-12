import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "./workspace";

const deploymentUrl = import.meta.env.VITE_CONVEX_URL;
const client = deploymentUrl ? new ConvexReactClient(deploymentUrl) : null;
export function BackendProvider({ children }: { children: ReactNode }) {
  if (!client)
    return (
      <p role="alert">Set VITE_CONVEX_URL to connect this app to Convex.</p>
    );
  return (
    <ConvexAuthProvider client={client}>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </ConvexAuthProvider>
  );
}
