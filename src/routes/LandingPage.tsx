import { useNavigate } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import { Calendar, LogIn } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '@/authConfig';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = accounts.length > 0;
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Debug logging
  console.log('LandingPage - Accounts:', accounts.length);
  console.log('LandingPage - Is Authenticated:', isAuthenticated);
  console.log('LandingPage - In Progress:', inProgress);
  console.log('LandingPage - Is Redirecting:', isRedirecting);
  console.log('LandingPage - Has Redirected:', hasRedirected);

  // Handle redirect processing
  useEffect(() => {
    console.log('LandingPage useEffect - inProgress:', inProgress, 'isAuthenticated:', isAuthenticated);
    
    // If MSAL is processing a redirect, show loading
    if (inProgress === 'handleRedirect') {
      console.log('LandingPage - Setting redirecting to true');
      setIsRedirecting(true);
    } else if (inProgress === 'none') {
      // Redirect is complete
      console.log('LandingPage - Setting redirecting to false');
      setIsRedirecting(false);
      
      // If user is authenticated, redirect with small delay
      if (isAuthenticated && !hasRedirected) {
        console.log('LandingPage - User authenticated, redirecting to /groups');
        setHasRedirected(true);
                 setTimeout(() => {
                   console.log('LandingPage - Executing redirect to /groups');
                   navigate('/groups');
                 }, 100);
      }
    }
  }, [inProgress, isAuthenticated, navigate, hasRedirected]);

  const handleLoginRedirect = () => {
    setIsRedirecting(true);
    instance.loginRedirect(loginRequest).catch((error) => {
      console.log(error);
      setIsRedirecting(false);
    });
  };

  // Show loading during redirect processing
  if (isRedirecting || inProgress === 'handleRedirect') {
    console.log('LandingPage - Showing loading screen');
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
          <p className="text-gray-600">Please wait while we redirect you to Outlook</p>
        </div>
      </div>
    );
  }

  // Don't render login page if authenticated or has redirected
  if (isAuthenticated || hasRedirected) {
    console.log('LandingPage - User is authenticated or has redirected, showing redirect screen');
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center mb-8">
          <Calendar className="h-16 w-16 text-primary-500 mr-4" />
          <h1 className="text-6xl font-bold text-gray-900">TimeSyncAI</h1>
        </div>
        
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-8">
          Schedule meetings without the back-and-forth
        </h2>
        
        <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
          AI-powered scheduling for teams. Create groups, connect calendars, and let our smart assistant find the perfect time for everyone.
        </p>

        <div className="flex items-center justify-center">
          <button
            onClick={handleLoginRedirect}
            className="btn-primary text-xl px-12 py-6 flex items-center space-x-3 hover:scale-105 transition-transform"
          >
            <LogIn className="h-6 w-6" />
            <span>Log in with Outlook</span>
          </button>
        </div>

        {/* Privacy Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 max-w-3xl mx-auto mt-16">
          <div className="flex items-start space-x-4">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-green-600 font-bold">🔒</span>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-green-900 mb-2">Privacy First</h3>
              <p className="text-green-700 text-lg">
                We only read free/busy times, never your event details or personal information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
