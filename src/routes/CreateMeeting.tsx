import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, Plus, X, Send } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import Loader from '@/components/Loader';

interface Participant {
  email: string;
  name?: string;
}

export default function CreateMeeting() {
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const account = accounts[0];
  
  const [meetingName, setMeetingName] = useState('');
  const [location, setLocation] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const addParticipant = () => {
    if (newParticipantEmail.trim() && isValidEmail(newParticipantEmail.trim())) {
      const email = newParticipantEmail.trim().toLowerCase();
      if (!participants.some(p => p.email === email)) {
        setParticipants([...participants, { email }]);
        setNewParticipantEmail('');
      }
    }
  };

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter(p => p.email !== email));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleCreateMeeting = async () => {
    if (!meetingName.trim() || participants.length === 0) return;

    setIsCreating(true);
    try {
      // TODO: Call backend API to create meeting invitation
      const meetingData = {
        name: meetingName.trim(),
        location: location.trim(),
        organizer: account?.username,
        participants: participants.map(p => p.email)
      };

      console.log('Creating meeting:', meetingData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to success page or meeting room
      navigate('/meeting-sent', { state: { meetingData } });
    } catch (error) {
      console.error('Failed to create meeting:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600">
            Please sign in to create a meeting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Meeting Link</h1>
        <p className="text-gray-600">
          Invite participants and let AI find the perfect time for everyone.
        </p>
      </div>

      <div className="card space-y-6">
        {/* Meeting Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 inline mr-2" />
            Meeting Name *
          </label>
          <input
            type="text"
            value={meetingName}
            onChange={(e) => setMeetingName(e.target.value)}
            placeholder="e.g., Project Planning Meeting"
            className="input-field"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="h-4 w-4 inline mr-2" />
            Location (Optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Conference Room A or Teams Meeting"
            className="input-field"
          />
        </div>

        {/* Participants */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="h-4 w-4 inline mr-2" />
            Participants *
          </label>
          
          <div className="flex space-x-2 mb-3">
            <input
              type="email"
              value={newParticipantEmail}
              onChange={(e) => setNewParticipantEmail(e.target.value)}
              placeholder="Enter email address"
              className="input-field flex-1"
              onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
            />
            <button
              onClick={addParticipant}
              disabled={!newParticipantEmail.trim() || !isValidEmail(newParticipantEmail.trim())}
              className="btn-primary flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>

          {participants.length > 0 && (
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-sm">
                        {participant.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-900">{participant.email}</span>
                  </div>
                  <button
                    onClick={() => removeParticipant(participant.email)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">🔒</span>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Privacy Notice</h3>
              <p className="text-sm text-blue-700">
                We only read free/busy status from your calendar. Your event details always stay private.
              </p>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateMeeting}
          disabled={!meetingName.trim() || participants.length === 0 || isCreating}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          {isCreating ? (
            <>
              <Loader size="sm" />
              <span>Sending Invitations...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Send Meeting Invitations</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
