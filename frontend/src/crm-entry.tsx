import App from "./App";
import { BackendProvider } from "./providers/backend";
export default function Crm() {
  return <BackendProvider><App /></BackendProvider>;
}
