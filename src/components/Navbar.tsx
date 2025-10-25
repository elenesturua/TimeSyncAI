import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, User, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { account, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isLandingPage = location.pathname === '/';

  return (
    <nav className={`${isLandingPage ? 'bg-transparent' : 'bg-white border-b border-gray-200'} px-4 py-3 transition-colors`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Calendar className={`h-8 w-8 ${isLandingPage ? 'text-white' : 'text-primary-500'}`} />
          <span className={`text-xl font-bold ${isLandingPage ? 'text-white' : 'text-gray-900'}`}>TimeSyncAI</span>
        </Link>

        <div className="flex items-center space-x-4">
          {account && (
            <>
              <Link
                to="/groups"
                className={`${isLandingPage ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} px-3 py-2 rounded-lg hover:bg-white/10 transition-colors`}
              >
                Groups
              </Link>
              <Link
                to="/profile"
                className={`flex items-center space-x-2 ${isLandingPage ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} px-3 py-2 rounded-lg hover:bg-white/10 transition-colors`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {account.name?.charAt(0) || account.username?.charAt(0) || 'U'}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className={`flex items-center space-x-1 ${isLandingPage ? 'text-white hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'} px-3 py-2 rounded-lg hover:bg-white/10 transition-colors`}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
