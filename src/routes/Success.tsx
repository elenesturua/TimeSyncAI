import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Copy, ExternalLink, Users, Calendar, Video } from 'lucide-react';
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
  
  const booking = location.state?.booking;

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600 mb-6">
            The booking information is not available. Please try booking again.
          </p>
          <button
            onClick={() => navigate(`/meeting/${id}`)}
            className="btn-primary"
          >
            Back to Meeting Room
          </button>
        </div>
      </div>
    );
  }

  const timeSlot = parseISOTimeSlot(booking.startISO, booking.endISO);

  const handleSaveAsGroup = async () => {
    if (!id) return;

    setIsSavingGroup(true);
    try {
      await withBearer(getAccessToken);
      await linkApi.saveAsGroup(id);
      setGroupSaved(true);
    } catch (error) {
      console.error('Failed to save as group:', error);
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleOpenOutlook = () => {
    window.open(booking.outlookLink, '_blank');
  };

  const handleOpenTeams = () => {
    window.open(booking.teamsLink, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Meeting Booked!</h1>
        <p className="text-gray-600 mb-6">
          Your meeting has been successfully scheduled. Teams link ready.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="h-5 w-5 text-primary-500" />
            <span className="font-medium text-gray-900">Meeting Details</span>
          </div>
          <p className="text-gray-700 mb-2">{formatTimeSlot(timeSlot)}</p>
          <p className="text-sm text-gray-500">{timeSlot.timezone}</p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={handleOpenTeams}
            className="w-full flex items-center justify-center space-x-2 btn-primary"
          >
            <Video className="h-4 w-4" />
            <span>Open in Teams</span>
          </button>

          <button
            onClick={handleOpenOutlook}
            className="w-full flex items-center justify-center space-x-2 btn-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open in Outlook</span>
          </button>

          <div className="flex space-x-2">
            <CopyButton 
              text={booking.teamsLink} 
              className="flex-1"
            />
            <CopyButton 
              text={booking.outlookLink} 
              className="flex-1"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
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
                <Users className="h-4 w-4" />
                <span>Save as Group</span>
              </>
            )}
          </button>
          
          {groupSaved && (
            <p className="text-sm text-green-600 mt-2">
              Group saved! You can find it in your Groups page.
            </p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/groups')}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            View All Groups →
          </button>
        </div>
      </div>
    </div>
  );
}
