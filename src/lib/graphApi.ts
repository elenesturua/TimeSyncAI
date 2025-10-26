import { Client } from '@microsoft/microsoft-graph-client';

// Types for calendar data
export interface CalendarEvent {
  id: string;
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
  showAs: string; // free, tentative, busy, oof, workingElsewhere
}

export interface UserProfile {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

// Create Graph client with access token
export const createGraphClient = (msalInstance: any) => {
  const authProvider = (callback: (error: any, accessToken?: string | null) => void) => {
    const account = msalInstance.getActiveAccount();
    if (!account) {
      callback(new Error('No active account found'), null);
      return;
    }

    msalInstance.acquireTokenSilent({
      scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
      account: account,
    }).then((response: any) => {
      callback(null, response.accessToken || null);
    }).catch((error: any) => {
      callback(error, null);
    });
  };
  
  return Client.init({
    authProvider: authProvider as any,
  });
};

// Get user profile
export const getUserProfile = async (graphClient: Client): Promise<UserProfile> => {
  try {
    const profile = await graphClient.api('/me').get();
    return {
      id: profile.id,
      displayName: profile.displayName,
      mail: profile.mail,
      userPrincipalName: profile.userPrincipalName,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Get calendar events for a date range
export const getCalendarEvents = async (
  graphClient: Client,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> => {
  try {
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();

    const events = await graphClient
      .api('/me/calendar/events')
      .query({
        startDateTime: startTime,
        endDateTime: endTime,
        $select: 'id,subject,start,end,isAllDay,showAs',
        $orderby: 'start/dateTime',
      })
      .get();

    // Convert UTC times to UTC-6
    const eventsWithTimezone = (events.value || []).map((event: any) => {
      // Convert UTC datetime to UTC-6
      const convertToUTC6 = (utcDateTime: string): string => {
        const date = new Date(utcDateTime);
        date.setHours(date.getHours() - 6);
        return date.toISOString();
      };
      
      return {
        ...event,
        start: {
          dateTime: convertToUTC6(event.start.dateTime),
          timeZone: 'America/Chicago' // UTC-6
        },
        end: {
          dateTime: convertToUTC6(event.end.dateTime),
          timeZone: 'America/Chicago'
        }
      };
    });

    return eventsWithTimezone;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

// Get free/busy information for multiple users
export const getFreeBusyInfo = async (
  graphClient: Client,
  emails: string[],
  startTime: Date,
  endTime: Date
) => {
  try {
    const requestBody = {
      schedules: emails,
      startTime: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      endTime: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      availabilityViewInterval: 30, // 30-minute intervals
    };

    const response = await graphClient
      .api('/me/calendar/getSchedule')
      .post(requestBody);

    return response.value || [];
  } catch (error) {
    console.error('Error fetching free/busy info:', error);
    throw error;
  }
};

// Helper function to check if a time slot is free
export const isTimeSlotFree = (
  events: CalendarEvent[],
  startTime: Date,
  endTime: Date
): boolean => {
  return !events.some(event => {
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);
    
    // Check for overlap
    return (
      (startTime < eventEnd && endTime > eventStart) &&
      event.showAs !== 'free'
    );
  });
};

// Find available time slots
export const findAvailableSlots = (
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  durationMinutes: number,
  workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' }
): Date[] => {
  const availableSlots: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Skip weekends (optional)
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Parse working hours
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    
    const dayStart = new Date(currentDate);
    dayStart.setHours(startHour, startMinute, 0, 0);
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Check every 30 minutes within working hours
    const slotStart = new Date(dayStart);
    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
      
      if (slotEnd <= dayEnd && isTimeSlotFree(events, slotStart, slotEnd)) {
        availableSlots.push(new Date(slotStart));
      }
      
      slotStart.setMinutes(slotStart.getMinutes() + 30);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return availableSlots;
};
