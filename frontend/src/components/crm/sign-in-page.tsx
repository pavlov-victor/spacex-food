import { useState } from 'react';
import type { FormEvent } from 'react';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function SignInPage() {
  const { login } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { await login(String(form.get('username')), String(form.get('password'))); }
    catch { setError('Unable to sign in. Check your username and password and try again.'); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-svh flex-col bg-background text-foreground">
    <header className="flex items-center gap-3 px-6 py-6 sm:px-10"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><UtensilsCrossed className="size-5" /></span><span className="text-lg font-semibold tracking-tight">SpaceX food</span></header>
    <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-6 py-10 md:grid-cols-2 md:gap-20">
      <section className="space-y-6"><p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Your restaurant, beautifully presented</p><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">A better menu.<br /><span className="text-muted-foreground">A warmer welcome.</span></h1><p className="max-w-md text-lg leading-relaxed text-muted-foreground">Turn your paper menu into a digital experience your guests can explore.</p>
        <div className="border-t pt-6"><h2 className="font-semibold">Bring your restaurant on board</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Please contact the administrator. The restaurant application form is not available yet.</p></div>
      </section>
      <Card className="w-full shadow-sm"><CardHeader><CardTitle className="text-2xl"><h2>Welcome back</h2></CardTitle><CardDescription>Sign in to manage your restaurant.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="login-username">Username</Label><Input id="login-username" name="username" autoComplete="username" placeholder="Your username" required disabled={busy}/></div>
        <div className="space-y-2"><Label htmlFor="login-password">Password</Label><Input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required disabled={busy}/></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}{!busy && <ArrowRight className="size-4"/>}</Button>
      </form></CardContent></Card>
    </div><footer className="px-6 py-6 text-center text-xs text-muted-foreground">Made for Serbian kafanas and restaurants.</footer>
  </main>;
}
