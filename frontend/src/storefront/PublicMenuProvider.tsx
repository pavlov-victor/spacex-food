import type { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
const url = import.meta.env.VITE_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;
export function PublicMenuProvider({ children }: { children: ReactNode }) {
  if (!client) return <main className="sf-message">Menu connection is not configured.</main>;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
