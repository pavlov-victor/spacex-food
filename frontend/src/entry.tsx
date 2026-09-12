import { lazy, Suspense } from "react";
const Storefront = lazy(() => import("./storefront/Storefront"));
const Crm = lazy(() => import("./crm-entry"));
export default function Entry() {
  return <Suspense fallback={<p role="status" style={{ padding: 32 }}>Loading…</p>}>
    {window.location.pathname.startsWith("/menu/") ? <Storefront /> : <Crm />}
  </Suspense>;
}
