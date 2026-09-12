import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useMenuPublishing } from '@/hooks/use-menu-publishing';
import type { Product } from '@/domain/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export function MenuPublisher({ menu, onClose, onReview }: { menu: { id: NonNullable<Product['menuId']>; name: string }; onClose: () => void; onReview: (id: Product['id']) => void }) {
  const flow=useMenuPublishing(menu.id);
  const existing=flow.publications.find(p=>p.menuId===menu.id);
  const [url,setUrl]=useState(''),[qr,setQr]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const visibleUrl=url || (existing?.published ? existing.url : '');
  useEffect(()=>{ let live=true; setQr(''); if(visibleUrl) void QRCode.toDataURL(visibleUrl,{width:256,margin:2}).then(v=>{if(live)setQr(v);}).catch(()=>{if(live)setError('Could not render QR. Use the menu link.');}); return ()=>{live=false;}; },[visibleUrl]);
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[90svh] overflow-y-auto"><DialogHeader><DialogTitle>Publish {menu.name}</DialogTitle><DialogDescription>Review your dishes, then publish the menu for your guests.</DialogDescription></DialogHeader>
    {flow.readiness?.menuError && <p role="status">{flow.readiness.menuError}</p>}
    {!!flow.readiness?.blockers.length && <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">A few dishes need your attention</h3><p className="text-sm text-muted-foreground">Open each card, review its text and photo, and choose Apply result.</p><ul className="max-h-52 space-y-3 overflow-y-auto">{flow.readiness.blockers.map(item => <li key={item.productId} className="flex items-center justify-between gap-3"><span className="text-sm">{item.name}{item.reason === 'generating' && <span className="block text-muted-foreground">Still generating…</span>}</span><Button type="button" variant="outline" size="sm" onClick={() => onReview(item.productId)}>{item.reason === 'generating' ? 'View progress' : 'Review dish'}</Button></li>)}</ul></section>}
    <form key={existing?._id ?? 'new'} className="space-y-3" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{const result=await flow.publish({menuId:menu.id,name:String(f.get('name')),slug:String(f.get('slug')),reviewed:f.get('reviewed')==='on'});setUrl(result.url);}catch(e){setError(e instanceof Error?e.message:'Publication failed.');}finally{setBusy(false);}}}>
      <Label htmlFor="public-name">Public menu name</Label><Input id="public-name" name="name" defaultValue={existing?.name ?? menu.name} required maxLength={100}/>
      <Label htmlFor="public-slug">Menu address</Label><Input id="public-slug" name="slug" defaultValue={existing?.slug ?? `${menu.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'menu'}-${menu.id.slice(-6)}`} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={64} required/>
      <Label><input type="checkbox" name="reviewed" required/> I reviewed this menu for guests</Label><Button disabled={busy || flow.isLoading || !!flow.readiness?.menuError || !!flow.readiness?.blockers.length}>{busy?'Publishing…':'Publish menu'}</Button>
    </form>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {visibleUrl && <div className="space-y-3"><a className="break-all underline" href={visibleUrl} target="_blank" rel="noreferrer">{visibleUrl}</a>{qr && <img src={qr} alt="Scan to open the menu" width={256} height={256}/>}<Button variant="outline" onClick={()=>void navigator.clipboard.writeText(visibleUrl).catch(()=>setError('Copy the link above manually.'))}>Copy menu link</Button></div>}
  </DialogContent></Dialog>;
}
