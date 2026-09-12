import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
export function useSession() {
  const { signIn, signOut } = useAuthActions();
  const state = useConvexAuth();
  return {
    ...state,
    login: (username: string, password: string) =>
      signIn("password", { flow: "signIn", username, password }),
    register: (organizationName: string, username: string, password: string) =>
      signIn("password", {
        flow: "signUp",
        organizationName,
        username,
        password,
      }),
    logout: signOut,
  };
}
