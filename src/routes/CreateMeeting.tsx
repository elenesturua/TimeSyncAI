import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MapPin, Plus, X, Send, Clock, Mail, ArrowLeft } from 'lucide-react';
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
  const [emailError, setEmailError] = useState('');

  const addParticipant = () => {
    const email = newParticipantEmail.trim().toLowerCase();
    
    if (!email) {
      setEmailError('Please enter an email address');
      return;
    }
    
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (participants.some(p => p.email === email)) {
      setEmailError('This email is already added');
      return;
    }
    
    if (email === account?.username) {
      setEmailError('You cannot add yourself as a participant');
      return;
    }
    
    setParticipants([...participants, { email }]);
    setNewParticipantEmail('');
    setEmailError('');
  };

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter(p => p.email !== email));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addParticipant();
    }
  };

  const handleCreateMeeting = async () => {
    if (!meetingName.trim()) {
      alert('Please enter a meeting name');
      return;
    }
    
    if (participants.length === 0) {
      alert('Please add at least one participant');
      return;
    }

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
      
      // Navigate to meeting room with generated ID
      const meetingId = Math.random().toString(36).substr(2, 9);
      navigate(`/meeting/${meetingId}`, { 
        state: { 
          meetingData,
          isOrganizer: true 
        } 
      });
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to create meeting. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </button>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Meeting</h1>
            <p className="text-gray-600">Set up a new meeting and invite participants</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meeting Details */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Meeting Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Name *
                </label>
                <input
                  type="text"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  placeholder="e.g., Weekly Team Sync, Project Planning"
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Conference Room A, Zoom Meeting"
                    className="input-field pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Participants
            </h2>
            
            <div className="space-y-4">
              {/* Add Participant */}
              <div className="flex space-x-2">
                <div className="flex-1">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={newParticipantEmail}
                      onChange={(e) => {
                        setNewParticipantEmail(e.target.value);
                        setEmailError('');
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter email address"
                      className="input-field pl-10"
                    />
                  </div>
                  {emailError && (
                    <p className="text-red-600 text-sm mt-1">{emailError}</p>
                  )}
                </div>
                <button
                  onClick={addParticipant}
                  className="btn-secondary flex items-center space-x-2 px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Participants List */}
              {participants.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''} added
                  </p>
                  <div className="space-y-2">
                    {participants.map((participant, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
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
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No participants added yet</p>
                  <p className="text-sm">Add email addresses above to invite people</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Summary</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Meeting Name</p>
                <p className="font-medium text-gray-900">
                  {meetingName || 'Not specified'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">
                  {location || 'Not specified'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Participants</p>
                <p className="font-medium text-gray-900">
                  {participants.length} person{participants.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="h-2 w-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Send invites to participants</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="h-2 w-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Get AI-powered time suggestions</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="h-2 w-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Book the meeting automatically</p>
              </div>
            </div>
            
            <button
              onClick={handleCreateMeeting}
              disabled={isCreating || !meetingName.trim() || participants.length === 0}
              className="btn-primary w-full mt-6 flex items-center justify-center space-x-2"
            >
              {isCreating ? (
                <>
                  <Loader size="sm" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Create Meeting</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}