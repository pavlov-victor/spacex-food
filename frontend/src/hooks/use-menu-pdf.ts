import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
export function useMenuPdf(menuId: Id<"menus"> | null) {
  const state = useQuery(api.menuPdfState.status, menuId ? { menuId } : "skip");
  const regenerate = useMutation(api.menuPdfState.regenerate);
  const [document, setDocument] = useState<{ source: string; url: string } | null>(null);
  const [documentError, setDocumentError] = useState("");
  const pdfUrl = menuId ? state?.pdfUrl : null;
  useEffect(() => {
    setDocument(null);
    setDocumentError("");
    if (!pdfUrl) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void fetch(pdfUrl, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("PDF download failed");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      setDocument({ source: pdfUrl, url: objectUrl });
    }).catch(() => {
      if (!controller.signal.aborted) setDocumentError("Preview could not load. Use Open PDF to view, download or print it.");
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [pdfUrl]);
  return {
    documentUrl: document?.source === pdfUrl ? document?.url : null,
    documentError,
    ...state, isLoading: !!menuId && state === undefined,
    regenerate: async () => {
      if (!menuId) throw new Error("Select a menu.");
      await regenerate({ menuId });
    },
  };
}
