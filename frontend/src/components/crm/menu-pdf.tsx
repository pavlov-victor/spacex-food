import { useEffect, useRef, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMenuPdf } from "@/hooks/use-menu-pdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function MenuPdf({ menuId, name }: { menuId: Id<"menus">; name: string }) {
  const [open, setOpen] = useState(false);
  const pdf = useMenuPdf(open ? menuId : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { setLoaded(false); }, [pdf.documentUrl]);
  const generating = busy || pdf.status === "queued" || pdf.status === "running";
  return <>
    <Button size="sm" variant="outline" onClick={() => setOpen(true)}>PDF / Print</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>{name} — PDF</DialogTitle>
        <DialogDescription>Preview all pages, download your menu or print it. If the print dialog does not open, use Open PDF and the browser’s print button.</DialogDescription>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pdf.isLoading || generating} onClick={async () => {
            setBusy(true); setError("");
            try { await pdf.regenerate(); } catch { setError("Could not start PDF generation. Please try again."); } finally { setBusy(false); }
          }}>{generating ? "Generating PDF…" : pdf.pdfUrl ? "Regenerate PDF" : "Generate PDF"}</Button>
          <Button variant="outline" disabled={!pdf.documentUrl || !loaded} onClick={() => {
            try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }
            catch { setError("Use Open PDF, then choose Print in your browser."); }
          }}>Print</Button>
          {pdf.documentUrl && <Button variant="outline" asChild><a href={pdf.documentUrl} download={`${name.replace(/[^\p{L}\p{N} _-]/gu, "") || "menu"}.pdf`}>Download PDF</a></Button>}
          {pdf.pdfUrl && <Button variant="outline" asChild><a href={pdf.pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF</a></Button>}
        </div>
        <div aria-live="polite">
          {pdf.isLoading && <p>Loading PDF status…</p>}
          {generating && <p>Your PDF is being prepared. You can close this window and return later.</p>}
          {pdf.isStale && pdf.pdfUrl && <p className="text-amber-700">Showing the previous version. Regenerate to include the latest changes.</p>}
          {!pdf.isLoading && !generating && !pdf.pdfUrl && pdf.status !== "failed" && <p>No PDF yet. Click Generate PDF to create it.</p>}
          {(error || pdf.documentError || pdf.error) && <p role="alert" className="text-destructive">{error || pdf.documentError || pdf.error}</p>}
        </div>
        {pdf.documentUrl ? <iframe ref={frame} src={pdf.documentUrl} title={`${name} PDF preview`} className="w-full h-[60vh] rounded border" onLoad={() => setLoaded(true)} />
          : pdf.previewUrl ? <img src={pdf.previewUrl} alt={`${name} — first page preview`} className="max-h-[60vh] mx-auto object-contain" /> : null}
      </DialogContent>
    </Dialog>
  </>;
}
