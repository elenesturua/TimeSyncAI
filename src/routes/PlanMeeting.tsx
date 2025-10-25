import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Clock, MapPin, Plus, X, Copy, Link, Star, CheckCircle, AlertCircle, FolderOpen, ChevronDown, Sun, Moon } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import Loader from '@/components/Loader';
import ParticipantCard from '@/components/ParticipantCard';
import SuggestionCard from '@/components/SuggestionCard';
import BookingModal from '@/components/BookingModal';
import HoursChips from '@/components/HoursChips';
import CopyButton from '@/components/CopyButton';
import { groupsApi, withBearer, type Group } from '@/lib/api';

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

export default function PlanMeeting() {
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
  
  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  // Primary CTA state
  const getPrimaryCTAState = () => {
    if (participants.length === 0) return 'create-link';
    if (suggestions.length === 0) return 'get-suggestions';
    return 'book';
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
    const groupParticipants = group.participants.map(email => ({
      email,
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

    setIsLoadingSuggestions(true);
    try {
      // TODO: Call backend API to get AI suggestions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock suggestions
      const mockSuggestions: Suggestion[] = [
        {
          startTime: '2024-01-15T10:00:00Z',
          endTime: '2024-01-15T11:00:00Z',
          score: 95,
          conflicts: 0,
          participants: participants.map(p => p.email)
        },
        {
          startTime: '2024-01-15T14:00:00Z',
          endTime: '2024-01-15T15:00:00Z',
          score: 88,
          conflicts: 1,
          participants: participants.map(p => p.email)
        },
        {
          startTime: '2024-01-16T09:00:00Z',
          endTime: '2024-01-16T10:00:00Z',
          score: 82,
          conflicts: 0,
          participants: participants.map(p => p.email)
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
      
      // Navigate to success page
      navigate('/meeting-sent', { 
        state: { 
          booking: {
            ...booking,
            meetingLink: 'https://teams.microsoft.com/l/meetup-join/...',
            attendees: participants.map(p => p.email)
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

    try {
      await instance.acquireTokenSilent({
        scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
        account: account
      });
      // TODO: Connect calendar via backend
    } catch (error) {
      console.error('Failed to connect calendar:', error);
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
        {/* Section A - Who */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Who
          </h2>
          
          <div className="space-y-4">
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
            {participants.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Scroll to next section or continue with the flow
                    const nextSection = document.querySelector('[data-section="when"]');
                    if (nextSection) {
                      nextSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="btn-primary w-full"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section B - When */}
        <div className="card" data-section="when">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            When
          </h2>
          
          <div className="space-y-6">
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
          </div>
        </div>

        {/* Section C - Suggestions */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <Star className="h-5 w-5 mr-2" />
            AI Suggestions
          </h2>
          
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
                <SuggestionCard
                  key={index}
                  suggestion={suggestion}
                  onBook={setSelectedSuggestion}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Primary CTA */}
      <div className="fixed bottom-6 right-6">
        {getPrimaryCTAState() === 'create-link' && (
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
        )}
        
        {getPrimaryCTAState() === 'get-suggestions' && (
          <button
            onClick={getSuggestions}
            disabled={isLoadingSuggestions || participants.length === 0}
            className="btn-primary text-lg px-8 py-4 shadow-lg"
          >
            {isLoadingSuggestions ? (
              <>
                <Loader size="sm" />
                <span>Getting suggestions...</span>
              </>
            ) : (
              <>
                <Star className="h-5 w-5" />
                <span>Get AI suggestions</span>
              </>
            )}
          </button>
        )}
        
        {getPrimaryCTAState() === 'book' && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Click "Book" on any suggestion above</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedSuggestion && (
        <BookingModal
          suggestion={selectedSuggestion}
          attendees={participants.map(p => p.email)}
          onClose={() => setSelectedSuggestion(null)}
          onConfirm={handleBook}
        />
      )}
    </div>
  );
}
