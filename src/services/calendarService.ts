import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CalendarEvent, CalendarSync } from '../types/firestore';
import { getCalendarEvents, createGraphClient } from '../lib/graphApi';

export class CalendarService {
  // Store calendar events for a user
  static async storeCalendarEvents(
    userId: string,
    events: any[] // Microsoft Graph events
  ): Promise<void> {
    const batch = [];
    
    // Clear existing events for this user
    const existingEventsQuery = query(
      collection(db, 'calendarEvents'),
      where('userId', '==', userId)
    );
    const existingEvents = await getDocs(existingEventsQuery);
    
    // Delete existing events
    for (const doc of existingEvents.docs) {
      batch.push(deleteDoc(doc.ref));
    }
    
    // Add new events
    for (const event of events) {
      const calendarEvent: Omit<CalendarEvent, 'id'> = {
        userId,
        subject: event.subject || 'No Subject',
        start: event.start,
        end: event.end,
        isAllDay: event.isAllDay || false,
        showAs: event.showAs || 'busy',
        lastUpdated: new Date().toISOString(),
      };
      
      batch.push(addDoc(collection(db, 'calendarEvents'), calendarEvent));
    }
    
    // Execute batch
    await Promise.all(batch);
    
    // Update sync record
    await this.updateSyncRecord(userId, events.length, 'success');
  }

  // Get calendar events for a user within date range
  static async getCalendarEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const q = query(
      collection(db, 'calendarEvents'),
      where('userId', '==', userId),
      where('start.dateTime', '>=', startDate.toISOString()),
      where('start.dateTime', '<=', endDate.toISOString()),
      orderBy('start.dateTime')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CalendarEvent[];
  }

  // Get calendar events for multiple users
  static async getMultipleUsersCalendarEvents(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<{ [userId: string]: CalendarEvent[] }> {
    const result: { [userId: string]: CalendarEvent[] } = {};
    
    // Get events for each user
    for (const userId of userIds) {
      result[userId] = await this.getCalendarEvents(userId, startDate, endDate);
    }
    
    return result;
  }

  // Sync calendar from Microsoft Graph
  static async syncUserCalendar(userId: string, msalInstance: any): Promise<void> {
    try {
      // Update sync status to in_progress
      await this.updateSyncRecord(userId, 0, 'in_progress');
      
      // Get Microsoft Graph client
      const graphClient = createGraphClient(msalInstance);
      
      // Fetch events for next 30 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      const events = await getCalendarEvents(graphClient, startDate, endDate);
      
      // Store events in Firestore
      await this.storeCalendarEvents(userId, events);
      
    } catch (error) {
      console.error('Error syncing calendar:', error);
      await this.updateSyncRecord(userId, 0, 'error', (error as Error).message);
    }
  }

  // Update sync record
  private static async updateSyncRecord(
    userId: string,
    eventsCount: number,
    status: 'success' | 'error' | 'in_progress',
    errorMessage?: string
  ): Promise<void> {
    const syncData: Omit<CalendarSync, 'id'> = {
      userId,
      lastSyncTime: new Date().toISOString(),
      eventsCount,
      syncStatus: status,
      errorMessage,
    };
    
    // Check if sync record exists
    const syncQuery = query(
      collection(db, 'calendarSyncs'),
      where('userId', '==', userId)
    );
    const existingSync = await getDocs(syncQuery);
    
    if (existingSync.empty) {
      // Create new sync record
      await addDoc(collection(db, 'calendarSyncs'), syncData);
    } else {
      // Update existing sync record
      const syncDoc = existingSync.docs[0];
      await updateDoc(doc(db, 'calendarSyncs', syncDoc.id), syncData);
    }
  }

  // Get user's last sync status
  static async getLastSyncStatus(userId: string): Promise<CalendarSync | null> {
    const q = query(
      collection(db, 'calendarSyncs'),
      where('userId', '==', userId),
      orderBy('lastSyncTime', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as CalendarSync;
  }

  // Find available time slots across multiple users
  static async findAvailableSlots(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
    workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' }
  ): Promise<Date[]> {
    // Get calendar events for all users
    const allEvents = await this.getMultipleUsersCalendarEvents(userIds, startDate, endDate);
    
    // Flatten all events
    const allEventsFlat: CalendarEvent[] = [];
    Object.values(allEvents).forEach(events => {
      allEventsFlat.push(...events);
    });
    
    // Find available slots using existing algorithm
    return this.calculateAvailableSlots(allEventsFlat, startDate, endDate, durationMinutes, workingHours);
  }

  // Calculate available time slots
  private static calculateAvailableSlots(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
    workingHours: { start: string; end: string }
  ): Date[] {
    const availableSlots: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Skip weekends
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
        
        if (slotEnd <= dayEnd && this.isTimeSlotFree(events, slotStart, slotEnd)) {
          availableSlots.push(new Date(slotStart));
        }
        
        slotStart.setMinutes(slotStart.getMinutes() + 30);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableSlots;
  }

  // Check if a time slot is free
  private static isTimeSlotFree(
    events: CalendarEvent[],
    startTime: Date,
    endTime: Date
  ): boolean {
    return !events.some(event => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      
      // Check for overlap
      return (
        (startTime < eventEnd && endTime > eventStart) &&
        event.showAs !== 'free'
      );
    });
  }
}
