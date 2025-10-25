import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { msalConfig } from './authConfig';
import 'bootstrap/dist/css/bootstrap.min.css'
import '@/styles/tailwind.css'

/**
 * MSAL should be instantiated outside of the component tree to prevent it from being re-instantiated on re-renders.
 * For more, visit: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/docs/getting-started.md
 */
const msalInstance = new PublicClientApplication(msalConfig);

// Default to using the first account if no account is active on page load
if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
    // Account selection logic is app dependent. Adjust as needed for different use cases.
    msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

// Listen for sign-in event and set active account
msalInstance.addEventCallback((event) => {
    console.log('MSAL Event:', event.eventType, event);
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload && 'account' in event.payload) {
        const account = (event.payload as any).account;
        console.log('Setting active account:', account);
        msalInstance.setActiveAccount(account);
    }
});

// Initialize MSAL and handle redirect
msalInstance.initialize().then(() => {
    // Handle redirect promise
    msalInstance.handleRedirectPromise().then((response) => {
        if (response && response.account) {
            console.log('Redirect response account:', response.account);
            msalInstance.setActiveAccount(response.account);
        }
    }).catch((error) => {
        console.error('Redirect promise error:', error);
    });
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App instance={msalInstance} />
  </React.StrictMode>,
)
