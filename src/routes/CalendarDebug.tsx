import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { createGraphClient, getUserProfile, getCalendarEvents } from '@/lib/graphApi';
import { Calendar, User, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function CalendarDebug() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testCalendarConnection = async () => {
    if (!account) {
      setError('No account found. Please sign in first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Testing calendar connection...');
      
      // Acquire token
      const response = await instance.acquireTokenSilent({
        scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
        account: account
      });
      
      console.log('✅ Token acquired:', response.accessToken ? 'Yes' : 'No');
      
      // Create Graph client
      const graphClient = createGraphClient(instance);
      console.log('✅ Graph client created');
      
      // Get user profile
      const profile = await getUserProfile(graphClient);
      setUserProfile(profile);
      console.log('✅ User profile:', profile);
      
      // Get calendar events
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);
      
      const events = await getCalendarEvents(graphClient, startDate, endDate);
      setCalendarEvents(events);
      console.log('✅ Calendar events:', events);
      
      console.log('🎉 Calendar test completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Calendar test failed:', error);
      setError(error.message || 'Failed to connect to calendar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Calendar className="h-6 w-6 mr-2" />
          Calendar Debug Test
        </h1>
        
        <div className="space-y-6">
          {/* Account Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Account Information
            </h3>
            {account ? (
              <div className="text-sm text-gray-600">
                <p><strong>Username:</strong> {account.username}</p>
                <p><strong>Account ID:</strong> {account.homeAccountId}</p>
                <p><strong>Environment:</strong> {account.environment}</p>
              </div>
            ) : (
              <p className="text-red-600">No account found. Please sign in.</p>
            )}
          </div>

          {/* Test Button */}
          <div className="flex justify-center">
            <button
              onClick={testCalendarConnection}
              disabled={isLoading || !account}
              className="btn-primary flex items-center space-x-2 px-6 py-3"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  <span>Test Calendar Connection</span>
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Error</p>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Results */}
          {userProfile && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">Connection Successful!</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-green-900">User Profile:</h4>
                  <div className="text-sm text-green-700 ml-4">
                    <p><strong>Name:</strong> {userProfile.displayName}</p>
                    <p><strong>Email:</strong> {userProfile.mail || userProfile.userPrincipalName}</p>
                    <p><strong>ID:</strong> {userProfile.id}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-green-900">Calendar Events ({calendarEvents.length}):</h4>
                  {calendarEvents.length > 0 ? (
                    <div className="text-sm text-green-700 ml-4 space-y-1 max-h-40 overflow-y-auto">
                      {calendarEvents.map((event, index) => (
                        <div key={event.id} className="p-2 bg-green-100 rounded">
                          <p className="font-medium">{event.subject}</p>
                          <p className="text-xs">
                            {new Date(event.start.dateTime).toLocaleString()} - {new Date(event.end.dateTime).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-700 ml-4">No events found in the next 7 days</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">How to Test:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Make sure you're signed in with your Outlook account</li>
              <li>Click "Test Calendar Connection" button</li>
              <li>Check the browser console (F12) for detailed logs</li>
              <li>Look for the green success message above</li>
              <li>Verify your calendar events are displayed</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
