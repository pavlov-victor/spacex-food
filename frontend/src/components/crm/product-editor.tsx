import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Product } from '@/domain/product';
import { useCardEditor } from '@/hooks/use-card-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function ProductEditor({ productId, onClose }: { productId: Product['id']; onClose: () => void }) {
  const flow = useCardEditor(productId);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [dish, setDish] = useState<File | null>(null);
  const p = flow.product;
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(message); } catch(e) { setError(e instanceof Error ? e.message : 'Action failed.'); } finally { setBusy(false); }
  }
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!p) return;
    const form = new FormData(event.currentTarget);
    await action(async () => {
      const dishFileId = dish ? await flow.uploadImage(dish, 'dish') : undefined;
      const confirmed = { ...p.confirmed };
      for (const key of ['served_hot', 'takeaway', 'vegan', 'spicy'] as const) {
        const value = form.get(key);
        if (value === 'unknown') delete confirmed[key];
        else confirmed[key] = value === 'true';
      }
      await flow.generateCard({ productId, dishFileId, confirmed, restaurantContext: String(form.get('context') ?? ''), imagePrompt: String(form.get('prompt') ?? '') });
    }, 'Generation started. You can close this panel and return later.');
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{p?.name ?? 'Loading dish…'}</DialogTitle><DialogDescription>Generate a card, review the English copy, then apply it before publishing.</DialogDescription></DialogHeader>
    {!p ? <p role="status">Loading…</p> : <div className="space-y-6">
      <p>{p.price ?? '—'} {p.currency ?? ''}</p>
      {p.description && <p>{p.description}</p>}
      <form onSubmit={generate} className="space-y-3">
        <Label htmlFor="dish-photo">Actual dish photo (optional)</Label><Input id="dish-photo" type="file" accept="image/jpeg,image/png" onChange={e => setDish(e.target.files?.[0] ?? null)} />
        <Label htmlFor="recipe-notes">Recipe / serving notes</Label><Textarea id="recipe-notes" name="context" maxLength={4000} placeholder="What is actually in this dish?" />
        <Label htmlFor="photo-prompt">Photo instructions</Label><Textarea id="photo-prompt" name="prompt" maxLength={2000} placeholder="Natural daylight, centered plate…" />
        <p className="text-sm text-muted-foreground">Confirm only properties you know. Unknown properties will not become image badges.</p>
        <div className="grid grid-cols-2 gap-3">{(['served_hot','takeaway','vegan','spicy'] as const).map(key => <Label key={key} className="flex flex-col items-start gap-2">{({served_hot:'Served hot',takeaway:'Takeaway',vegan:'Vegan',spicy:'Spicy'})[key]}<select name={key} defaultValue={String(p.confirmed[key] ?? 'unknown')} className="w-full rounded-md border p-2"><option value="unknown">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></Label>)}</div>
        <Button disabled={busy || !!p.activeJobId} type="submit">{busy ? 'Working…' : p.activeJobId ? 'Generating…' : p.card ? 'Regenerate card' : 'Generate card'}</Button>
      </form>
      {flow.job && <div role="status" className="text-sm">Generation: {flow.job.status}{flow.job.error && <p>{flow.job.error}</p>}{flow.job.status === 'failed' && <Button variant="outline" disabled={busy} onClick={() => void action(() => flow.retry(flow.job!._id), 'Retry started.')}>Retry</Button>}</div>}
      {p.card && <section className="space-y-3" key={p.card._id}>
        {p.card.imageUrl ? <img src={p.card.imageUrl} alt="Generated dish draft" className="w-full rounded-lg" /> : <p>Image unavailable. You can still review the text and regenerate the image.</p>}
        {p.card.warnings.length > 0 && <details><summary className="cursor-pointer text-sm">Review notes ({p.card.warnings.length})</summary><ul className="list-disc pl-5 text-sm">{p.card.warnings.map((w,i) => <li key={i}>{w}</li>)}</ul></details>}
        {flow.english && <form className="space-y-3" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void action(() => flow.applyCard({productId,cardId:p.card!._id,reviewed:form.get('reviewed')==='on',name:String(form.get('name')),description:String(form.get('description'))}), 'Applied. Publish the menu to update the guest view.'); }}>
          <Label htmlFor="english-name">English name</Label><Input id="english-name" name="name" defaultValue={flow.english.name} maxLength={120} required />
          <Label htmlFor="english-description">English description</Label><Textarea id="english-description" name="description" defaultValue={flow.english.description} maxLength={5000} required />
          <Label><input type="checkbox" name="reviewed" required /> I reviewed the text and image</Label>
          <Button disabled={busy || !!p.activeJobId}>Apply result</Button>
          {p.acceptedCardId === p.card._id && <p className="text-sm">This card has been applied.</p>}
        </form>}
      </section>}
    </div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
  </DialogContent></Dialog>;
}
