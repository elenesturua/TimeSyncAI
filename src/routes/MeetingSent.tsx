import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Calendar, Eye, Save } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import Loader from '@/components/Loader';

export default function MeetingSent() {
  const navigate = useNavigate();
  const location = useLocation();
  const meetingData = location.state?.meetingData;
  
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupSaved, setGroupSaved] = useState(false);
  
  // Check if this is a scheduled meeting (has startTime/endTime) or just group invitations
  const isScheduledMeeting = meetingData?.startTime && meetingData?.endTime;

  if (!meetingData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Meeting Not Found</h1>
          <p className="text-gray-600 mb-6">
            The meeting information is not available.
          </p>
          <button
            onClick={() => navigate('/create-meeting')}
            className="btn-primary"
          >
            Create New Meeting
          </button>
        </div>
      </div>
    );
  }

  const meetingLink = `https://timesyncai.com/meeting/${meetingData.id || 'temp-id'}`;

  const handleSaveAsGroup = async () => {
    setIsSavingGroup(true);
    try {
      // TODO: Call backend API to save as group
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGroupSaved(true);
    } catch (error) {
      console.error('Failed to save as group:', error);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleViewMeeting = () => {
    navigate(`/meeting/${meetingData.id || 'temp-id'}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitations Sent!</h1>
        <p className="text-gray-600 mb-6">
          {isScheduledMeeting 
            ? 'Meeting invitations have been sent to all participants. They can now connect their calendars and find the perfect time.'
            : 'Group invitations have been sent to all participants. They can now connect their calendars and find the perfect meeting times.'}
        </p>

        {/* Meeting Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Meeting Details
          </h3>
          
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Meeting Name:</span>
              <p className="font-medium text-gray-900">{meetingData.name}</p>
            </div>
            
            {meetingData.location && (
              <div>
                <span className="text-sm text-gray-500">Location:</span>
                <p className="font-medium text-gray-900">{meetingData.location}</p>
              </div>
            )}
            
            <div>
              <span className="text-sm text-gray-500">Participants:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {meetingData.participants.map((email: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border">
                    <div className="h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-xs">
                        {email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700">{email}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Meeting Link - only show for scheduled meetings */}
        {isScheduledMeeting && (
          <>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700 mb-2">Meeting Link:</p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-sm bg-white p-2 rounded border text-gray-800">
                  {meetingLink}
                </code>
                <CopyButton text={meetingLink} />
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="space-y-3 mb-6">
          {isScheduledMeeting && (
            <button
              onClick={handleViewMeeting}
              className="w-full flex items-center justify-center space-x-2 btn-primary"
            >
              <Eye className="h-4 w-4" />
              <span>View Meeting Room</span>
            </button>
          )}

          {!isScheduledMeeting && (
            <button
              onClick={handleSaveAsGroup}
              disabled={isSavingGroup || groupSaved}
              className="w-full flex items-center justify-center space-x-2 btn-secondary"
            >
              {isSavingGroup ? (
                <>
                  <Loader size="sm" />
                  <span>Saving...</span>
                </>
              ) : groupSaved ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Saved as Group</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save as Group</span>
                </>
              )}
            </button>
          )}
          
          {groupSaved && (
            <p className="text-sm text-green-600">
              Group saved! You can find it in your Groups page.
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={() => navigate('/create-meeting')}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            Create Another Meeting →
          </button>
        </div>
      </div>
    </div>
  );
}
