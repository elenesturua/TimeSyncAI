import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Copy, ExternalLink, Users, Calendar, Video, Save, Plus, Edit } from 'lucide-react';
import { linkApi, withBearer } from '@/lib/api';
import { useMsal } from '@azure/msal-react';
import CopyButton from '@/components/CopyButton';
import { formatTimeSlot, parseISOTimeSlot } from '@/lib/time';
import Loader from '@/components/Loader';

export default function Success() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { instance } = useMsal();
  
  const getAccessToken = async () => {
    const account = instance.getActiveAccount();
    if (!account) throw new Error("No account");
    const response = await instance.acquireTokenSilent({
      scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
      account: account
    });
    return response.accessToken;
  };
  
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupSaved, setGroupSaved] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  
  const booking = location.state?.booking;
  const meetingData = location.state?.meetingData;

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    setIsSavingGroup(true);
    try {
      await withBearer(getAccessToken);
      
      const groupData = {
        name: groupName.trim(),
        participants: meetingData?.participants || []
      };
      
      // TODO: Call backend API to save group
      console.log('Saving group:', groupData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGroupSaved(true);
      setShowGroupForm(false);
    } catch (error) {
      console.error('Failed to save group:', error);
      alert('Failed to save group. Please try again.');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleCreateNewMeeting = () => {
    navigate('/create-meeting');
  };

  const handleViewGroups = () => {
    navigate('/groups');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meeting Booked Successfully!</h1>
        <p className="text-gray-600">
          Your meeting has been scheduled and invitations have been sent to all participants.
        </p>
      </div>

      {/* Meeting Details */}
      {booking && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Meeting Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Meeting Name</p>
                <p className="font-medium text-gray-900">{booking.title}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-medium text-gray-900">
                  {formatTimeSlot(parseISOTimeSlot(booking.startTime))}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">
                  {booking.location || 'Online Meeting'}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Meeting Link</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={booking.meetingLink || 'https://teams.microsoft.com/l/meetup-join/...'}
                    readOnly
                    className="input-field flex-1"
                  />
                  <CopyButton text={booking.meetingLink || 'https://teams.microsoft.com/l/meetup-join/...'} />
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Participants</p>
                <div className="flex flex-wrap gap-2">
                  {booking.attendees?.map((email: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 px-2 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      <div className="h-5 w-5 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-xs">
                          {email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-700">{email}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Management */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Save This Group
        </h2>
        
        <p className="text-gray-600 mb-6">
          Save these participants as a group to quickly invite them to future meetings.
        </p>

        {groupSaved ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">Group saved successfully!</p>
            </div>
          </div>
        ) : showGroupForm ? (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Development Team, Marketing Squad"
                className="input-field"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSaveGroup}
                disabled={isSavingGroup}
                className="btn-primary flex items-center space-x-2"
              >
                {isSavingGroup ? (
                  <>
                    <Loader size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Group</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowGroupForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 mb-6">
            <button
              onClick={() => setShowGroupForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save as Group</span>
            </button>
            
            <button
              onClick={() => navigate('/create-meeting')}
              className="btn-secondary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Meeting</span>
            </button>
          </div>
        )}

        {/* Group Preview */}
        {meetingData?.participants && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Group Participants</h3>
            <div className="flex flex-wrap gap-2">
              {meetingData.participants.map((email: string, index: number) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 px-2 py-1 bg-white rounded-full text-sm"
                >
                  <div className="h-5 w-5 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-xs">
                      {email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-700">{email}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={handleCreateNewMeeting}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Another Meeting</span>
        </button>
        
        <button
          onClick={handleViewGroups}
          className="btn-secondary flex items-center space-x-2"
        >
          <Users className="h-4 w-4" />
          <span>View All Groups</span>
        </button>
      </div>
    </div>
  );
}