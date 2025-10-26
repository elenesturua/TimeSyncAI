import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Calendar, X, CheckCircle, XCircle } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, deleteDoc, getDoc } from 'firebase/firestore';
import { ParticipantGroup, User as FirestoreUser } from '@/types/firestore';
import { InvitationService } from '@/services/invitationService';

interface Participant {
  email: string;
  name?: string;
  status: 'pending' | 'accepted' | 'connected';
  userId?: string;
  invitationId?: string;
}

export default function GroupManagement() {
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const account = accounts[0];
  const isAuthenticated = accounts.length > 0;
  
  const [currentUser, setCurrentUser] = useState<FirestoreUser | null>(null);
  const [groups, setGroups] = useState<ParticipantGroup[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  // New group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupParticipants, setNewGroupParticipants] = useState<Participant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);

  useEffect(() => {
    if (isAuthenticated && account) {
      console.log('🔍 Debug Info:');
      console.log('- isAuthenticated:', isAuthenticated);
      console.log('- account:', account);
      console.log('- account.username:', account.username);
      console.log('- Firebase db:', db);
      initializeCurrentUser();
    }
  }, [isAuthenticated, account]);

  useEffect(() => {
    if (currentUser) {
      loadGroups();
    }
  }, [currentUser]);

  const initializeCurrentUser = async () => {
    if (!account) return;
    
    try {
      console.log('🔍 Initializing current user:', account.username);
      
      // Test Firebase connection first
      console.log('🧪 Testing Firebase connection...');
      const testRef = collection(db, 'test');
      console.log('✅ Firebase collection reference created:', testRef);
      
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', account.username)
      );
      console.log('🔍 Querying users collection...');
      
      const userSnapshot = await getDocs(userQuery);
      console.log('📊 User snapshot:', userSnapshot);
      console.log('📊 User snapshot size:', userSnapshot.size);
      
      if (userSnapshot.empty) {
        console.log('👤 Creating new user');
        const newUser: Omit<FirestoreUser, 'id'> = {
          email: account.username,
          displayName: account.name || account.username,
          microsoftAccountId: account.homeAccountId,
          calendarConnected: false,
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        };
        
        console.log('💾 Adding user to Firestore...');
        const docRef = await addDoc(collection(db, 'users'), newUser);
        console.log('✅ New user created with ID:', docRef.id);
        setCurrentUser({ id: docRef.id, ...newUser });
      } else {
        console.log('👤 User exists, updating last active');
        const userDoc = userSnapshot.docs[0];
        const userData = { id: userDoc.id, ...userDoc.data() } as FirestoreUser;
        
        await updateDoc(doc(db, 'users', userDoc.id), {
          lastActive: new Date().toISOString(),
        });
        
        setCurrentUser(userData);
        console.log('✅ User loaded:', userData.id);
      }
    } catch (error) {
      console.error('❌ Error initializing user:', error);
      console.error('❌ Error details:', (error as Error).message);
      console.error('❌ Error stack:', (error as Error).stack);
    }
  };

  const loadGroups = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      console.log('Loading groups for user:', currentUser.id);
      
      // Get groups where user is owner
      const groupsQuery = query(
        collection(db, 'participantGroups'),
        where('ownerId', '==', currentUser.id)
      );
      
      const groupsSnapshot = await getDocs(groupsQuery);
      console.log('Groups snapshot:', groupsSnapshot.docs.length);
      
      // Get pending invitations for this user
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('inviteeEmail', '==', account.username),
        where('status', '==', 'pending')
      );
      const invitationsSnapshot = await getDocs(invitationsQuery);
      
      // Load invitations with group and admin info
      const invitationsData = await Promise.all(
        invitationsSnapshot.docs.map(async (invDoc) => {
          const invData = invDoc.data();
          // Get group info
          const groupDoc = await getDoc(doc(db, 'participantGroups', invData.meetingId));
          const groupData = groupDoc.data();
          
          // Get admin info
          const adminDoc = await getDoc(doc(db, 'users', invData.inviterId));
          const adminData = adminDoc.data();
          
          return {
            invitationId: invDoc.id,
            groupId: invData.meetingId,
            groupName: groupData?.name || 'Unknown Group',
            adminEmail: adminData?.email || 'Unknown',
            status: invData.status,
          };
        })
      );
      
      console.log('Invitations data:', invitationsData);
      setPendingInvitations(invitationsData);
      
      // Load admin info for groups
      const groupsData = await Promise.all(
        groupsSnapshot.docs.map(async (docSnapshot) => {
          const groupData = docSnapshot.data();
          // Get owner info
          const ownerDoc = await getDoc(doc(db, 'users', groupData.ownerId));
          const ownerData = ownerDoc.data();
          
          return {
            id: docSnapshot.id,
            ...groupData,
            ownerEmail: ownerData?.email || 'Unknown',
          } as ParticipantGroup & { ownerEmail: string };
        })
      );
      
      console.log('Groups data:', groupsData);
      
      setGroups(groupsData);
      
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addParticipantToNewGroup = () => {
    if (!newParticipantEmail.trim()) return;
    
    const email = newParticipantEmail.trim().toLowerCase();
    
    // Check if already added
    if (newGroupParticipants.some(p => p.email === email)) {
      return;
    }
    
    setNewGroupParticipants(prev => [...prev, {
      email,
      status: 'pending'
    }]);
    setNewParticipantEmail('');
  };

  const removeParticipantFromNewGroup = (email: string) => {
    setNewGroupParticipants(prev => prev.filter(p => p.email !== email));
  };

  const createGroup = async () => {
    if (!currentUser || !newGroupName.trim() || newGroupParticipants.length === 0) {
      console.log('❌ Cannot create group:', {
        currentUser: !!currentUser,
        groupName: newGroupName.trim(),
        participants: newGroupParticipants.length
      });
      return;
    }
    
    setIsCreatingGroup(true);
    try {
      console.log('🏗️ Creating group:', {
        name: newGroupName.trim(),
        participants: newGroupParticipants.length,
        currentUserId: currentUser.id
      });
      
      // Create the group first in Firestore to get the group ID
      const groupData: Omit<ParticipantGroup, 'id'> = {
        ownerId: currentUser.id,
        name: newGroupName.trim(),
        participants: [], // Will be populated when invitations are accepted
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 Adding group to Firestore...');
      const groupRef = await addDoc(collection(db, 'participantGroups'), groupData);
      console.log('✅ Group created with ID:', groupRef.id);
      
      // Send invitations to all participants
      console.log('📧 Sending invitations to participants...');
      const invitationResults = [];
      for (const participant of newGroupParticipants) {
        try {
          console.log(`📧 Attempting to send invitation to: ${participant.email}`);
          const invitationId = await InvitationService.createGroupInvitation(
            groupRef.id,
            currentUser.id,
            participant.email
          );
          console.log(`✅ Invitation sent successfully to ${participant.email}, ID: ${invitationId}`);
          invitationResults.push({ email: participant.email, success: true, invitationId });
        } catch (error) {
          console.error(`❌ Failed to send invitation to ${participant.email}:`, error);
          console.error(`Error details:`, error instanceof Error ? error.message : 'Unknown error');
          console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
          invitationResults.push({ email: participant.email, success: false, error });
        }
      }
      console.log('📊 Invitation results:', invitationResults);
      const succeeded = invitationResults.filter(r => r.success).length;
      const failed = invitationResults.filter(r => !r.success).length;
      console.log(`✅ Invitation sending complete: ${succeeded} succeeded, ${failed} failed`);
      
      // Reset form
      setNewGroupName('');
      setNewGroupParticipants([]);
      setShowNewGroupForm(false);
      
      // Reload groups
      console.log('🔄 Reloading groups...');
      await loadGroups();
      
      console.log('🎉 Group creation completed successfully!');
    } catch (error) {
      console.error('❌ Error creating group:', error);
      console.error('❌ Error details:', (error as Error).message);
      console.error('❌ Error stack:', (error as Error).stack);
      
      // Show user-friendly error message
      alert('Failed to create group. Please try again.');
      console.error('Full error object:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const createMeetingFromGroup = (groupId: string) => {
    navigate(`/plan?groupId=${groupId}`);
  };

  const acceptInvitation = async (invitationId: string) => {
    if (!currentUser) return;
    
    try {
      await InvitationService.acceptInvitation(invitationId, currentUser.id);
      console.log('✅ Invitation accepted');
      // Reload groups and invitations
      await loadGroups();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      const invitationRef = doc(db, 'invitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'declined',
      });
      console.log('✅ Invitation declined');
      // Reload groups and invitations
      await loadGroups();
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation');
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!currentUser) return;
    
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🗑️ Deleting group:', groupId);
      
      // Delete the group
      await deleteDoc(doc(db, 'participantGroups', groupId));
      
      // Also delete any associated invitations
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('meetingId', '==', groupId)
      );
      const invitationsSnapshot = await getDocs(invitationsQuery);
      
      const deleteInvitationPromises = invitationsSnapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'invitations', docSnapshot.id))
      );
      await Promise.all(deleteInvitationPromises);
      
      console.log('✅ Group and invitations deleted successfully');
      
      // Reload groups
      await loadGroups();
      
    } catch (error) {
      console.error('❌ Error deleting group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    console.log('Not authenticated, showing sign in message');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Please sign in</h2>
          <p className="text-gray-600">You need to be signed in to manage groups.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    console.log('Loading groups...', { currentUser, isLoading });
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading groups...</h2>
          <p className="text-gray-600">Current user: {currentUser?.email || 'Not loaded'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
            <p className="text-gray-600 mt-2">Manage your participant groups and send invitations</p>
          </div>
          
          <button
            onClick={() => setShowNewGroupForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Group</span>
          </button>
        </div>

        {/* New Group Form */}
        {showNewGroupForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Group</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Development Team, Marketing Squad"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Participants
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={newParticipantEmail}
                    onChange={(e) => setNewParticipantEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addParticipantToNewGroup()}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={addParticipantToNewGroup}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              {/* Participants List */}
              {newGroupParticipants.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Participants ({newGroupParticipants.length})</h3>
                  <div className="space-y-2">
                    {newGroupParticipants.map((participant, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-900">{participant.email}</span>
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Pending
                          </span>
                        </div>
                        <button
                          onClick={() => removeParticipantFromNewGroup(participant.email)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    console.log('🔘 Create Group button clicked!');
                    console.log('🔍 Button state:', {
                      isCreatingGroup,
                      groupName: newGroupName.trim(),
                      participants: newGroupParticipants.length,
                      currentUser: !!currentUser
                    });
                    createGroup();
                  }}
                  disabled={isCreatingGroup || !newGroupName.trim() || newGroupParticipants.length === 0}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isCreatingGroup ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating & Sending Invites...</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      <span>Create Group & Send Invites</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowNewGroupForm(false);
                    setNewGroupName('');
                    setNewGroupParticipants([]);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pending Invitations</h2>
            <div className="space-y-4">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.invitationId} className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {invitation.groupName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Admin: {invitation.adminEmail}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => acceptInvitation(invitation.invitationId)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => declineInvitation(invitation.invitationId)}
                        className="px-4 py-2 bg-transparent text-gray-500 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 flex items-center space-x-2 font-medium"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Groups</h2>
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No groups yet</h3>
              <p className="text-gray-600 mb-6">Create your first group to start inviting participants</p>
              <button
                onClick={() => setShowNewGroupForm(true)}
                className="btn-primary"
              >
                Create Your First Group
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-gray-600">
                      {group.participants.length} participants • Created {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Admin: {(group as any).ownerEmail || 'Unknown'}
                    </p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => createMeetingFromGroup(group.id)}
                      className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 shadow-sm hover:shadow flex items-center space-x-2 font-medium"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Create Meeting</span>
                    </button>
                    
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="px-5 py-2.5 bg-transparent text-gray-500 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200 flex items-center space-x-2 font-medium"
                    >
                      <X className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
                
                {/* Participants Status */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Participants</h4>
                  <p className="text-gray-500 italic">Participant details will load after invitations are sent</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

