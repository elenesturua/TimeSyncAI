import { type IPublicClientApplication } from '@azure/msal-browser';
import { generateScoredSlots } from '@/logic/gemini-selection/selector';
import { createGraphClient, getCalendarEvents } from '@/lib/graphApi';
import type { ParticipantInput } from '@/logic/gemini-selection/selector';
import type { ScoredTimeInterval } from '@/logic/schedule/scheduler';

interface PlanMeetingRequest {
  participants: Array<{
    email: string;
    name?: string;
    importance?: 'High' | 'Mid' | 'Low';
  }>;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate: string; // ISO date (YYYY-MM-DD)
  durationMinutes: number;
  workingHours?: { start: number; end: number };
  timezone?: string;
}

interface Suggestion {
  startISO: string;
  endISO: string;
  attendeesFree: string[];
  attendeesMissing: string[];
  badges: string[];
  reason: string;
}

export class AISchedulingService {
  /**
   * Generate AI-powered meeting suggestions
   */
  static async generateAISuggestions(
    request: PlanMeetingRequest,
    msalInstance: IPublicClientApplication
  ): Promise<Suggestion[]> {
    try {
      console.log('Starting AI suggestion generation for:', request.participants.map(p => p.email));
      
      // 1. Fetch calendar data for all participants
      const participantData = await this.fetchParticipantCalendars(
        request.participants,
        request.startDate,
        request.endDate,
        msalInstance
      );

      console.log(`Participant data loaded: ${participantData.length} participants`);
      console.log(`Request params:`, {
        startDate: request.startDate,
        endDate: request.endDate,
        duration: request.durationMinutes,
        workingHours: request.workingHours
      });

      // 2. Convert to AI input format
      const aiInput = this.convertToAIInput(participantData, request);

      console.log('Calling generateScoredSlots...');
      
      // 3. Call AI to generate scored slots
      const scoredSlots = await generateScoredSlots(aiInput);

      console.log(`Generated ${scoredSlots.length} scored slots`);

      // 4. Convert to UI-friendly suggestions
      const suggestions = this.convertToSuggestions(scoredSlots, request.participants);
      console.log(`Converted to ${suggestions.length} UI suggestions`);
      
      return suggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return [];
    }
  }

  /**
   * Fetch calendar events for all participants (only free/busy times)
   * For each participant, fetch their calendar from Microsoft Graph
   */
  private static async fetchParticipantCalendars(
    participants: PlanMeetingRequest['participants'],
    startDate: string,
    endDate: string,
    msalInstance: IPublicClientApplication
  ): Promise<ParticipantInput[]> {
    console.log(`Fetching calendars for ${participants.length} participants`);
    
    // Fetch calendars in parallel for efficiency
    const calendarPromises = participants.map(async (participant) => {
      try {
        const account = msalInstance.getActiveAccount();
        if (!account) {
          console.error('No active account for participant:', participant.email);
          throw new Error('No active account');
        }

        // Get calendar events (only free/busy, not details)
        const graphClient = createGraphClient(msalInstance);
        
        console.log(`Fetching calendar for participant: ${participant.email}`);
        
        const events = await getCalendarEvents(
          graphClient,
          new Date(startDate),
          new Date(endDate)
        );

        console.log(`Found ${events.length} total events for ${participant.email}`);

        // Convert to busy windows (exclude 'free' events)
        const busy = events
          .filter(event => event.showAs !== 'free')
          .map(event => ({
            startISO: event.start.dateTime,
            endISO: event.end.dateTime
          }));

        console.log(`Extracted ${busy.length} busy periods for ${participant.email}`);

        return {
          id: participant.email,
          name: participant.name,
          priority: participant.importance || 'Mid',
          busy,
          workingTime: {
            startHour: 9, // Default - could be from user preferences
            endHour: 17,
            workingDays: [1, 2, 3, 4, 5], // Mon-Fri
            timezone: 'UTC'
          }
        };
      } catch (error) {
        console.error(`Error fetching calendar for ${participant.email}:`, error);
        // Return empty busy schedule if fetch fails
        return {
          id: participant.email,
          name: participant.name,
          priority: participant.importance || 'Mid',
          busy: [],
          workingTime: {
            startHour: 9,
            endHour: 17,
            workingDays: [1, 2, 3, 4, 5],
            timezone: 'UTC'
          }
        };
      }
    });

    const result = await Promise.all(calendarPromises);
    console.log(`Fetched calendars for all participants. Total busy periods: ${result.reduce((sum, p) => sum + p.busy.length, 0)}`);
    return result;
  }

  /**
   * Convert participant data to AI input format
   */
  private static convertToAIInput(
    participants: ParticipantInput[],
    request: PlanMeetingRequest
  ) {
    return {
      participants,
      preferences: {
        durationMinutes: request.durationMinutes,
        preferredStartHourRange: request.workingHours ? {
          start: request.workingHours.start,
          end: request.workingHours.end
        } : undefined,
        timezone: request.timezone || 'UTC'
      },
      startDate: request.startDate,
      endDate: request.endDate,
      meetingDurationMinutes: request.durationMinutes
    };
  }

  /**
   * Convert scored slots to UI-friendly suggestions
   */
  private static convertToSuggestions(
    scoredSlots: ScoredTimeInterval[],
    participants: PlanMeetingRequest['participants']
  ): Suggestion[] {
    return scoredSlots.slice(0, 10).map((slot: any) => ({
      startISO: slot.start.toISOString(),
      endISO: slot.end.toISOString(),
      attendeesFree: participants.map(p => p.email),
      attendeesMissing: [], // TODO: Calculate conflicts if needed
      badges: this.generateBadges(slot),
      reason: this.generateReason(slot)
    }));
  }

  /**
   * Generate badges for a time slot
   */
  private static generateBadges(slot: ScoredTimeInterval): string[] {
    const badges: string[] = [];

    if (slot.score >= 90) {
      badges.push('Perfect match');
      badges.push('All available');
    } else if (slot.score >= 70) {
      badges.push('Good match');
      if (slot.participants && slot.participants.unavailable.length > 0) {
        badges.push(`${slot.participants.unavailable.length} conflict${slot.participants.unavailable.length > 1 ? 's' : ''}`);
      }
    } else if (slot.score >= 50) {
      badges.push('Available');
    } else {
      badges.push('Some conflicts');
    }

    badges.push('AI suggested');
    return badges;
  }

  /**
   * Generate reason text for a time slot
   */
  private static generateReason(slot: ScoredTimeInterval): string {
    if (slot.participants && slot.participants.unavailable.length > 0) {
      return `${slot.participants.unavailable.length} participant(s) have conflicts during this time`;
    }
    return 'All participants are free during this time slot';
  }
}

