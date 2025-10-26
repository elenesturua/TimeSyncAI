import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Clock, Edit, Trash2, ArrowRight } from 'lucide-react';
import { groupsApi, withBearer, type Group } from '@/lib/api';
import { useMsal } from '@azure/msal-react';
import EmptyState from '@/components/EmptyState';
import Loader from '@/components/Loader';

export default function Groups() {
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const isAuthenticated = accounts.length > 0;
  
  const getAccessToken = async () => {
    if (!account) throw new Error("No account");
    const response = await instance.acquireTokenSilent({
      scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
      account: account
    });
    return response.accessToken;
  };
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      await withBearer(getAccessToken);
      const data = await groupsApi.getAll();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
      // For demo purposes, show some mock data
      setGroups([
        {
          id: '1',
          name: 'Development Team',
          participants: [
            { email: 'john@example.com', displayName: 'John Doe', timezone: 'UTC', connected: true },
            { email: 'jane@example.com', displayName: 'Jane Smith', timezone: 'UTC', connected: true },
            { email: 'bob@example.com', displayName: 'Bob Johnson', timezone: 'UTC', connected: false }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: '2', 
          name: 'Marketing Squad',
          participants: [
            { email: 'alice@example.com', displayName: 'Alice Brown', timezone: 'UTC', connected: true },
            { email: 'charlie@example.com', displayName: 'Charlie Wilson', timezone: 'UTC', connected: false }
          ],
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGroup = (groupId: string) => {
    navigate(`/meeting/${groupId}`);
  };

  const handleCreateNewGroup = () => {
    navigate('/create-meeting');
  };

  const handleEditGroup = (groupId: string) => {
    // TODO: Implement edit group functionality
    console.log('Edit group:', groupId);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        // TODO: Implement delete functionality
        console.log('Delete group:', groupId);
        setGroups(groups.filter(g => g.id !== groupId));
      } catch (error) {
        console.error('Failed to delete group:', error);
        alert('Failed to delete group. Please try again.');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600">
            Please sign in to view your saved groups.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
            <p className="text-gray-600">Manage your saved participant groups</p>
          </div>
        </div>
        
        <button
          onClick={handleCreateNewGroup}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Group</span>
        </button>
      </div>

      {/* Groups List */}
      {isLoading ? (
        <div className="card text-center py-12">
          <Loader text="Loading groups..." />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No groups yet"
          description="Create your first group to quickly invite the same people to meetings"
          action={
            <button
              onClick={handleCreateNewGroup}
              className="btn-primary"
            >
              Create Group
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {group.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {group.participants.length} participant{group.participants.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditGroup(group.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Edit group"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Participants */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {group.participants.slice(0, 3).map((participant, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 px-2 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      <div className="h-5 w-5 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-xs">
                          {participant.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-700">{participant.email}</span>
                    </div>
                  ))}
                  {group.participants.length > 3 && (
                    <div className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                      +{group.participants.length - 3} more
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>
                    Updated {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <button
                  onClick={() => handleOpenGroup(group.id)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <span>Use Group</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}