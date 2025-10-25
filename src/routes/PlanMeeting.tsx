import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Clock, Plus, X, Link, Star, CheckCircle, FolderOpen, ChevronDown, Sun, Moon } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import Loader from '@/components/Loader';
import SuggestionCard from '@/components/SuggestionCard';
import CopyButton from '@/components/CopyButton';
import { groupsApi, withBearer, type Group } from '@/lib/api';
import { createGraphClient, getUserProfile, getCalendarEvents, findAvailableSlots, type CalendarEvent } from '@/lib/graphApi';

interface Participant {
  email: string;
  name?: string;
  connected: boolean;
  lastSeen?: string;
}

interface Suggestion {
  startISO: string;
  endISO: string;
  attendeesFree: string[];
  attendeesMissing: string[];
  badges: string[];
  reason: string;
}

export default function PlanMeeting() {
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const account = accounts[0];
  const isAuthenticated = accounts.length > 0;
  
  
  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantEmail, setNewParticipantEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [duration, setDuration] = useState(60);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [preferredHours, setPreferredHours] = useState<string[]>(['morning', 'afternoon']);
  const [customHours, setCustomHours] = useState({ start: '09:00', end: '17:00' });
  const [allowAbsences, setAllowAbsences] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  
  // Calendar state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  
  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Step navigation functions
  const nextStep = () => {
    if (currentStep === 'who') {
      setCurrentStep('when');
      setCompletedSteps(prev => new Set([...prev, 'who']));
    } else if (currentStep === 'when') {
      setCurrentStep('suggestions');
      setCompletedSteps(prev => new Set([...prev, 'when']));
      // Automatically get suggestions when moving to suggestions step
      getSuggestions();
    } else if (currentStep === 'suggestions') {
      setCurrentStep('booking');
      setCompletedSteps(prev => new Set([...prev, 'suggestions']));
    }
  };

  const prevStep = () => {
    if (currentStep === 'when') {
      setCurrentStep('who');
    } else if (currentStep === 'suggestions') {
      setCurrentStep('when');
    } else if (currentStep === 'booking') {
      setCurrentStep('suggestions');
    }
  };

  const canProceedFromWho = () => {
    return participants.length > 0;
  };

  const canProceedFromWhen = () => {
    return dateRange.start && dateRange.end && preferredHours.length > 0;
  };

  const canProceedFromSuggestions = () => {
    return selectedSuggestion !== null;
  };


  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const hourRanges = [
    { id: 'morning', label: 'Morning', icon: Sun, start: '06:00', end: '12:00' },
    { id: 'afternoon', label: 'Afternoon', icon: Sun, start: '12:00', end: '18:00' },
    { id: 'evening', label: 'Evening', icon: Moon, start: '18:00', end: '22:00' },
  ];

  const toggleHourRange = (rangeId: string) => {
    setPreferredHours(prev => 
      prev.includes(rangeId) 
        ? prev.filter(id => id !== rangeId)
        : [...prev, rangeId]
    );
  };

  const getDefaultDateRange = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return {
      start: today.toISOString().split('T')[0],
      end: nextWeek.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    const defaultRange = getDefaultDateRange();
    setDateRange(defaultRange);
  }, []);

  const loadGroups = async () => {
    if (!isAuthenticated) return;
    
    setIsLoadingGroups(true);
    try {
      // For demo purposes, use mock data
      const mockGroups: Group[] = [
        {
          id: '1',
          name: 'Development Team',
          participants: [
            { email: 'john@example.com', name: 'John Doe', connected: false },
            { email: 'jane@example.com', name: 'Jane Smith', connected: false },
            { email: 'bob@example.com', name: 'Bob Wilson', connected: false }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2', 
          name: 'Marketing Squad',
          participants: [
            { email: 'alice@example.com', name: 'Alice Johnson', connected: false },
            { email: 'charlie@example.com', name: 'Charlie Brown', connected: false }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setGroups(mockGroups);
      
      // Uncomment when API is ready:
      // const data = await withBearer(getAccessToken, groupsApi.getAll);
      // setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const selectGroup = (group: Group) => {
    const groupParticipants = group.participants.map(participant => ({
      email: participant.email,
      connected: false
    }));
    setParticipants(groupParticipants);
    setSelectedGroup(group);
    setShowGroupsDropdown(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadGroups();
    }
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-groups-dropdown]')) {
        setShowGroupsDropdown(false);
      }
    };

    if (showGroupsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showGroupsDropdown]);

  const addParticipant = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail) {
      setEmailError('Please enter an email address');
      return;
    }
    
    if (!isValidEmail(cleanEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (participants.some(p => p.email === cleanEmail)) {
      setEmailError('This email is already added');
      return;
    }
    
    if (cleanEmail === account?.username) {
      setEmailError('You cannot add yourself as a participant');
      return;
    }
    
    setParticipants([...participants, { 
      email: cleanEmail, 
      connected: false 
    }]);
    setNewParticipantEmail('');
    setEmailError('');
  };

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter(p => p.email !== email));
  };

  const handlePasteEmails = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText
      .split(/[,\s\n]+/)
      .map(email => email.trim())
      .filter(email => email && isValidEmail(email));
    
    if (emails.length > 0) {
      e.preventDefault();
      emails.forEach(email => {
        if (!participants.some(p => p.email === email.toLowerCase())) {
          setParticipants(prev => [...prev, { 
            email: email.toLowerCase(), 
            connected: false 
          }]);
        }
      });
    }
  };

  const createInviteLink = async () => {
    setIsCreatingLink(true);
    try {
      // TODO: Generate invite link via backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      const linkId = Math.random().toString(36).substr(2, 9);
      const link = `${window.location.origin}/l/${linkId}`;
      setInviteLink(link);
    } catch (error) {
      console.error('Failed to create invite link:', error);
    } finally {
      setIsCreatingLink(false);
    }
  };

  const getSuggestions = async () => {
    if (participants.length === 0) return;

    // Use calendar-based suggestions if calendar is connected
    if (isCalendarConnected) {
      await generateSuggestions();
      return;
    }

    // Fallback to mock suggestions if calendar not connected
    setIsLoadingSuggestions(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock suggestions
      const mockSuggestions: Suggestion[] = [
        {
          startISO: '2024-01-15T10:00:00Z',
          endISO: '2024-01-15T11:00:00Z',
          attendeesFree: participants.map(p => p.email),
          attendeesMissing: [],
          badges: ['Perfect match', 'All available'],
          reason: 'All participants are free during this time slot'
        },
        {
          startISO: '2024-01-15T14:00:00Z',
          endISO: '2024-01-15T15:00:00Z',
          attendeesFree: participants.slice(0, -1).map(p => p.email),
          attendeesMissing: participants.slice(-1).map(p => p.email),
          badges: ['Good match', '1 conflict'],
          reason: 'One participant has a minor conflict but can reschedule'
        },
        {
          startISO: '2024-01-16T09:00:00Z',
          endISO: '2024-01-16T10:00:00Z',
          attendeesFree: participants.map(p => p.email),
          attendeesMissing: [],
          badges: ['Available', 'Next day'],
          reason: 'All participants available, scheduled for next day'
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
    try {
      // TODO: Book meeting via backend
      console.log('Booking meeting:', booking);
      
      // Send email invites to all participants
      const emailPromises = participants.map(participant => 
        emailApi.sendInvite({
          to: participant.email,
          organizerName: account?.name || 'TimeSyncAI User',
          organizerEmail: account?.username || 'noreply@timesyncai.com',
          plan: booking.description || 'Meeting scheduled via TimeSyncAI',
          meeting: {
            title: booking.title || 'Team Meeting',
            description: booking.description || 'Meeting scheduled via TimeSyncAI',
            location: booking.location || 'Virtual Meeting',
            startISO: selectedSuggestion?.startISO || new Date().toISOString(),
            endISO: selectedSuggestion?.endISO || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        })
      );

      // Send all emails
      const emailResults = await Promise.allSettled(emailPromises);
      
      // Check if any emails failed
      const failedEmails = emailResults
        .map((result, index) => ({ result, participant: participants[index] }))
        .filter(({ result }) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success));

      if (failedEmails.length > 0) {
        console.warn('Some emails failed to send:', failedEmails);
      }
      
      // Navigate to success page
      navigate('/meeting-sent', { 
        state: { 
          booking: {
            ...booking,
            meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
            attendees: participants.map(p => p.email),
            emailResults: emailResults.map(r => r.status === 'fulfilled' ? r.value : null)
          }
        } 
      });
    } catch (error) {
      console.error('Failed to book meeting:', error);
    }
  };

  const connectCalendar = async () => {
    if (!account) {
      instance.loginRedirect({
        scopes: ['Calendars.Read', 'Calendars.ReadWrite']
      });
      return;
    }

    setIsLoadingCalendar(true);
    try {
      // Acquire token silently
      await instance.acquireTokenSilent({
        scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
        account: account
      });

      // Create Graph client and fetch data
      const graphClient = createGraphClient(instance);
      
      // Get user profile
      const profile = await getUserProfile(graphClient);
      setUserProfile(profile);
      
      // Get calendar events for next 7 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);
      
      const events = await getCalendarEvents(graphClient, startDate, endDate);
      setCalendarEvents(events);
      
      setIsCalendarConnected(true);
      
      console.log('Calendar connected successfully!');
      console.log('User profile:', profile);
      console.log('Calendar events:', events);
      
      // Debug: Show calendar events in UI
      if (events.length > 0) {
        console.log('📅 Calendar Events Found:');
        events.forEach((event, index) => {
          console.log(`${index + 1}. ${event.subject} - ${event.start.dateTime} to ${event.end.dateTime}`);
        });
      } else {
        console.log('📅 No calendar events found in the next 7 days');
      }
      
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      setIsCalendarConnected(false);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const generateSuggestions = async () => {
    if (!isCalendarConnected || !dateRange.start || !dateRange.end) {
      console.log('Calendar not connected or date range not set');
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      // Find available slots based on calendar events
      const availableSlots = findAvailableSlots(
        calendarEvents,
        startDate,
        endDate,
        duration,
        customHours
      );

      // Convert to suggestions format
      const newSuggestions: Suggestion[] = availableSlots.slice(0, 5).map((slot, index) => ({
        startTime: slot.toISOString(),
        endTime: new Date(slot.getTime() + duration * 60000).toISOString(),
        score: 100 - (index * 10), // Decreasing score
        conflicts: 0,
        participants: participants.map(p => p.email)
      }));

      setSuggestions(newSuggestions);
      console.log('Generated suggestions:', newSuggestions);
      
      // Debug: Show available slots
      console.log('🎯 Available Time Slots Found:');
      availableSlots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot.toLocaleString()} (${duration} minutes)`);
      });
      
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const isUserConnected = account && participants.some(p => p.email === account.username);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Plan a Meeting</h1>
        <p className="text-xl text-gray-600 mb-4">Share a link, connect calendars, and let AI find the time.</p>
        
        {/* Privacy Badge */}
        <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800">We only read free/busy, never event details</span>
        </div>
      </div>

      <div className="space-y-8">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {[
            { id: 'who', label: 'Who', icon: Users },
            { id: 'when', label: 'When', icon: Clock },
            { id: 'suggestions', label: 'Suggestions', icon: Star },
            { id: 'booking', label: 'Send', icon: CheckCircle }
          ].map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = currentStep === step.id;
            const isAccessible = index === 0 || completedSteps.has(['who', 'when', 'suggestions'][index - 1]);
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : isAccessible
                    ? 'border-gray-300 text-gray-500'
                    : 'border-gray-200 text-gray-300'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isCurrent ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    completedSteps.has(step.id) ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Section A - Who */}
        <div className={`card transition-all duration-300 ${
          currentStep === 'who' ? 'opacity-100' : 'opacity-60'
        }`}>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setCurrentStep('who')}
          >
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Who
              {completedSteps.has('who') && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
            </h2>
            <div className="flex items-center space-x-2">
              {completedSteps.has('who') && (
                <span className="text-sm text-green-600 font-medium">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''} added
                </span>
              )}
              {currentStep !== 'who' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep('who');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {completedSteps.has('who') ? 'Edit' : 'Start'}
                </button>
              )}
            </div>
          </div>
          
          {currentStep === 'who' && (
            <div className="space-y-4 mt-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add participants by email
              </label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="email"
                    value={newParticipantEmail}
                    onChange={(e) => {
                      setNewParticipantEmail(e.target.value);
                      setEmailError('');
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addParticipant(newParticipantEmail);
                      }
                    }}
                    onPaste={handlePasteEmails}
                    placeholder="Paste emails or type one at a time"
                    className="input-field"
                  />
                  {emailError && (
                    <p className="text-red-600 text-sm mt-1">{emailError}</p>
                  )}
                </div>
                <button
                  onClick={() => addParticipant(newParticipantEmail)}
                  className="btn-secondary flex items-center space-x-2 px-4"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Paste comma, space, or newline-separated emails to add multiple at once
              </p>
            </div>

            {/* OR Divider */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Choose from Saved Groups Dropdown */}
            <div className="relative" data-groups-dropdown>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose from saved groups
              </label>
              {groups.length > 0 ? (
                <>
                  <button
                    onClick={() => setShowGroupsDropdown(!showGroupsDropdown)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-primary-300 focus:border-primary-300 focus:outline-none transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <FolderOpen className="h-5 w-5 text-gray-400" />
                      <div>
                        {selectedGroup ? (
                          <>
                            <p className="font-medium text-gray-900">{selectedGroup.name}</p>
                            <p className="text-sm text-gray-600">{selectedGroup.participants.length} participants</p>
                          </>
                        ) : (
                          <p className="text-gray-500">Select a group...</p>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showGroupsDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showGroupsDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {selectedGroup && (
                        <button
                          onClick={() => {
                            setSelectedGroup(null);
                            setParticipants([]);
                            setShowGroupsDropdown(false);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 border-b border-gray-100"
                        >
                          <X className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-600">Clear selection</p>
                            <p className="text-sm text-gray-500">Remove all participants</p>
                          </div>
                        </button>
                      )}
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => selectGroup(group)}
                          className={`w-full p-3 text-left hover:bg-primary-50 transition-colors flex items-center space-x-3 ${
                            selectedGroup?.id === group.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                          }`}
                        >
                          <FolderOpen className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{group.name}</p>
                            <p className="text-sm text-gray-600">{group.participants.length} participants</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center border border-gray-200 rounded-lg bg-gray-50">
                  <FolderOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No saved groups yet</p>
                  <p className="text-xs text-gray-500 mt-1">Create groups after scheduling meetings</p>
                </div>
              )}
            </div>

            {/* OR Divider */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Invite Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create invite link
              </label>
              {inviteLink ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="input-field flex-1"
                  />
                  <CopyButton text={inviteLink} />
                </div>
              ) : (
                <button
                  onClick={createInviteLink}
                  disabled={isCreatingLink}
                  className="btn-secondary flex items-center space-x-2"
                >
                  {isCreatingLink ? (
                    <>
                      <Loader size="sm" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      <span>Create invite link</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
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
                        {participant.connected && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
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
            )}

            {/* Continue Button */}
            {currentStep === 'who' && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={nextStep}
                  disabled={!canProceedFromWho()}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    canProceedFromWho()
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue to When
                </button>
            {/* Calendar Connection */}
            {participants.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {isCalendarConnected ? 'Calendar Connected' : 'Connect Calendar'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isCalendarConnected 
                          ? `Connected as ${userProfile?.displayName || account?.username}`
                          : 'Connect your calendar to find available times'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {!isCalendarConnected ? (
                    <button
                      onClick={connectCalendar}
                      disabled={isLoadingCalendar}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {isLoadingCalendar ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4" />
                          <span>Connect</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  )}
                </div>
                
                {isCalendarConnected && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      📅 Found {calendarEvents.length} events in the next 7 days
                    </p>
                    {calendarEvents.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-700 cursor-pointer hover:text-blue-900">
                          View calendar events (click to expand)
                        </summary>
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {calendarEvents.slice(0, 5).map((event, index) => (
                            <div key={event.id} className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                              <div className="font-medium">{event.subject}</div>
                              <div className="text-blue-600">
                                {new Date(event.start.dateTime).toLocaleString()} - {new Date(event.end.dateTime).toLocaleString()}
                              </div>
                            </div>
                          ))}
                          {calendarEvents.length > 5 && (
                            <div className="text-xs text-blue-600 italic">
                              ... and {calendarEvents.length - 5} more events
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          )}
        </div>

        {/* Section B - When */}
        <div className={`card transition-all duration-300 ${
          currentStep === 'when' ? 'opacity-100' : 'opacity-60'
        }`}>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setCurrentStep('when')}
          >
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              When
              {completedSteps.has('when') && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
            </h2>
            <div className="flex items-center space-x-2">
              {completedSteps.has('when') && (
                <span className="text-sm text-green-600 font-medium">
                  {duration}min • {preferredHours.length} time preference{preferredHours.length !== 1 ? 's' : ''}
                </span>
              )}
              {currentStep !== 'when' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep('when');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {completedSteps.has('when') ? 'Edit' : 'Start'}
                </button>
              )}
            </div>
          </div>
          
          {currentStep === 'when' && (
            <div className="space-y-6 mt-6">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Meeting duration
              </label>
              <div className="flex space-x-2">
                {[15, 30, 45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      duration === mins
                        ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Date range
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="input-field"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="input-field"
                    min={dateRange.start || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select the date range to search for available times
              </p>
            </div>

            {/* Preferred Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred hours (select multiple)
              </label>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {hourRanges.map((range) => {
                    const Icon = range.icon;
                    const isSelected = preferredHours.includes(range.id);
                    return (
                      <button
                        key={range.id}
                        onClick={() => toggleHourRange(range.id)}
                        className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors border-2 ${
                          isSelected
                            ? 'bg-primary-100 text-primary-700 border-primary-300'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{range.label}</span>
                        <span className="text-xs opacity-75">({range.start}-{range.end})</span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Custom Hours */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      id="custom-hours"
                      checked={preferredHours.includes('custom')}
                      onChange={(e) => toggleHourRange('custom')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="custom-hours" className="text-sm font-medium text-gray-700">
                      Custom hours
                    </label>
                  </div>
                  
                  {preferredHours.includes('custom') && (
                    <div className="flex items-center space-x-3">
                      <input
                        type="time"
                        value={customHours.start}
                        onChange={(e) => setCustomHours(prev => ({ ...prev, start: e.target.value }))}
                        className="input-field"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={customHours.end}
                        onChange={(e) => setCustomHours(prev => ({ ...prev, end: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                Advanced options
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allow absences
                  </label>
                  <div className="flex space-x-2">
                    {[0, 1].map((absences) => (
                      <button
                        key={absences}
                        onClick={() => setAllowAbsences(absences)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          allowAbsences === absences
                            ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {absences === 0 ? 'All must attend' : 'Allow 1 absence'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            {/* Continue Button */}
            {currentStep === 'when' && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={nextStep}
                  disabled={!canProceedFromWhen()}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    canProceedFromWhen()
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Get AI Suggestions
                </button>
              </div>
            )}
            </div>
          )}
        </div>

        {/* Section C - Suggestions */}
        <div className={`card transition-all duration-300 ${
          currentStep === 'suggestions' ? 'opacity-100' : 'opacity-60'
        }`}>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setCurrentStep('suggestions')}
          >
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Star className="h-5 w-5 mr-2" />
              AI Suggestions
              {completedSteps.has('suggestions') && <CheckCircle className="h-5 w-5 ml-2 text-green-500" />}
            </h2>
            <div className="flex items-center space-x-2">
              {completedSteps.has('suggestions') && selectedSuggestion && (
                <span className="text-sm text-green-600 font-medium">
                  Time selected • {new Date(selectedSuggestion.startISO).toLocaleDateString()}
                </span>
              )}
              {currentStep !== 'suggestions' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep('suggestions');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {completedSteps.has('suggestions') ? 'Edit' : 'Start'}
                </button>
              )}
            </div>
          </div>
          
          {currentStep === 'suggestions' && (
            <div className="mt-6">
              {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No suggestions yet</h3>
              <p className="text-gray-600 mb-4">
                Add participants and choose your preferences to get AI-powered time suggestions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedSuggestion === suggestion
                      ? 'ring-2 ring-primary-500 bg-primary-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSuggestion(suggestion)}
                >
                  <SuggestionCard
                    suggestion={suggestion}
                    onBook={() => setSelectedSuggestion(suggestion)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Continue Button */}
          {currentStep === 'suggestions' && suggestions.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={nextStep}
                disabled={!canProceedFromSuggestions()}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  canProceedFromSuggestions()
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {selectedSuggestion ? 'Send Invites' : 'Select a time slot to continue'}
              </button>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Section D - Booking Confirmation */}
        {currentStep === 'booking' && selectedSuggestion && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Send Invites
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Selected Time Summary */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h3 className="font-semibold text-primary-900 mb-2">Selected Meeting Time</h3>
                <p className="text-primary-700">
                  {new Date(selectedSuggestion.startISO).toLocaleString()} - {new Date(selectedSuggestion.endISO).toLocaleString()}
                </p>
                <p className="text-sm text-primary-600 mt-1">
                  Duration: {duration} minutes • {selectedSuggestion.badges.join(', ')}
                </p>
              </div>

              {/* Participants Summary */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Sending invites to:</h3>
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                      <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {participant.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-900">{participant.email}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Suggestions
                </button>
                <button
                  onClick={() => {
                    // Create a booking object and call handleBook
                    const booking = {
                      title: 'Team Meeting',
                      description: 'Meeting scheduled via TimeSyncAI',
                      location: 'Virtual Meeting',
                      startTime: selectedSuggestion.startISO,
                      endTime: selectedSuggestion.endISO
                    };
                    handleBook(booking);
                  }}
                  className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Send Invites & Book Meeting
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Primary CTA - Only show for create link flow */}
      {currentStep === 'who' && participants.length === 0 && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={createInviteLink}
            disabled={isCreatingLink}
            className="btn-primary text-lg px-8 py-4 shadow-lg"
          >
            {isCreatingLink ? (
              <>
                <Loader size="sm" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Link className="h-5 w-5" />
                <span>Create invite link</span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
