import { createContext, useContext, useEffect, useState } from "react";
import { msalInstance, loginScopes } from "@/lib/msal";
import type { AccountInfo } from "@azure/msal-browser";

type AuthCtx = {
  account?: AccountInfo | null;
  signIn: () => void;
  signOut: () => void;
  getAccessToken: () => Promise<string>;
};

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountInfo | null>();

  useEffect(() => {
    msalInstance.handleRedirectPromise().then(res => {
      const acc = res?.account ?? msalInstance.getAllAccounts()[0] ?? null;
      setAccount(acc);
    });
  }, []);

  const signIn = () => {
    msalInstance.loginRedirect({ scopes: loginScopes });
  };

  const signOut = () => {
    const acc = msalInstance.getAllAccounts()[0];
    msalInstance.logoutRedirect({ account: acc || undefined });
  };

  const getAccessToken = async () => {
    const acc = msalInstance.getAllAccounts()[0];
    if (!acc) throw new Error("No account");
    const res = await msalInstance.acquireTokenSilent({ account: acc, scopes: loginScopes });
    return res.accessToken;
  };

  return <Ctx.Provider value={{ account, signIn, signOut, getAccessToken }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
