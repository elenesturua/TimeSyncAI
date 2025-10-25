import { PublicClientApplication, InteractionRequiredAuthError, SilentRequest } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID!,
    authority: import.meta.env.VITE_MSAL_AUTHORITY!,
    redirectUri: import.meta.env.VITE_REDIRECT_URI!,
  },
  cache: { cacheLocation: "localStorage" },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginScopes = [
  "openid", "profile", "offline_access",
  "Calendars.Read", "Calendars.ReadWrite"
];

export async function ensureToken(accountId?: string) {
  const account = accountId
    ? msalInstance.getAccountByLocalId?.(accountId) || msalInstance.getAllAccounts()[0]
    : msalInstance.getAllAccounts()[0];

  if (!account) throw new Error("No account. Please sign in.");

  const req: SilentRequest = { account, scopes: loginScopes };
  try {
    const res = await msalInstance.acquireTokenSilent(req);
    return res.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ scopes: loginScopes });
    }
    throw e;
  }
}
