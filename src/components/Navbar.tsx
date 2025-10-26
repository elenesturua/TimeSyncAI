import { Link, useLocation } from 'react-router-dom';
import { Calendar, User, LogOut, LogIn } from 'lucide-react';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { loginRequest } from '@/authConfig';

export default function Navbar() {
  const { instance, accounts } = useMsal();
  const location = useLocation();
  
  const isLandingPage = location.pathname === '/';
  const isAuthenticated = accounts.length > 0;
  
  // Debug logging
  console.log('Navbar - Accounts:', accounts);
  console.log('Navbar - Active Account:', instance.getActiveAccount());
  console.log('Navbar - Is Authenticated:', isAuthenticated);

  const handleLoginRedirect = () => {
    instance.loginRedirect(loginRequest).catch((error) => console.log(error));
  };

  const handleLogoutRedirect = () => {
    instance.logoutRedirect().catch((error) => console.log(error));
  };

  return (
    <nav className={`${isLandingPage ? 'hidden' : 'bg-white border-b border-gray-200'} px-4 py-3 transition-colors`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Calendar className={`h-8 w-8 ${isLandingPage ? 'text-white' : 'text-primary-500'}`} />
          <span className={`text-xl font-bold ${isLandingPage ? 'text-white' : 'text-gray-900'}`}>TimeSyncAI</span>
        </Link>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/groups"
                className={`${isLandingPage ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} px-3 py-2 rounded-lg hover:bg-white/10 transition-colors`}
              >
                My Groups
              </Link>
              <Link
                to="/plan"
                className={`${isLandingPage ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} px-3 py-2 rounded-lg hover:bg-white/10 transition-colors`}
              >
                Plan Meeting
              </Link>
              <Link
                to="/profile"
                className={`flex items-center space-x-2 ${isLandingPage ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} px-3 py-2 rounded-lg hover:bg-white/10 transition-colors`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogoutRedirect}
                className={`flex items-center space-x-1 ${isLandingPage ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} px-3 py-2 rounded-lg hover:bg-white/10 transition-colors`}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            !isLandingPage && (
              <button
                onClick={handleLoginRedirect}
                className="btn-primary flex items-center space-x-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in with Outlook</span>
              </button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
