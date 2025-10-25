import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, Settings, LogIn, RefreshCw, Clock } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import ParticipantCard from '@/components/ParticipantCard';
import SuggestionCard from '@/components/SuggestionCard';
import BookingModal from '@/components/BookingModal';
import AdvancedDrawer from '@/components/AdvancedDrawer';
import PrivacyBanner from '@/components/PrivacyBanner';
import EmptyState from '@/components/EmptyState';
import Loader from '@/components/Loader';

interface MeetingData {
  id: string;
  name: string;
  location?: string;
  organizer: string;
  participants: string[];
}

export default function MeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  
  const getAccessToken = async () => {
    if (!account) throw new Error("No account");
    const response = await instance.acquireTokenSilent({
      scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
      account: account
    });
    return response.accessToken;
  };
  
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowAbsences, setAllowAbsences] = useState(0);

  useEffect(() => {
    if (id) {
      loadMeetingData();
      loadParticipants();
    }
  }, [id]);

  const loadMeetingData = async () => {
    if (!id) return;
    
    setIsLoadingMeeting(true);
    try {
      // TODO: Call backend API to get meeting data
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for now
      setMeetingData({
        id,
        name: "Project Planning Meeting",
        location: "Conference Room A",
        organizer: "organizer@example.com",
        participants: ["participant1@example.com", "participant2@example.com"]
      });
    } catch (error) {
      console.error('Failed to load meeting data:', error);
    } finally {
      setIsLoadingMeeting(false);
    }
  };

  const loadParticipants = async () => {
    if (!id) return;
    
    setIsLoadingParticipants(true);
    try {
      // TODO: Call backend API to get participants
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for now
      setParticipants([
        { email: "participant1@example.com", displayName: "John Doe", timezone: "EST", connected: true },
        { email: "participant2@example.com", displayName: "Jane Smith", timezone: "PST", connected: false }
      ]);
    } catch (error) {
      console.error('Failed to load participants:', error);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const connectCalendar = async () => {
    if (!account) {
      instance.loginRedirect({
        scopes: ['Calendars.Read', 'Calendars.ReadWrite']
      });
      return;
    }

    try {
      await getAccessToken();
      // TODO: Call backend to connect calendar
      await loadParticipants();
    } catch (error) {
      console.error('Failed to connect calendar:', error);
    }
  };

  const getSuggestions = async () => {
    if (!id) return;

    setIsLoadingSuggestions(true);
    try {
      // TODO: Call backend API to get suggestions
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock suggestions
      setSuggestions([
        {
          startISO: "2024-01-15T10:00:00Z",
          endISO: "2024-01-15T11:00:00Z",
          attendeesFree: ["participant1@example.com"],
          attendeesMissing: ["participant2@example.com"],
          badges: ["All free", "Within hours"],
          reason: "All participants are available during their preferred hours"
        }
      ]);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleBook = async (booking: any) => {
    if (!id) return;

    try {
      await getAccessToken();
      // TODO: Call backend API to book meeting
      navigate(`/meeting/${id}/success`, { state: { booking } });
    } catch (error) {
      console.error('Failed to book meeting:', error);
    }
  };

  if (isLoadingMeeting) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Loader text="Loading meeting..." />
      </div>
    );
  }

  if (!meetingData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Meeting Not Found</h1>
          <p className="text-gray-600">
            This meeting link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const connectedParticipants = participants.filter(p => p.connected);
  const isUserConnected = account && participants.some(p => p.email === account.username);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{meetingData.name}</h1>
        {meetingData.location && (
          <p className="text-gray-600 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {meetingData.location}
          </p>
        )}
      </div>

      <PrivacyBanner />

      {!account ? (
        <div className="card text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in with Outlook</h2>
          <p className="text-gray-600 mb-6">
            Connect your Outlook calendar to participate in scheduling.
          </p>
          <button onClick={signIn} className="btn-primary">
            Sign in with Outlook
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Participants Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Participants ({participants.length})
              </h2>
              <button
                onClick={loadParticipants}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {isLoadingParticipants ? (
              <Loader text="Loading participants..." />
            ) : participants.length === 0 ? (
              <EmptyState
                icon={<Users className="h-12 w-12" />}
                title="No participants yet"
                description="Waiting for participants to join..."
              />
            ) : (
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <ParticipantCard key={index} participant={participant} />
                ))}
              </div>
            )}

            {account && !isUserConnected && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={connectCalendar}
                  className="btn-primary w-full"
                >
                  Connect My Calendar
                </button>
              </div>
            )}
          </div>

          {/* Suggestions Section */}
          {connectedParticipants.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Time Suggestions
                </h2>
                <button
                  onClick={() => setShowAdvanced(true)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Advanced</span>
                </button>
              </div>

              <button
                onClick={getSuggestions}
                disabled={isLoadingSuggestions}
                className="btn-primary w-full mb-4 flex items-center justify-center space-x-2"
              >
                {isLoadingSuggestions ? (
                  <>
                    <Loader size="sm" />
                    <span>Getting Suggestions...</span>
                  </>
                ) : (
                  <span>Get Suggestions</span>
                )}
              </button>

              {suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.slice(0, 5).map((suggestion, index) => (
                    <SuggestionCard
                      key={index}
                      suggestion={suggestion}
                      onBook={setSelectedSuggestion}
                    />
                  ))}
                </div>
              ) : !isLoadingSuggestions && (
                <EmptyState
                  icon={<Clock className="h-12 w-12" />}
                  title="No suggestions yet"
                  description="Click 'Get Suggestions' to find available time slots."
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      {selectedSuggestion && (
        <BookingModal
          suggestion={selectedSuggestion}
          attendees={connectedParticipants.map(p => p.email)}
          onClose={() => setSelectedSuggestion(null)}
          onConfirm={handleBook}
        />
      )}

      {/* Advanced Settings Drawer */}
      <AdvancedDrawer
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        participants={connectedParticipants}
        onSettingsChange={(settings) => {
          setAllowAbsences(settings.allowAbsences);
        }}
      />
    </div>
  );
}
