import { type IPublicClientApplication } from '@azure/msal-browser';
import { generateScoredSlots } from '@/logic/gemini-selection/selector';
import { CalendarService } from '@/services/calendarService';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
   * Generate AI-powered meeting suggestions - returns ALL slots
   */
  static async generateAISuggestions(
    request: PlanMeetingRequest,
    msalInstance: IPublicClientApplication
  ): Promise<{ suggestions: Suggestion[], allSlots: ScoredTimeInterval[] }> {
    try {
      console.log('Starting AI suggestion generation for:', request.participants.map(p => p.email));
      
      // 1. Fetch calendar data for all participants
      const participantData = await this.fetchParticipantCalendars(
        request,
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
      
      return { suggestions, allSlots: scoredSlots };
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return { suggestions: [], allSlots: [] };
    }
  }

  /**
   * Fetch calendar events for all participants (only free/busy times)
   * For now, generates suggestions without calendar data (future: participants will share availability)
   */
  private static async fetchParticipantCalendars(
    request: PlanMeetingRequest,
    _msalInstance: IPublicClientApplication
  ): Promise<ParticipantInput[]> {
    const { participants, startDate, endDate } = request;
    console.log(`Fetching calendars for ${participants.length} participants from Firestore`);
    
    // Fetch calendars in parallel for efficiency
    const calendarPromises = participants.map(async (participant) => {
      try {
        // Try to get user ID from Firestore
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', participant.email)
        );
        
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userId = userSnapshot.docs[0].id;
          
          // Get calendar events from Firestore
          const events = await CalendarService.getCalendarEvents(
            userId,
            new Date(startDate),
            new Date(endDate)
          );

          console.log(`Found ${events.length} Firestore events for ${participant.email}`);

          if (events.length === 0) {
            console.warn(`⚠️ No calendar data for ${participant.email}. They need to connect their calendar via the "Connect Calendar" button.`);
          }

          // Convert to busy windows (exclude 'free' events)
          const busy = events
            .filter(event => event.showAs !== 'free')
            .map(event => {
              // Get the datetime strings
              const startDateTime = typeof event.start === 'string' 
                ? event.start 
                : event.start.dateTime;
              const endDateTime = typeof event.end === 'string'
                ? event.end
                : event.end.dateTime;
              
              // Events are stored in Firestore with timezone info
              // Parse them and format as ISO strings for the scheduler
              const startDate = new Date(startDateTime);
              const endDate = new Date(endDateTime);
              
              return {
                startISO: startDate.toISOString(),
                endISO: endDate.toISOString()
              };
            });

          console.log(`Extracted ${busy.length} busy periods for ${participant.email}`);

          return {
            id: participant.email,
            name: participant.name,
            priority: participant.importance || 'Mid',
            busy,
            workingTime: request.workingHours ? {
              startHour: request.workingHours.start,
              endHour: request.workingHours.end,
              workingDays: [1, 2, 3, 4, 5], // Mon-Fri
              timezone: 'America/Chicago'
            } : {
              startHour: 9,
              endHour: 17,
              workingDays: [1, 2, 3, 4, 5], // Mon-Fri
              timezone: 'America/Chicago'
            }
          };
        } else {
          // Participant not in Firestore - they haven't connected calendar yet
          // For now, return them as fully available during working hours
          // In the future, they would need to connect their calendar to share availability
          console.log(`Participant ${participant.email} not in Firestore - treating as available during working hours`);
          console.log(`💡 Tip: Participant ${participant.email} needs to connect their calendar to share actual availability`);
          
          return {
            id: participant.email,
            name: participant.name,
            priority: participant.importance || 'Mid',
            busy: [], // Empty = fully available during working hours
            workingTime: {
              startHour: 9,
              endHour: 17,
              workingDays: [1, 2, 3, 4, 5],
              timezone: 'UTC'
            }
          };
        }
      } catch (error) {
        console.error(`Error fetching calendar for ${participant.email}:`, error);
        console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        // Return empty busy schedule if fetch fails (treat as available)
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
    const totalBusy = result.reduce((sum, p) => sum + p.busy.length, 0);
    console.log(`Fetched calendars for all participants. Total busy periods: ${totalBusy}`);
    
    // Log which participants have busy periods
    result.forEach((p, index) => {
      console.log(`Participant ${index + 1}: ${p.name || p.id} - ${p.busy.length} busy periods`);
    });
    
    if (totalBusy === 0) {
      console.log('No participant calendars found - generating suggestions based on working hours only');
    } else {
      console.log(`Using ${totalBusy} busy periods from ${result.filter(p => p.busy.length > 0).length} connected participants`);
    }
    
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
    return scoredSlots.slice(0, 10).map((slot: any) => {
      // Format dates as UTC ISO strings - this is the only format that works consistently
      // We'll handle timezone conversion only when displaying to the user
      const startISO = slot.start.toISOString();
      const endISO = slot.end.toISOString();
      
      // Debug logging
      console.log('🔍 Converting slot to suggestion:', {
        slot_start: slot.start.toString(),
        slot_end: slot.end.toString(),
        startISO,
        endISO
      });
      
      return {
        startISO,
        endISO,
        attendeesFree: participants.map(p => p.email),
        attendeesMissing: [], // TODO: Calculate conflicts if needed
        badges: this.generateBadges(slot),
        reason: this.generateReason(slot)
      };
    });
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

