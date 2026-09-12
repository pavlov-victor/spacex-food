import { useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { useWorkspace } from '@/hooks/use-workspace';
import { useMenuWorkflows } from '@/hooks/use-menu-workflows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
export function WorkspaceSettings({onClose}:{onClose:()=>void}) {
  const session=useSession(), workspace=useWorkspace(), flow=useMenuWorkflows();
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const org=workspace.organizations.find(o=>o._id===workspace.organizationId);
  async function perform(work:()=>Promise<unknown>, message:string){setBusy(true);setError('');try{await work();setNotice(message);}catch(e){setError(e instanceof Error?e.message:'Action failed.');}finally{setBusy(false);}}
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[90svh] overflow-y-auto"><DialogHeader><DialogTitle>{session.isAuthenticated?'Restaurant settings':'Create your restaurant'}</DialogTitle><DialogDescription>{session.isAuthenticated?'Choose a workspace and add your table photo.':'Create an account and a separate restaurant workspace.'}</DialogDescription></DialogHeader>
    {!session.isAuthenticated ? <form className="space-y-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void perform(()=>session.register(String(f.get('restaurant')),String(f.get('username')),String(f.get('password'))),'Account created.');}}>
      <Label htmlFor="register-restaurant">Restaurant name</Label><Input id="register-restaurant" name="restaurant" required maxLength={120}/>
      <Label htmlFor="register-username">New username</Label><Input id="register-username" name="username" autoComplete="username" required minLength={3}/>
      <Label htmlFor="register-password">New password</Label><Input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={8}/><Button disabled={busy}>Create account</Button>
    </form> : <div className="space-y-5">
      <Label htmlFor="workspace-choice">Active restaurant</Label><select id="workspace-choice" className="w-full rounded-md border p-2" value={workspace.organizationId??''} onChange={e=>{const chosen=workspace.organizations.find(o=>o._id===e.target.value);if(chosen)workspace.selectOrganization(chosen._id);}}>{workspace.organizations.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}</select>
      <form className="space-y-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void perform(()=>workspace.createOrganization(String(f.get('name'))),'Restaurant created.');}}><Label htmlFor="new-restaurant">Additional restaurant</Label><Input id="new-restaurant" name="name" required maxLength={120}/><Button variant="outline" disabled={busy}>Create restaurant</Button></form>
      {org && <form key={org._id} className="space-y-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void perform(async()=>{await flow.updateOrganization({name:String(f.get('name')),context:String(f.get('context'))});const photo=f.get('table');if(photo instanceof File && photo.size)await flow.uploadImage(photo,'table');},'Restaurant settings saved.');}}>
        <Label htmlFor="restaurant-name">Restaurant name</Label><Input id="restaurant-name" name="name" defaultValue={org.name} required maxLength={120}/>
        <Label htmlFor="restaurant-context">Restaurant notes</Label><Textarea id="restaurant-context" name="context" defaultValue={org.context} maxLength={5000}/>
        <Label htmlFor="restaurant-table">Table photo</Label><Input id="restaurant-table" name="table" type="file" accept="image/jpeg,image/png"/>{org.tableFileId && <p className="text-sm">Your photo is saved and appears on the guest menu. It is also used as a table reference for dish images. Upload another to replace it.</p>}
        <Button disabled={busy}>Save restaurant settings</Button>
      </form>}
    </div>}{error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
  </DialogContent></Dialog>;
}
