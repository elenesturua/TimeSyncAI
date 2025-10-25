import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Plus, Clock } from 'lucide-react';
import { groupsApi, withBearer, type Group } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import EmptyState from '@/components/EmptyState';
import Loader from '@/components/Loader';

export default function Groups() {
  const navigate = useNavigate();
  const { account, getAccessToken } = useAuth();
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGroup = (groupId: string) => {
    navigate(`/meeting/${groupId}`);
  };

  if (!account) {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Groups</h1>
          <p className="text-gray-600">
            Manage your saved meeting groups and recurring participants.
          </p>
        </div>
        <button
          onClick={() => navigate('/create-meeting')}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Meeting</span>
        </button>
      </div>

      {isLoading ? (
        <div className="card">
          <Loader text="Loading groups..." />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No groups yet"
          description="Save a meeting as a group to quickly schedule recurring meetings with the same participants."
          action={
            <button
              onClick={() => navigate('/create-meeting')}
              className="btn-primary"
            >
              Create Your First Meeting
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenGroup(group.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 truncate">
                  {group.name}
                </h3>
                <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{group.participants.length} participants</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {group.participants.slice(0, 3).map((participant, index) => (
                  <div
                    key={index}
                    className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center"
                    title={participant.displayName || participant.email}
                  >
                    <span className="text-xs font-medium text-gray-600">
                      {(participant.displayName || participant.email).charAt(0)}
                    </span>
                  </div>
                ))}
                {group.participants.length > 3 && (
                  <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-500">
                      +{group.participants.length - 3}
                    </span>
                  </div>
                )}
              </div>

              <button className="w-full btn-secondary text-sm">
                Open Group
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
