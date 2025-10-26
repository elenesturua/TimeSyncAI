import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, Settings, RefreshCw, Star } from 'lucide-react';
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

interface Participant {
  email: string;
  name?: string;
  connected: boolean;
  lastSeen?: string;
}

interface Suggestion {
  startTime: string;
  endTime: string;
  score: number;
  conflicts: number;
  participants: string[];
}

export default function MeetingRoom() {
  const { id } = useParams<{ id: string }>();
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
  
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (id) {
      loadMeetingData();
    }
  }, [id]);

  const loadMeetingData = async () => {
    setIsLoadingMeeting(true);
    try {
      // TODO: Load meeting data from backend
      // For demo purposes, create mock data
      const mockMeetingData: MeetingData = {
        id: id!,
        name: 'Weekly Team Sync',
        location: 'Conference Room A',
        organizer: 'elenesturua24@outlook.com',
        participants: ['john@example.com', 'jane@example.com', 'bob@example.com']
      };
      
      const mockParticipants: Participant[] = [
        { email: 'elenesturua24@outlook.com', name: 'Elena', connected: true },
        { email: 'john@example.com', name: 'John', connected: true },
        { email: 'jane@example.com', name: 'Jane', connected: false },
        { email: 'bob@example.com', name: 'Bob', connected: false }
      ];
      
      setMeetingData(mockMeetingData);
      setParticipants(mockParticipants);
    } catch (error) {
      console.error('Failed to load meeting data:', error);
    } finally {
      setIsLoadingMeeting(false);
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
      await loadMeetingData();
    } catch (error) {
      console.error('Failed to connect calendar:', error);
    }
  };

  const getSuggestions = async () => {
    if (!id) return;

    setIsLoadingSuggestions(true);
    try {
      // TODO: Call backend API to get AI suggestions
      // For demo purposes, create mock suggestions
      const mockSuggestions: Suggestion[] = [
        {
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          score: 95,
          conflicts: 0,
          participants: ['elenesturua24@outlook.com', 'john@example.com']
        },
        {
          startTime: '2024-01-15T14:00:00Z',
          endTime: '2024-01-15T15:00:00Z',
          score: 88,
          conflicts: 1,
          participants: ['elenesturua24@outlook.com', 'john@example.com', 'jane@example.com']
        },
        {
          startTime: '2024-01-16T09:00:00Z',
          endTime: '2024-01-16T10:00:00Z',
          score: 82,
          conflicts: 0,
          participants: ['elenesturua24@outlook.com', 'john@example.com', 'jane@example.com', 'bob@example.com']
        }
      ];
      
      setSuggestions(mockSuggestions);
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
      console.log('Booking meeting:', booking);
      
      // Navigate to success page
      navigate(`/meeting/${id}/success`, { 
        state: { 
          booking: {
            ...booking,
            meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
            attendees: participants.filter(p => p.connected).map(p => p.email)
          },
          meetingData 
        } 
      });
    } catch (error) {
      console.error('Failed to book meeting:', error);
    }
  };

  const connectedParticipants = participants.filter(p => p.connected);
  const isUserConnected = account && participants.some(p => p.email === account.username);

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600 mb-6">
            Please sign in with your Outlook account to participate in scheduling.
          </p>
          <button onClick={() => instance.loginRedirect({
            scopes: ['Calendars.Read', 'Calendars.ReadWrite']
          })} className="btn-primary">
            Sign in with Outlook
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingMeeting) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <Loader text="Loading meeting..." />
        </div>
      </div>
    );
  }

  if (!meetingData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Meeting Not Found</h1>
          <p className="text-gray-600 mb-6">
            The meeting you're looking for doesn't exist or has been removed.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{meetingData.name}</h1>
        <p className="text-gray-600">
          {meetingData.location && `📍 ${meetingData.location}`}
        </p>
      </div>

      <PrivacyBanner />

      <div className="space-y-6">
        {/* Participants Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Participants ({participants.length})
            </h2>
            <button
              onClick={loadMeetingData}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {participants.map((participant, index) => (
              <ParticipantCard 
                key={index} 
                participant={{
                  email: participant.email,
                  displayName: participant.name || participant.email,
                  timezone: 'UTC',
                  connected: participant.connected
                }} 
              />
            ))}
          </div>

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
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                AI-Powered Time Suggestions
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
                  <span>Getting AI Suggestions...</span>
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  <span>Get AI Suggestions</span>
                </>
              )}
            </button>

            {suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    suggestion={{
                      startISO: suggestion.startTime,
                      endISO: suggestion.endTime,
                      attendeesFree: suggestion.participants.slice(0, suggestion.participants.length - suggestion.conflicts),
                      attendeesMissing: suggestion.participants.slice(suggestion.participants.length - suggestion.conflicts),
                      badges: [],
                      reason: `Good time slot with ${suggestion.participants.length - suggestion.conflicts} participants free`
                    }}
                    onBook={(apiSuggestion) => {
                      // Convert back to local format
                      const localSuggestion = {
                        startTime: apiSuggestion.startISO,
                        endTime: apiSuggestion.endISO,
                        score: 0.8, // Default score since API doesn't have it
                        conflicts: apiSuggestion.attendeesMissing.length,
                        participants: suggestion.participants
                      };
                      setSelectedSuggestion(localSuggestion);
                    }}
                  />
                ))}
              </div>
            ) : !isLoadingSuggestions && (
              <EmptyState
                icon={<Calendar className="h-12 w-12" />}
                title="No suggestions yet"
                description="Click 'Get AI Suggestions' to find the best available time slots."
              />
            )}
          </div>
        )}

        {/* Connected Participants Info */}
        {connectedParticipants.length === 0 && (
          <div className="card text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Connected Calendars</h3>
            <p className="text-gray-600 mb-4">
              Participants need to connect their calendars to get AI-powered suggestions.
            </p>
            <button
              onClick={connectCalendar}
              className="btn-primary"
            >
              Connect My Calendar
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedSuggestion && (
        <BookingModal
          suggestion={{
            startISO: selectedSuggestion.startTime,
            endISO: selectedSuggestion.endTime,
            attendeesFree: selectedSuggestion.participants.slice(0, selectedSuggestion.participants.length - selectedSuggestion.conflicts),
            attendeesMissing: selectedSuggestion.participants.slice(selectedSuggestion.participants.length - selectedSuggestion.conflicts),
            badges: [],
            reason: `Good time slot with ${selectedSuggestion.participants.length - selectedSuggestion.conflicts} participants free`
          }}
          attendees={connectedParticipants.map(p => p.email)}
          onClose={() => setSelectedSuggestion(null)}
          onConfirm={handleBook}
        />
      )}

      {/* Advanced Settings Drawer */}
      <AdvancedDrawer
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        participants={connectedParticipants.map(p => ({
          email: p.email,
          displayName: p.name || p.email
        }))}
        onSettingsChange={(settings) => {
          // TODO: Apply settings
          console.log('Settings changed:', settings);
        }}
      />
    </div>
  );
}