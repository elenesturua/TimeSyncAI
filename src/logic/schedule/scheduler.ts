import { GetCalendarEvents, type GraphEvent } from './MSGraph';

/**
 * Represents a time interval with start and end times
 */
interface TimeInterval {
  start: Date;
  end: Date;
}

/**
 * Represents a time interval with a preference score and participant information
 */
export interface ScoredTimeInterval extends TimeInterval {
  score: number;
  midAttendance: number;
  overallAttendance: number;
  participants: {
    available: User[];  // User objects who can attend
    unavailable: User[];  // User objects who cannot attend
  };
}

/**
 * Represents a user's busy schedule with their calendar events
 * Optimized for efficient free time checking
 */
export class BusySchedule {
  public userID: string;
  private _events: TimeInterval[];
  private _sorted: boolean;

  constructor(userID: string) {
    this.userID = userID;
    this._events = [];
    this._sorted = true;
  }

  /**
   * Add a calendar event to the busy schedule
   * @param startTime - Event start time as Date object
   * @param endTime - Event end time as Date object
   */
  addEvent(startTime: Date, endTime: Date): void {
    this._events.push({ start: startTime, end: endTime });
    this._sorted = false;
  }

  /**
   * Sort events by start time for efficient searching
   * This is called automatically when needed
   */
  private ensureSorted(): void {
    if (!this._sorted) {
      this._events.sort((a, b) => a.start.getTime() - b.start.getTime());
      this._sorted = true;
    }
  }

  /**
   * Check if a time slot is free (no overlapping events)
   * @param startTime - Start time to check
   * @param endTime - End time to check
   * @returns boolean - true if the time slot is free
   */
  isTimeSlotFree(startTime: Date, endTime: Date): boolean {
    this.ensureSorted();
    
    // Binary search for efficient lookup
    let left = 0;
    let right = this._events.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const event = this._events[mid];
      
      // Check for overlap
      if (this.hasOverlap(startTime, endTime, event.start, event.end)) {
        return false;
      }
      
      // If our time slot is before this event, search left
      if (endTime <= event.start) {
        right = mid - 1;
      } 
      // If our time slot is after this event, search right
      else if (startTime >= event.end) {
        left = mid + 1;
      }
      // If we're here, there's an overlap
      else {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if two time intervals overlap
   * @param start1 - Start of first interval
   * @param end1 - End of first interval
   * @param start2 - Start of second interval
   * @param end2 - End of second interval
   * @returns boolean - true if intervals overlap
   */
  private hasOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Find all free time slots within a given time range
   * @param startTime - Start of the range to check
   * @param endTime - End of the range to check
   * @param minDuration - Minimum duration for a free slot (in milliseconds)
   * @returns TimeInterval[] - Array of free time slots
   */
  findFreeTimeSlots(startTime: Date, endTime: Date, minDuration: number = 0): TimeInterval[] {
    this.ensureSorted();
    
    const freeSlots: TimeInterval[] = [];
    let currentTime = startTime;
    
    for (const event of this._events) {
      // Skip events that are completely before our range
      if (event.end <= startTime) {
        continue;
      }
      
      // Stop if we've passed our range
      if (event.start >= endTime) {
        break;
      }
      
      // If there's a gap before this event, it's a free slot
      if (currentTime < event.start) {
        const gapEnd = new Date(Math.min(event.start.getTime(), endTime.getTime()));
        const duration = gapEnd.getTime() - currentTime.getTime();
        
        if (duration >= minDuration) {
          freeSlots.push({
            start: new Date(currentTime),
            end: gapEnd
          });
        }
      }
      
      // Update current time to after this event
      currentTime = new Date(Math.max(currentTime.getTime(), event.end.getTime()));
    }
    
    // Check for free time after the last event
    if (currentTime < endTime) {
      const duration = endTime.getTime() - currentTime.getTime();
      if (duration >= minDuration) {
        freeSlots.push({
          start: new Date(currentTime),
          end: new Date(endTime)
        });
      }
    }
    
    return freeSlots;
  }

  /**
   * Get all busy time intervals
   * @returns TimeInterval[] - Array of busy time intervals
   */
  getBusyIntervals(): TimeInterval[] {
    this.ensureSorted();
    return this._events.map(event => ({ ...event }));
  }

}

/**
 * Retrieve calendar events for a user and populate a BusySchedule
 * @param userID - The user ID or email address
 * @param startDate - Start date in ISO format (YYYY-MM-DD)
 * @param endDate - End date in ISO format (YYYY-MM-DD)
 * @returns Promise<BusySchedule> - The populated busy schedule
 */
export async function getBusySchedule(
  userID: string, 
  startDate: string, 
  endDate: string
): Promise<BusySchedule> {
  try {
    // Create a new BusySchedule instance
    const busySchedule = new BusySchedule(userID);
    
    // Get calendar events from Microsoft Graph API
    const events: GraphEvent[] = await GetCalendarEvents(userID, startDate, endDate);
    
    // Process each event and add to the busy schedule
    for (const event of events) {
      // Skip cancelled events
      if (event.isCancelled) {
        continue;
      }
      
      // Parse start and end times
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end.dateTime);
      
      // Validate that the times are valid
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.warn(`Invalid date format for event ${event.id}:`, {
          start: event.start.dateTime,
          end: event.end.dateTime
        });
        continue;
      }
      
      // Add the event to the busy schedule
      busySchedule.addEvent(startTime, endTime);
    }
    
    // Events are automatically sorted when needed
    
    return busySchedule;
    
  } catch (error) {
    console.error(`Error creating busy schedule for user ${userID}:`, error);
    throw new Error(`Failed to create busy schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}



/**
 * Represents a user with their schedule and working time information
 */
export class User {
  public userID: string;
  public name: string;
  public busySchedule: BusySchedule;
  public importance: 'High' | 'Mid' | 'Low';
  public workingTime: {
    startHour: number;
    endHour: number;
    timezone: string;
    workingDays: number[]; // 0-6 (Sunday-Saturday)
  };

  constructor(userID: string, name: string, importance: 'High' | 'Mid' | 'Low', workingTime?: {
    startHour?: number;
    endHour?: number;
    timezone?: string;
    workingDays?: number[];
  }) {
    this.userID = userID;
    this.name = name;
    this.importance = importance;
    this.busySchedule = new BusySchedule(userID);
    
    // Set default working time if not provided
    this.workingTime = {
      startHour: workingTime?.startHour ?? 9,
      endHour: workingTime?.endHour ?? 17,
      timezone: workingTime?.timezone ?? 'UTC',
      workingDays: workingTime?.workingDays ?? [1, 2, 3, 4, 5] // Monday-Friday
    };
  }

  /**
   * Update the user's busy schedule
   * @param startDate - Start date in ISO format (YYYY-MM-DD)
   * @param endDate - End date in ISO format (YYYY-MM-DD)
   */
  async updateBusySchedule(startDate: string, endDate: string): Promise<void> {
    this.busySchedule = await getBusySchedule(this.userID, startDate, endDate);
  }

  /**
   * Check if a time slot is available for this user
   * @param startTime - Start time to check
   * @param endTime - End time to check
   * @returns boolean - True if the time slot is available
   */
  isTimeSlotAvailable(startTime: Date, endTime: Date): boolean {
    // Check if the time is within working hours (use UTC time)
    const startHour = startTime.getUTCHours();
    const endHour = endTime.getUTCHours();
    const dayOfWeek = startTime.getUTCDay();
    
    // Check if it's a working day
    if (!this.workingTime.workingDays.includes(dayOfWeek)) {
      return false;
    }
    
    // Check if it's within working hours
    if (startHour < this.workingTime.startHour || endHour > this.workingTime.endHour) {
      return false;
    }
    
    // Check if the time slot is free in the busy schedule
    return this.busySchedule.isTimeSlotFree(startTime, endTime);
  }

  /**
   * Get available time slots for a given duration
   * @param durationMinutes - Duration in minutes
   * @param startDate - Start date in ISO format (YYYY-MM-DD)
   * @param endDate - End date in ISO format (YYYY-MM-DD)
   * @returns Promise<TimeInterval[]> - Array of available time slots
   */
  async getAvailableTimeSlots(
    durationMinutes: number,
    startDate: string,
    endDate: string
  ): Promise<TimeInterval[]> {
    // Update busy schedule first
    await this.updateBusySchedule(startDate, endDate);
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const availableSlots: TimeInterval[] = [];
    
    // Iterate through each day in the date range
    for (let currentDate = new Date(startDateObj); currentDate <= endDateObj; currentDate.setDate(currentDate.getDate() + 1)) {
      // Generate time slots for this day
      const daySlots = this.generateDayTimeSlots(
        currentDate,
        durationMinutes,
        this.workingTime.startHour,
        this.workingTime.endHour
      );
      
      // Check availability for each slot
      for (const slot of daySlots) {
        if (this.isTimeSlotAvailable(slot.start, slot.end)) {
          availableSlots.push(slot);
        }
      }
    }
    
    return availableSlots;
  }

  /**
   * Generate time slots for a single day with 0 or 5-minute intervals
   * @param date - The date to generate slots for
   * @param meetingDurationMinutes - Duration of the meeting in minutes
   * @param startHour - Start hour (0-23)
   * @param endHour - End hour (0-23)
   * @returns TimeInterval[] - Array of time slots for the day
   */
  private generateDayTimeSlots(
    date: Date,
    meetingDurationMinutes: number,
    startHour: number,
    endHour: number
  ): TimeInterval[] {
    const slots: TimeInterval[] = [];
    
    console.log(`🎯 Generating slots for ${date.toISOString().split('T')[0]} from ${startHour}:00 to ${endHour}:00 Chicago time`);
    
    // startHour and endHour are in Chicago time (which is UTC-5)
    // To store as UTC, we need to add 5 hours
    // Example: 12:00 PM Chicago = 5:00 PM UTC
    
    // Get the date string
    const dateStr = date.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        // Create a UTC date that represents this Chicago time
        const chicagoTime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-05:00`;
        
        const slotStart = new Date(chicagoTime);
        const slotEnd = new Date(slotStart.getTime() + meetingDurationMinutes * 60 * 1000);
        
        slots.push({
          start: slotStart,
          end: slotEnd
        });
      }
    }
    
    console.log(`✅ Generated ${slots.length} slots (Chicago time stored as UTC-5)`);
    
    return slots;
  }
}

/**
 * Class to manage meeting schedule with working time information
 */
export class Schedule {
  public High: User[];
  public Mid: User[];
  public Low: User[];
  public ScoredTimeIntervals: ScoredTimeInterval[];
  public StartDate: Date;
  public EndDate: Date;
  public MeetingDurationMinutes: number;
  constructor(startDate: Date, endDate: Date, meetingDurationMinutes: number) {
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
    this.High = [];
    this.Mid = [];
    this.Low = [];
    this.ScoredTimeIntervals = [];
    this.StartDate = startDate;
    this.EndDate = endDate;
    this.MeetingDurationMinutes = meetingDurationMinutes;
  }

  /**
   * Add a user to a specific priority level
   * @param user - The user to add
   * @param priority - Priority level ('High', 'Mid', or 'Low')
   */
  addUser(user: User): void {
    this[user.importance].push(user);
  }

  /**
   * Remove a user from all priority levels
   * @param userID - The user ID to remove
   */
  removeUser(userID: string): void {
    this.High = this.High.filter(user => user.userID !== userID);
    this.Mid = this.Mid.filter(user => user.userID !== userID);
    this.Low = this.Low.filter(user => user.userID !== userID);
  }

  /**
   * Get all users regardless of priority
   * @returns User[] - Array of all users
   */
  getAllUsers(): User[] {
    return [...this.High, ...this.Mid, ...this.Low];
  }

  /**
   * Get total number of users
   * @returns number - Total user count
   */
  getTotalCount(): number {
    return this.High.length + this.Mid.length + this.Low.length;
  }

  /**
   * Generate time slots for a single day with 0 or 5-minute intervals
   * @param date - The date to generate slots for
   * @param meetingDurationMinutes - Duration of the meeting in minutes
   * @param startHour - Start hour (0-23)
   * @param endHour - End hour (0-23)
   * @returns TimeInterval[] - Array of time slots for the day
   */
  private generateDayTimeSlots(
    date: Date,
    meetingDurationMinutes: number,
    startHour: number,
    endHour: number
  ): TimeInterval[] {
    const slots: TimeInterval[] = [];
    
    // Create a new date object for the specific day (ensure UTC)
    const dayDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    
    // Generate slots from startHour to endHour
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const slotStart = new Date(dayDate);
        slotStart.setUTCHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + meetingDurationMinutes);
        
        // Check if the slot ends before the end hour
        if (slotEnd.getUTCHours() <= endHour || (slotEnd.getUTCHours() === endHour && slotEnd.getUTCMinutes() === 0)) {
          // Only add slots where all High priority users can attend
          const allHighCanAttend = this.High.every(user => user.isTimeSlotAvailable(slotStart, slotEnd));
          
          if (allHighCanAttend) {
            slots.push({
              start: slotStart,
              end: slotEnd
            });
          }
        }
      }
    }
    
    return slots;
  }


  /**
   * Generate scored meeting slots with preference scores based on attendance rates
   * @param meetingDurationMinutes - Duration of the meeting in minutes
   * @param startDate - Start date in ISO format (YYYY-MM-DD)
   * @param endDate - End date in ISO format (YYYY-MM-DD)
   * @returns Promise<ScoredTimeInterval[]> - Array of scored meeting slots sorted by preference
   */
  async generateScoredMeetingSlots(): Promise<void> {
    await this.generateScoredMeetingSlotsInternal(true);
  }

  /**
   * Generate scored meeting slots without fetching calendars (when data is already provided)
   */
  async generateScoredMeetingSlotsWithoutFetching(): Promise<void> {
    await this.generateScoredMeetingSlotsInternal(false);
  }

  /**
   * Internal method to generate scored meeting slots
   */
  private async generateScoredMeetingSlotsInternal(shouldFetchCalendars: boolean): Promise<void> {
    try {
      // Update busy schedules for all users (only if needed)
      const allUsers = this.getAllUsers();
      if (allUsers.length === 0) {
        console.warn('No users found');
        return;
      }

      if (shouldFetchCalendars) {
        console.log('Fetching calendars for users via MS Graph...');
        await Promise.all(allUsers.map(user => user.updateBusySchedule(this.StartDate.toISOString().split('T')[0], this.EndDate.toISOString().split('T')[0])));
      } else {
        console.log('Skipping calendar fetch - using provided busy schedules');
      }
      
      // Parse start and end dates
      const startDateObj = new Date(this.StartDate);
      const endDateObj = new Date(this.EndDate);
      
      this.ScoredTimeIntervals = [];
      
      // Iterate through each day in the date range
      // Use local dates to avoid timezone issues
      const startDate = startDateObj.toISOString().split('T')[0]; // Get YYYY-MM-DD
      
      // Parse dates in local timezone
      const currentDateObj = new Date(startDate + 'T00:00:00'); // Local midnight
      
      while (currentDateObj <= endDateObj) {
        const currentDate = new Date(currentDateObj);
        // Generate time slots for this day using the first user's working hours as reference
        let referenceUser = allUsers.find(user => user.importance === 'High');
        if (!referenceUser) {
          referenceUser = allUsers[0];
        }
        const daySlots = this.generateDayTimeSlots(
          currentDate,
          this.MeetingDurationMinutes,
          referenceUser.workingTime.startHour,
          referenceUser.workingTime.endHour
        );
        
        // Check availability for each slot and calculate scores
        for (const slot of daySlots) {
          const attendance = this.calculateAttendanceRates(slot);
          const score = this.calculatePreferenceScore(attendance);
          const participants = this.calculateParticipantAvailability(slot);
          
          this.ScoredTimeIntervals.push({
            start: slot.start,
            end: slot.end,
            score: score,
            midAttendance: attendance.mid,
            overallAttendance: attendance.overall,
            participants: participants
          });
        }
        
        // Move to next day in local time
        currentDateObj.setDate(currentDateObj.getDate() + 1);
      }
      
      // Sort by score (highest first)
      this.ScoredTimeIntervals.sort((a, b) => b.score - a.score);
      
      console.log(`Generated ${this.ScoredTimeIntervals.length} scored time intervals`);
      
    } catch (error) {
      console.error(`Error generating scored meeting slots:`, error);
      return;
    }
  }

  /**
   * Calculate attendance rates for a time slot (optimized for Mid and Overall only)
   * @param slot - The time slot to check
   * @returns Object with attendance rates for Mid and Overall
   */
  private calculateAttendanceRates(slot: TimeInterval): {
    mid: number;
    overall: number;
  } {
    let midAvailable = 0;
    let totalAvailable = 0;

    // Count available users in Mid priority level
    for (const user of this.Mid) {
      if (user.isTimeSlotAvailable(slot.start, slot.end)) {
        midAvailable++;
      }
    }

    // Count available users across all priority levels for overall attendance
    for (const user of this.High) {
      if (user.isTimeSlotAvailable(slot.start, slot.end)) {
        totalAvailable++;
      }
    }

    for (const user of this.Mid) {
      if (user.isTimeSlotAvailable(slot.start, slot.end)) {
        totalAvailable++;
      }
    }

    for (const user of this.Low) {
      if (user.isTimeSlotAvailable(slot.start, slot.end)) {
        totalAvailable++;
      }
    }

    // Calculate attendance rates (0-1)
    const midRate = this.Mid.length > 0 ? midAvailable / this.Mid.length : 0;
    const totalUsers = this.getTotalCount();
    const overallRate = totalUsers > 0 ? totalAvailable / totalUsers : 0;

    return {
      mid: midRate,
      overall: overallRate
    };
  }

  /**
   * Calculate preference score based on attendance rates
   * @param attendance - Attendance rates for Mid and Overall
   * @returns number - Preference score between 0 and 1
   */
  private calculatePreferenceScore(attendance: {
    mid: number;
    overall: number;
  }): number {
    // MID * 0.4 + OverallAttendance * 0.6
    return (attendance.mid==0?0.4:attendance.mid * 0.4) + (attendance.overall * 0.6);
  }

  /**
   * Calculate which participants are available and unavailable for a time slot
   * @param slot - Time slot to check
   * @returns Object with available and unavailable User objects
   */
  private calculateParticipantAvailability(slot: TimeInterval): {
    available: User[];
    unavailable: User[];
  } {
    const available: User[] = [];
    const unavailable: User[] = [];
    
    const allUsers = this.getAllUsers();
    
    for (const user of allUsers) {
      if (user.isTimeSlotAvailable(slot.start, slot.end)) {
        available.push(user);
      } else {
        unavailable.push(user);
      }
    }
    
    return { available, unavailable };
  }

}