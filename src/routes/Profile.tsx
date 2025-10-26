import { useState, useEffect } from 'react';
import { User, Clock, Globe, LogOut, RefreshCw, Users } from 'lucide-react';
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from '@azure/msal-react';
import Loader from '@/components/Loader';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { ParticipantGroup, User as FirestoreUser } from '@/types/firestore';

export default function Profile() {
  const { instance, accounts } = useMsal();
  
  const account = accounts[0];
  const isAuthenticated = accounts.length > 0;
  
  const [currentUser, setCurrentUser] = useState<FirestoreUser | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && account) {
      initializeCurrentUser();
    }
  }, [isAuthenticated, account]);

  useEffect(() => {
    if (currentUser) {
      loadConnections();
    }
  }, [currentUser]);

  const initializeCurrentUser = async () => {
    if (!account) return;
    
    try {
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', account.username)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as FirestoreUser;
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadConnections = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      // Get all groups where user is owner or participant
      const ownerGroupsQuery = query(
        collection(db, 'participantGroups'),
        where('ownerId', '==', currentUser.id)
      );
      const ownerSnapshot = await getDocs(ownerGroupsQuery);
      
      const participantGroupsQuery = query(
        collection(db, 'participantGroups'),
        where('participants', 'array-contains', currentUser.id)
      );
      const participantSnapshot = await getDocs(participantGroupsQuery);
      
      // Combine and get unique group IDs
      const allGroups = [
        ...ownerSnapshot.docs.map(doc => doc.id),
        ...participantSnapshot.docs.map(doc => doc.id)
      ];
      const uniqueGroupIds = [...new Set(allGroups)];
      
      // Get all participants from all groups
      const allParticipantIds = new Set<string>();
      for (const groupId of uniqueGroupIds) {
        const groupDoc = await getDoc(doc(collection(db, 'participantGroups'), groupId));
        const groupData = groupDoc.data() as ParticipantGroup;
        if (groupData.participants) {
          groupData.participants.forEach(p => allParticipantIds.add(p));
        }
        // Also add the owner
        if (groupData.ownerId) {
          allParticipantIds.add(groupData.ownerId);
        }
      }
      
      // Get user details for all connections
      const connectionsData = await Promise.all(
        Array.from(allParticipantIds).map(async (userId) => {
          const userDoc = await getDoc(doc(collection(db, 'users'), userId));
          const userData = userDoc.data() as FirestoreUser;
          return {
            id: userId,
            email: userData?.email,
            displayName: userData?.displayName
          };
        })
      );
      
      setConnections(connectionsData);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setIsLoading(false);
    }
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

          {/* Connections */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Connections
            </h2>
            
            {isLoading ? (
              <div className="text-center py-8">
                <Loader size="md" />
              </div>
            ) : connections.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No connections yet. Create or join groups to see your connections.
              </p>
            ) : (
              <div className="space-y-2">
                {connections.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {(connection.displayName || connection.email)?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {connection.displayName || connection.email}
                        </p>
                        <p className="text-sm text-gray-600">{connection.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
