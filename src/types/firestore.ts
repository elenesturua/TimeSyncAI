// Firestore Database Schema Types

export interface User {
  id: string;
  email: string;
  displayName: string;
  microsoftAccountId: string;
  calendarConnected: boolean;
  calendarLastSynced?: string;
  createdAt: string;
  lastActive: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isAllDay: boolean;
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere';
  lastUpdated: string;
}

export interface MeetingInvitation {
  id: string;
  meetingId: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeId?: string; // Set when invitee accepts
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitationToken: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface Meeting {
  id: string;
  organizerId: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  dateRange: {
    start: string;
    end: string;
  };
  preferredHours: string[];
  participants: string[]; // user IDs
  invitations: string[]; // invitation IDs
  status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
  scheduledTime?: {
    start: string;
    end: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantGroup {
  id: string;
  ownerId: string;
  name: string;
  participants: string[]; // user IDs
  createdAt: string;
  updatedAt: string;
}

export interface CalendarSync {
  id: string;
  userId: string;
  lastSyncTime: string;
  eventsCount: number;
  syncStatus: 'success' | 'error' | 'in_progress';
  errorMessage?: string;
}
