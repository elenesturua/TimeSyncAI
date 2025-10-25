import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, Globe, Phone, LogOut, RefreshCw } from 'lucide-react';
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import HoursChips from '@/components/HoursChips';
import Loader from '@/components/Loader';

export default function Profile() {
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  
  const account = accounts[0];
  const isAuthenticated = accounts.length > 0;
  
  const [preferredHours, setPreferredHours] = useState({ start: '09:00', end: '17:00' });
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [phone, setPhone] = useState('');
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    // Load user preferences from localStorage or API
    const savedHours = localStorage.getItem('preferredHours');
    const savedPhone = localStorage.getItem('phone');
    
    if (savedHours) {
      setPreferredHours(JSON.parse(savedHours));
    }
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem('preferredHours', JSON.stringify(preferredHours));
    localStorage.setItem('phone', phone);
    // TODO: Save to backend API
  };

  const handleReconnectOutlook = async () => {
    setIsReconnecting(true);
    try {
      await instance.acquireTokenSilent({
        scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
        account: account
      });
      // TODO: Call backend to reconnect calendar
    } catch (error) {
      console.error('Failed to reconnect Outlook:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleSignOut = () => {
    instance.logoutRedirect();
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600">
            Please sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <AuthenticatedTemplate>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your preferences and account settings.</p>
        </div>

        <div className="space-y-6">
          {/* Account Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Account Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <p className="text-gray-900">{account?.name || account?.username}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-gray-900">{account?.username}</p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Preferences
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preferred Hours
                </label>
                <HoursChips value={preferredHours} onChange={setPreferredHours} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input-field"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="input-field"
                />
              </div>

              <button
                onClick={handleSavePreferences}
                className="btn-primary"
              >
                Save Preferences
              </button>
            </div>
          </div>

          {/* Calendar Connection */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Calendar Connection
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-medium text-sm">✓</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Outlook Calendar</p>
                    <p className="text-sm text-gray-600">Connected</p>
                  </div>
                </div>
                <button
                  onClick={handleReconnectOutlook}
                  disabled={isReconnecting}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {isReconnecting ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Reconnect</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            
            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600">
            Please sign in to view your profile.
          </p>
        </div>
      </UnauthenticatedTemplate>
    </div>
  );
}
