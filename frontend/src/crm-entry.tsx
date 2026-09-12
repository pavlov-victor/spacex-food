import App from './App';
import { BackendProvider } from './providers/backend';
import { useSession } from './hooks/use-session';
import { SignInPage } from './components/crm/sign-in-page';
function AuthenticatedCrm() {
  const { isLoading, isAuthenticated } = useSession();
  if (isLoading) return <main className="flex min-h-svh items-center justify-center"><p role="status">Loading…</p></main>;
  return isAuthenticated ? <App /> : <SignInPage />;
}
export default function Crm() {
  return <BackendProvider><AuthenticatedCrm /></BackendProvider>;
}
