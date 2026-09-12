import { lazy, Suspense } from "react";
const Storefront = lazy(() => import("./storefront/Storefront"));
const Crm = lazy(() =>
  import("./crm-entry").catch(() => ({
    default: function CrmLoadError() {
      return (
        <p role="alert" style={{ padding: 32 }}>
          The workspace failed to load. Refresh the page.
        </p>
      );
    },
  })),
);
export default function Entry() {
  return <Suspense fallback={<p role="status" style={{ padding: 32 }}>Loading…</p>}>
    {window.location.pathname.startsWith("/menu/") ? <Storefront /> : <Crm />}
  </Suspense>;
}
