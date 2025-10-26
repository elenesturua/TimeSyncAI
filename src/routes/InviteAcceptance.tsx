import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { InvitationService } from '@/services/invitationService';
import { CalendarService } from '@/services/calendarService';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { MeetingInvitation, User as FirestoreUser } from '@/types/firestore';

export default function InviteAcceptance() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const isAuthenticated = accounts.length > 0;
  
  const [invitation, setInvitation] = useState<MeetingInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirestoreUser | null>(null);

  useEffect(() => {
    if (token) {
      loadInvitation();
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && account) {
      initializeCurrentUser();
    }
  }, [isAuthenticated, account]);

  const loadInvitation = async () => {
    if (!token) return;
    
    try {
      const invitationData = await InvitationService.getInvitationByToken(token);
      if (!invitationData) {
        setError('Invitation not found or expired');
        return;
      }
      
      setInvitation(invitationData);
    } catch (error) {
      console.error('Error loading invitation:', error);
      setError('Failed to load invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeCurrentUser = async () => {
    if (!account) return;
    
    try {
      // Check if user exists in Firestore
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', account.username)
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        // Create new user
        const newUser: Omit<FirestoreUser, 'id'> = {
          email: account.username,
          displayName: account.name || account.username,
          microsoftAccountId: account.homeAccountId,
          calendarConnected: false,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        };
        
        const docRef = await addDoc(collection(db, 'users'), newUser);
        setCurrentUser({ id: docRef.id, ...newUser });
      } else {
        // User exists, update last active
        const userDoc = userSnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as FirestoreUser;
        
        await updateDoc(doc(db, 'users', userDoc.id), {
          lastActive: new Date().toISOString(),
        });
        
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!invitation || !currentUser) return;
    
    setIsAccepting(true);
    try {
      // Accept the invitation
      await InvitationService.acceptInvitation(invitation.id, currentUser.id);
      
      // Sync user's calendar
      await CalendarService.syncUserCalendar(currentUser.id, instance);
      
      // Update user's calendar connection status
      await updateDoc(doc(db, 'users', currentUser.id), {
        calendarConnected: true,
        calendarLastSynced: new Date().toISOString(),
      });
      
      // Navigate to success page
      navigate('/invitation-accepted', {
        state: { invitation, user: currentUser }
      });
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite']
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading invitation...</h2>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invitation Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <Calendar className="h-16 w-16 text-primary-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Invited!</h1>
            <p className="text-gray-600">
              Someone has invited you to participate in a meeting scheduling session.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Meeting Invitation</p>
                <p className="text-sm text-blue-700">Connect your calendar to help find the best time</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Privacy Protected</p>
                <p className="text-sm text-green-700">We only read free/busy times, never your event details</p>
              </div>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="space-y-4">
              <button
                onClick={handleLogin}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Sign in with Microsoft</span>
              </button>
              <p className="text-sm text-gray-500 text-center">
                Sign in to accept the invitation and connect your calendar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Signed in as:</p>
                <p className="font-medium text-gray-900">{account?.name || account?.username}</p>
              </div>
              
              <button
                onClick={handleAcceptInvitation}
                disabled={isAccepting}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {isAccepting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Accepting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Accept Invitation</span>
                  </>
                )}
              </button>
              
              <p className="text-sm text-gray-500 text-center">
                This will connect your calendar and sync your availability
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By accepting this invitation, you agree to share your calendar availability 
              to help find the best meeting time for all participants.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
