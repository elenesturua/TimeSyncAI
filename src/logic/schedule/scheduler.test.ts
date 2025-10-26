import { describe, it, expect, beforeEach, vi } from 'vitest';

// MSGraphモジュールをモック
vi.mock('./MSGraph', () => ({
  GetCalendarEvents: vi.fn()
}));

// schedulerモジュールはモックしない（実際の実装を使用）

import { Schedule, User } from './scheduler';
import { GetCalendarEvents } from './MSGraph';

describe('Schedule', () => {
  let schedule: Schedule;
  let mockUsers: User[];

  beforeEach(() => {
    // Set test dates (15th only)
    const startDate = new Date('2024-01-15T00:00:00Z');
    const endDate = new Date('2024-01-15T23:59:59Z');
    
    schedule = new Schedule(startDate, endDate, 30); // 30-minute meeting

    // Create test users
    mockUsers = [
      new User('manager@example.com', 'Manager', 'High', {
        startHour: 9,
        endHour: 17,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      }),
      new User('lead@example.com', 'Lead Developer', 'High', {
        startHour: 9,
        endHour: 17,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      }),
      new User('dev1@example.com', 'Developer 1', 'Mid', {
        startHour: 10,
        endHour: 18,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      }),
      new User('dev2@example.com', 'Developer 2', 'Mid', {
        startHour: 10,
        endHour: 18,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      })
    ];

    // Add users to schedule
    schedule.addUser(mockUsers[0]); // Manager
    schedule.addUser(mockUsers[1]); // Lead
    schedule.addUser(mockUsers[2]); // Dev1
    schedule.addUser(mockUsers[3]); // Dev2

    // Add Low priority users
    const lowPriorityUsers = [
      new User('intern1@example.com', 'Intern 1', 'Low', {
        startHour: 9,
        endHour: 17,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      }),
      new User('intern2@example.com', 'Intern 2', 'Low', {
        startHour: 9,
        endHour: 17,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      }),
      new User('contractor@example.com', 'Contractor', 'Low', {
        startHour: 10,
        endHour: 16,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      })
    ];

    // Add Low priority users to schedule
    schedule.addUser(lowPriorityUsers[0]);
    schedule.addUser(lowPriorityUsers[1]);
    schedule.addUser(lowPriorityUsers[2]);

    // Add new Mid priority user with split working hours
    const newMidUser = new User('mid3@example.com', 'Mid 3', 'Mid', {
      startHour: 9,
      endHour: 14,
      timezone: 'UTC',
      workingDays: [1, 2, 3, 4, 5]
    });
    schedule.addUser(newMidUser);

    // Add Intern 3 with limited availability (11-12 only)
    const intern3 = new User('intern3@example.com', 'Intern 3', 'Low', {
      startHour: 11,
      endHour: 14,
      timezone: 'UTC',
      workingDays: [1, 2, 3, 4, 5]
    });
    schedule.addUser(intern3);

    // Mock GetCalendarEvents to return busy events for all users
    vi.mocked(GetCalendarEvents).mockImplementation(async (userID: string) => {
      // Return different events for each user to create conflicts
      if (userID === 'manager@example.com') {
        return [
          {
            id: 'event1',
            subject: 'Manager Meeting',
            start: { dateTime: '2024-01-15T10:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T13:15:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Manager', address: 'manager@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event2',
            subject: 'Manager 1on1',
            start: { dateTime: '2024-01-15T14:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T15:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Manager', address: 'manager@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'lead@example.com') {
        return [
          {
            id: 'event3',
            subject: 'Lead Standup',
            start: { dateTime: '2024-01-15T09:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T09:30:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Lead', address: 'lead@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event4',
            subject: 'Lead Code Review',
            start: { dateTime: '2024-01-15T15:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T16:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Lead', address: 'lead@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'dev1@example.com') {
        return [
          {
            id: 'event5',
            subject: 'Dev1 Training',
            start: { dateTime: '2024-01-15T13:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T13:30:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Dev1', address: 'dev1@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event6',
            subject: 'Dev1 Meeting',
            start: { dateTime: '2024-01-15T16:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T17:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Dev1', address: 'dev1@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'dev2@example.com') {
        return [
          {
            id: 'event7',
            subject: 'Dev2 Meeting',
            start: { dateTime: '2024-01-15T11:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T12:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Dev2', address: 'dev2@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event8',
            subject: 'Dev2 Review',
            start: { dateTime: '2024-01-15T14:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T15:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Dev2', address: 'dev2@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event15',
            subject: 'Dev2 Meeting 2',
            start: { dateTime: '2024-01-15T15:30:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T16:30:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Dev2', address: 'dev2@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'intern1@example.com') {
        return [
          {
            id: 'event9',
            subject: 'Intern1 Training',
            start: { dateTime: '2024-01-15T09:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T10:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Intern1', address: 'intern1@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event10',
            subject: 'Intern1 Meeting',
            start: { dateTime: '2024-01-15T12:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T13:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Intern1', address: 'intern1@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'intern2@example.com') {
        return [
          {
            id: 'event11',
            subject: 'Intern2 Training',
            start: { dateTime: '2024-01-15T10:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T11:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Intern2', address: 'intern2@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event12',
            subject: 'Intern2 Meeting',
            start: { dateTime: '2024-01-15T15:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T16:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Intern2', address: 'intern2@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'contractor@example.com') {
        return [
          {
            id: 'event13',
            subject: 'Contractor Call',
            start: { dateTime: '2024-01-15T11:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T12:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Contractor', address: 'contractor@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          },
          {
            id: 'event14',
            subject: 'Contractor Review',
            start: { dateTime: '2024-01-15T13:00:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T14:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Contractor', address: 'contractor@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'mid3@example.com') {
        return [
          {
            id: 'event16',
            subject: 'Mid3 Meeting',
            start: { dateTime: '2024-01-15T10:30:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T11:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Mid3', address: 'mid3@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      } else if (userID === 'intern3@example.com') {
        return [
          {
            id: 'event17',
            subject: 'Intern3 Training',
            start: { dateTime: '2024-01-15T11:30:00Z', timeZone: 'UTC' },
            end: { dateTime: '2024-01-15T12:00:00Z', timeZone: 'UTC' },
            organizer: { emailAddress: { name: 'Intern3', address: 'intern3@example.com' } },
            isCancelled: false,
            isAllDay: false,
            showAs: 'busy'
          }
        ];
      }
      
      return [];
    });

    // getBusyScheduleは実際の実装を使用（GetCalendarEventsがモックされているため）
  });

  describe('Constructor', () => {
    it('should create a schedule with valid dates', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-20');
      const duration = 30;

      const testSchedule = new Schedule(startDate, endDate, duration);

      expect(testSchedule.StartDate).toEqual(startDate);
      expect(testSchedule.EndDate).toEqual(endDate);
      expect(testSchedule.MeetingDurationMinutes).toBe(duration);
      expect(testSchedule.ScoredTimeIntervals).toEqual([]);
    });

    it('should throw error if start date is after end date', () => {
      const startDate = new Date('2024-01-20');
      const endDate = new Date('2024-01-15');

      expect(() => {
        new Schedule(startDate, endDate, 30);
      }).toThrow('Start date must be before end date');
    });
  });

  describe('User Management', () => {
    it('should add users to correct priority levels', () => {
      expect(schedule.High).toHaveLength(2);
      expect(schedule.Mid).toHaveLength(3);
      expect(schedule.Low).toHaveLength(4);
    });

    it('should add user to Low priority by default', () => {
      const newUser = new User('intern@example.com', 'Intern', 'Low');
      schedule.addUser(newUser);
      
      expect(schedule.Low).toContain(newUser);
    });

    it('should remove user from all priority levels', () => {
      const userToRemove = mockUsers[0];
      schedule.removeUser(userToRemove.userID);
      
      expect(schedule.High).not.toContain(userToRemove);
      expect(schedule.Mid).not.toContain(userToRemove);
      expect(schedule.Low).not.toContain(userToRemove);
    });

    it('should get total count correctly', () => {
      expect(schedule.getTotalCount()).toBe(9);
    });

    it('should get all users', () => {
      const allUsers = schedule.getAllUsers();
      expect(allUsers).toHaveLength(9);
      expect(allUsers).toContain(mockUsers[0]);
      expect(allUsers).toContain(mockUsers[1]);
      expect(allUsers).toContain(mockUsers[2]);
      expect(allUsers).toContain(mockUsers[3]);
    });
  });

  describe('generateScoredMeetingSlots', () => {
    it('should generate scored meeting slots', async () => {
      await schedule.generateScoredMeetingSlots();

      expect(schedule.ScoredTimeIntervals).toBeDefined();
      expect(Array.isArray(schedule.ScoredTimeIntervals)).toBe(true);
    });

    it('should sort slots by score in descending order', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      for (let i = 0; i < slots.length - 1; i++) {
        expect(slots[i].score).toBeGreaterThanOrEqual(slots[i + 1].score);
      }
    });

    it('should include score, midAttendance, and overallAttendance for each slot', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      expect(slots.length).toBeGreaterThan(0);

      slots.forEach(slot => {
        expect(slot).toHaveProperty('score');
        expect(slot).toHaveProperty('midAttendance');
        expect(slot).toHaveProperty('overallAttendance');
        expect(slot).toHaveProperty('start');
        expect(slot).toHaveProperty('end');
        
        expect(typeof slot.score).toBe('number');
        expect(typeof slot.midAttendance).toBe('number');
        expect(typeof slot.overallAttendance).toBe('number');
        expect(slot.score).toBeGreaterThanOrEqual(0);
        expect(slot.score).toBeLessThanOrEqual(1);
        expect(slot.midAttendance).toBeGreaterThanOrEqual(0);
        expect(slot.midAttendance).toBeLessThanOrEqual(1);
        expect(slot.overallAttendance).toBeGreaterThanOrEqual(0);
        expect(slot.overallAttendance).toBeLessThanOrEqual(1);
      });
    });

    it('should generate slots within working hours', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      slots.forEach(slot => {
        const startHour = slot.start.getUTCHours();
        const endHour = slot.end.getUTCHours();
        
        // 勤務時間内であることを確認（9:00-17:00）
        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(endHour).toBeLessThanOrEqual(17);
      });
    });

    it('should generate slots with correct duration', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      slots.forEach(slot => {
        const duration = slot.end.getTime() - slot.start.getTime();
        const durationMinutes = duration / (1000 * 60);
        
        expect(durationMinutes).toBe(30); // 30分の会議
      });
    });

    it('should handle empty user list gracefully', async () => {
      const emptySchedule = new Schedule(
        new Date('2024-01-15'),
        new Date('2024-01-17'),
        30
      );

      await emptySchedule.generateScoredMeetingSlots();

      expect(emptySchedule.ScoredTimeIntervals).toEqual([]);
    });
  });

  describe('Score Calculation', () => {
    it('should calculate scores based on Mid and Overall attendance', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      expect(slots.length).toBeGreaterThan(0);

      // スコアが正しく計算されていることを確認
      slots.forEach(slot => {
        const expectedScore = (slot.midAttendance * 0.4) + (slot.overallAttendance * 0.6);
        expect(slot.score).toBeCloseTo(expectedScore, 5);
      });
    });

    it('should prioritize slots with higher Mid and Overall attendance', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      if (slots.length > 1) {
        // 上位のスロットの方が高いスコアを持つことを確認
        const topSlot = slots[0];
        const secondSlot = slots[1];
        
        expect(topSlot.score).toBeGreaterThanOrEqual(secondSlot.score);
      }
    });

    it('should print scored meeting slots with Low priority users', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      console.log('\n=== Scored Meeting Time Slots ===');
      console.log(`Total slots: ${slots.length}`);
      console.log('User composition:');
      console.log(`- High priority: ${schedule.High.length} users`);
      console.log(`- Mid priority: ${schedule.Mid.length} users`);
      console.log(`- Low priority: ${schedule.Low.length} users`);
      console.log(`- Total: ${schedule.getTotalCount()} users`);
      
      // Debug: Check date and time slots
      console.log('\n=== Debug: Date and Time Analysis ===');
      console.log(`Schedule StartDate: ${schedule.StartDate.toISOString()}`);
      console.log(`Schedule EndDate: ${schedule.EndDate.toISOString()}`);
      
      if (slots.length > 0) {
        console.log(`First slot: ${slots[0].start.toISOString()} - ${slots[0].end.toISOString()}`);
        console.log(`Last slot: ${slots[slots.length-1].start.toISOString()} - ${slots[slots.length-1].end.toISOString()}`);
      }
      
      // Debug: Check a specific time slot (09:30-10:00) where some users should be available
      const debugSlot = slots.find(slot => {
        const startTime = slot.start.toLocaleString('en-US', { 
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit'
        });
        return startTime === '09:30';
      });
      
      if (debugSlot) {
        console.log('\n=== Debug: 09:30-10:00 Slot ===');
        console.log(`Score: ${debugSlot.score.toFixed(3)}`);
        console.log(`Mid attendance: ${(debugSlot.midAttendance * 100).toFixed(1)}%`);
        console.log(`Overall attendance: ${(debugSlot.overallAttendance * 100).toFixed(1)}%`);
      } else {
        console.log('\n=== Debug: 09:30-10:00 Slot not found ===');
        console.log('Available time slots:');
        slots.slice(0, 5).forEach((slot, index) => {
          const startTime = slot.start.toLocaleString('en-US', { 
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log(`${index + 1}. ${startTime}`);
        });
      }
      
      // Display availability table with working hours
      console.log('\n=== Participant Availability Table (15-minute intervals) ===');
      console.log('Time    | Manager | Lead    | Dev1    | Dev2    | Mid3    | Intern1 | Intern2 | Contractor | Intern3');
      console.log('--------|---------|---------|---------|---------|---------|---------|---------|----------|--------');
      
      // Display working hours for each user
      console.log('\n=== Working Hours ===');
      const orderedUsers = [
        ...schedule.High,
        ...schedule.Mid,
        ...schedule.Low
      ];
      
      orderedUsers.forEach((user) => {
        const workingDaysStr = user.workingTime.workingDays.map(day => {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return dayNames[day];
        }).join(', ');
        
        console.log(`${user.name}: ${user.workingTime.startHour}:00-${user.workingTime.endHour}:00 UTC (${workingDaysStr})`);
      });
      console.log('');
      
      // Get users in priority order (High → Mid → Low) for availability table
      const usersForTable = [
        ...schedule.High,
        ...schedule.Mid,
        ...schedule.Low
      ];
      
      const timeSlots = [];
      
      // Generate 15-minute time slots from 09:00 to 17:00
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const startTime = new Date('2024-01-15T00:00:00.000Z');
          startTime.setUTCHours(hour, minute, 0, 0);
          const endTime = new Date(startTime);
          endTime.setUTCMinutes(endTime.getUTCMinutes() + 15);
          
          timeSlots.push({ start: startTime, end: endTime });
        }
      }
      
      timeSlots.forEach(timeSlot => {
        const timeStr = timeSlot.start.toLocaleString('en-US', { 
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const availability = usersForTable.map(user => {
          return user.isTimeSlotAvailable(timeSlot.start, timeSlot.end) ? '*' : '-';
        }).join(' | ');
        
        console.log(`${timeStr}   | ${availability}`);
      });

      console.log('\nTop 20 slots (High priority users can attend):');
      const displaySlots = slots.length <= 20 ? slots : slots.slice(0, 20);
      
      displaySlots.forEach((slot, index) => {
        const startTime = slot.start.toLocaleString('en-US', { 
          timeZone: 'UTC',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'short'
        });
        const endTime = slot.end.toLocaleString('en-US', { 
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Calculate individual attendance counts
        const highCount = schedule.High.filter(user => user.isTimeSlotAvailable(slot.start, slot.end)).length;
        const midCount = schedule.Mid.filter(user => user.isTimeSlotAvailable(slot.start, slot.end)).length;
        const lowCount = schedule.Low.filter(user => user.isTimeSlotAvailable(slot.start, slot.end)).length;
        
        console.log(`${index + 1}. ${startTime} - ${endTime}`);
        console.log(`   Score: ${slot.score.toFixed(3)}, ${highCount}-${midCount}-${lowCount} (High-Mid-Low), ${(slot.overallAttendance * 100).toFixed(1)}%`);
        
        // Group available participants by priority using importance property
        const availableHigh = slot.participants.available.filter(user => user.importance === 'High');
        const availableMid = slot.participants.available.filter(user => user.importance === 'Mid');
        const availableLow = slot.participants.available.filter(user => user.importance === 'Low');
        
        console.log(`   Available: High[${availableHigh.map(u => u.name).join(', ')}] Mid[${availableMid.map(u => u.name).join(', ')}] Low[${availableLow.map(u => u.name).join(', ')}]`);
        
        // Group unavailable participants by priority using importance property
        const unavailableHigh = slot.participants.unavailable.filter(user => user.importance === 'High');
        const unavailableMid = slot.participants.unavailable.filter(user => user.importance === 'Mid');
        const unavailableLow = slot.participants.unavailable.filter(user => user.importance === 'Low');
        
        console.log(`   Unavailable: High[${unavailableHigh.map(u => u.name).join(', ')}] Mid[${unavailableMid.map(u => u.name).join(', ')}] Low[${unavailableLow.map(u => u.name).join(', ')}]`);
        console.log('');
      });

      console.log(`\nTotal High priority compatible slots: ${slots.length}`);

      expect(slots.length).toBeGreaterThan(0);
    });
  });

  describe('Time Slot Generation', () => {
    it('should generate slots at 5-minute intervals', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      slots.forEach(slot => {
        const startMinutes = slot.start.getMinutes();
        expect([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]).toContain(startMinutes);
      });
    });

    it('should generate slots for the specified date range', async () => {
      await schedule.generateScoredMeetingSlots();

      const slots = schedule.ScoredTimeIntervals;
      if (slots.length > 0) {
        slots.forEach(slot => {
          const dayOfWeek = slot.start.getDay();
          // 実際の実装では日曜日(0)から火曜日(2)まで生成される
          // テスト期間が2024-01-15（月）から2024-01-17（水）のため
          expect([0, 1, 2]).toContain(dayOfWeek);
        });
      }
    });
  });
});