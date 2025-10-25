import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Calendar, Clock, MapPin, Mail, Edit, Trash2, ArrowRight, Star, AlertCircle } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import Loader from '@/components/Loader';
import PrioritySettings from '@/components/PrioritySettings';

interface Group {
  id: string;
  name: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

interface Participant {
  email: string;
  name?: string;
  priority: number;
  conflicts: string[];
}

interface MeetingForm {
  name: string;
  location: string;
  timeRange: {
    start: string;
    end: string;
  };
  participants: string[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const account = accounts[0];
  const isAuthenticated = accounts.length > 0;
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState<MeetingForm>({
    name: '',
    location: '',
    timeRange: {
      start: '',
      end: ''
    },
    participants: []
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showPrioritySettings, setShowPrioritySettings] = useState(false);
  const [participantPriorities, setParticipantPriorities] = useState<Participant[]>([]);
  const [hasConflicts, setHasConflicts] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      // TODO: Load groups from backend
      // Mock data for now
      const mockGroups: Group[] = [
        {
          id: '1',
          name: 'Development Team',
          participants: ['john@example.com', 'jane@example.com', 'bob@example.com'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Marketing Squad',
          participants: ['alice@example.com', 'charlie@example.com'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setGroups(mockGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeeting = () => {
    setShowMeetingForm(true);
  };

  const handleUseGroup = (group: Group) => {
    setMeetingForm(prev => ({
      ...prev,
      participants: group.participants
    }));
    setShowMeetingForm(true);
  };

  const handleCreateGroup = () => {
    setShowGroupForm(true);
  };

  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (meetingForm.participants.length === 0) {
      alert('Please add participants first');
      return;
    }

    try {
      // TODO: Save group to backend
      const newGroup: Group = {
        id: Math.random().toString(36).substr(2, 9),
        name: newGroupName.trim(),
        participants: meetingForm.participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setGroups([...groups, newGroup]);
      setNewGroupName('');
      setShowGroupForm(false);
      alert('Group saved successfully!');
    } catch (error) {
      console.error('Failed to save group:', error);
      alert('Failed to save group. Please try again.');
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setShowGroupForm(true);
    setNewGroupName(group.name);
    setMeetingForm(prev => ({
      ...prev,
      participants: group.participants
    }));
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      try {
        // TODO: Delete group from backend
        setGroups(groups.filter(g => g.id !== groupId));
        alert('Group deleted successfully!');
      } catch (error) {
        console.error('Failed to delete group:', error);
        alert('Failed to delete group. Please try again.');
      }
    }
  };

  const handleSendMeetingRequest = async () => {
    if (!meetingForm.name.trim()) {
      alert('Please enter a meeting name');
      return;
    }

    if (!meetingForm.timeRange.start || !meetingForm.timeRange.end) {
      alert('Please select a time range');
      return;
    }

    if (meetingForm.participants.length === 0) {
      alert('Please add participants');
      return;
    }

    try {
      // TODO: Check for scheduling conflicts
      // For demo purposes, simulate conflict detection
      const hasConflicts = Math.random() > 0.5; // 50% chance of conflicts
      
      if (hasConflicts) {
        // Show priority settings for conflict resolution
        const participantsWithPriorities: Participant[] = meetingForm.participants.map(email => ({
          email,
          priority: 0, // Not set initially
          conflicts: [`Conflict at ${meetingForm.timeRange.start}`] // Mock conflicts
        }));
        
        setParticipantPriorities(participantsWithPriorities);
        setShowPrioritySettings(true);
        return;
      }

      // No conflicts - proceed with normal flow
      await sendMeetingRequest();
    } catch (error) {
      console.error('Failed to send meeting request:', error);
      alert('Failed to send meeting request. Please try again.');
    }
  };

  const sendMeetingRequest = async () => {
    try {
      // TODO: Send meeting request to backend
      console.log('Sending meeting request:', meetingForm);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success and ask about saving group
      const shouldSaveGroup = confirm(
        `Meeting request sent to ${meetingForm.participants.length} participants!\n\nWould you like to save this as a group for future use?`
      );
      
      if (shouldSaveGroup) {
        setShowGroupForm(true);
      } else {
        // Reset form
        setMeetingForm({
          name: '',
          location: '',
          timeRange: { start: '', end: '' },
          participants: []
        });
        setShowMeetingForm(false);
      }
    } catch (error) {
      console.error('Failed to send meeting request:', error);
      alert('Failed to send meeting request. Please try again.');
    }
  };

  const handlePriorityChange = (email: string, priority: number) => {
    setParticipantPriorities(prev => 
      prev.map(p => p.email === email ? { ...p, priority } : p)
    );
  };

  const handlePriorityConfirm = async () => {
    try {
      // TODO: Call AI service with priority settings
      console.log('Processing priorities:', participantPriorities);
      
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show AI suggestions or proceed with booking
      alert('AI found the best time based on your priorities! Meeting request sent.');
      
      setShowPrioritySettings(false);
      setShowMeetingForm(false);
      
      // Reset form
      setMeetingForm({
        name: '',
        location: '',
        timeRange: { start: '', end: '' },
        participants: []
      });
    } catch (error) {
      console.error('Failed to process priorities:', error);
      alert('Failed to process priorities. Please try again.');
    }
  };

  const addParticipant = (email: string) => {
    if (email.trim() && !meetingForm.participants.includes(email.trim())) {
      setMeetingForm(prev => ({
        ...prev,
        participants: [...prev.participants, email.trim()]
      }));
    }
  };

  const removeParticipant = (email: string) => {
    setMeetingForm(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== email)
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600">Please sign in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Create meetings and manage your groups</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <button
          onClick={handleCreateMeeting}
          className="card hover:shadow-lg transition-shadow text-left p-6"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Plus className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create New Meeting</h3>
              <p className="text-gray-600">Schedule a meeting with time preferences</p>
            </div>
          </div>
        </button>

        <button
          onClick={handleCreateGroup}
          className="card hover:shadow-lg transition-shadow text-left p-6"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create New Group</h3>
              <p className="text-gray-600">Save participants for future meetings</p>
            </div>
          </div>
        </button>
      </div>

      {/* Groups Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Your Groups
          </h2>
          <button
            onClick={loadGroups}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader text="Loading groups..." />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-600 mb-4">Create your first group to quickly invite the same people</p>
            <button onClick={handleCreateGroup} className="btn-primary">
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleEditGroup(group)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Edit group"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">
                    {group.participants.length} participant{group.participants.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.participants.slice(0, 2).map((email, index) => (
                      <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {email}
                      </span>
                    ))}
                    {group.participants.length > 2 && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        +{group.participants.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleUseGroup(group)}
                  className="btn-primary w-full text-sm"
                >
                  Use for Meeting
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meeting Form Modal */}
      {showMeetingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Create Meeting</h2>
                <button
                  onClick={() => setShowMeetingForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Meeting Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Name *
                  </label>
                  <input
                    type="text"
                    value={meetingForm.name}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekly Team Sync"
                    className="input-field"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={meetingForm.location}
                      onChange={(e) => setMeetingForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Conference Room A, Zoom"
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={meetingForm.timeRange.start}
                      onChange={(e) => setMeetingForm(prev => ({ 
                        ...prev, 
                        timeRange: { ...prev.timeRange, start: e.target.value }
                      }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={meetingForm.timeRange.end}
                      onChange={(e) => setMeetingForm(prev => ({ 
                        ...prev, 
                        timeRange: { ...prev.timeRange, end: e.target.value }
                      }))}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participants *
                  </label>
                  <div className="space-y-2">
                    {meetingForm.participants.map((email, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{email}</span>
                        <button
                          onClick={() => removeParticipant(email)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="email"
                        placeholder="Add participant email"
                        className="input-field flex-1"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addParticipant(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          addParticipant(input.value);
                          input.value = '';
                        }}
                        className="btn-secondary"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowMeetingForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMeetingRequest}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Send Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Form Modal */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingGroup ? 'Edit Group' : 'Save Group'}
                </h2>
                <button
                  onClick={() => {
                    setShowGroupForm(false);
                    setEditingGroup(null);
                    setNewGroupName('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Development Team"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participants ({meetingForm.participants.length})
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {meetingForm.participants.map((email, index) => (
                      <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {email}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowGroupForm(false);
                    setEditingGroup(null);
                    setNewGroupName('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGroup}
                  className="btn-primary"
                >
                  {editingGroup ? 'Update Group' : 'Save Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Priority Settings Modal */}
      {showPrioritySettings && (
        <PrioritySettings
          participants={participantPriorities}
          onPriorityChange={handlePriorityChange}
          onConfirm={handlePriorityConfirm}
          onCancel={() => setShowPrioritySettings(false)}
        />
      )}
    </div>
  );
}
