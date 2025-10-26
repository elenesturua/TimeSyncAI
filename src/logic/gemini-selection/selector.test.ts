import { describe, it, expect, beforeEach, vi } from 'vitest';

// MSGraphモジュールをモック
vi.mock('../schedule/MSGraph', () => ({
  GetCalendarEvents: vi.fn()
}));

// Gemini APIをモック
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  }))
}));

import { Schedule, User, type ScoredTimeInterval } from '../schedule/scheduler';
import { GetCalendarEvents } from '../schedule/MSGraph';

// selector.tsから必要な関数をインポート（実際の実装を使用）
import { 
  generateScoredSlots, 
  buildGeminiPrompt, 
  parseGeminiTextOutput, 
  convertToSuggestedSlot 
} from './selector';

describe('Gemini Selection Integration', () => {
  let schedule: Schedule;
  let mockUsers: User[];
  let mockScoredSlots: ScoredTimeInterval[];

  beforeEach(() => {
    // Set test dates (15th only)
    const startDate = new Date('2024-01-15T00:00:00Z');
    const endDate = new Date('2024-01-15T23:59:59Z');
    
    schedule = new Schedule(startDate, endDate, 30); // 30-minute meeting

    // Create test users (scheduler.test.tsと同じデータを使用)
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
      }),
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
      }),
      new User('mid3@example.com', 'Mid 3', 'Mid', {
        startHour: 9,
        endHour: 14,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      }),
      new User('intern3@example.com', 'Intern 3', 'Low', {
        startHour: 11,
        endHour: 14,
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      })
    ];

    // Add users to schedule
    mockUsers.forEach(user => schedule.addUser(user));

    // Mock GetCalendarEvents to return busy events (scheduler.test.tsと同じデータ)
    vi.mocked(GetCalendarEvents).mockImplementation(async (userID: string) => {
      const mockEvents = {
        'manager@example.com': [
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
        ],
        'lead@example.com': [
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
        ],
        'dev1@example.com': [
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
        ],
        'dev2@example.com': [
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
        ],
        'intern1@example.com': [
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
        ],
        'intern2@example.com': [
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
        ],
        'contractor@example.com': [
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
        ],
        'mid3@example.com': [
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
        ],
        'intern3@example.com': [
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
        ]
      };

      return mockEvents[userID as keyof typeof mockEvents] || [];
    });

    // Generate scored slots for testing
    schedule.generateScoredMeetingSlots().then(() => {
      mockScoredSlots = schedule.ScoredTimeIntervals;
    });
  });

  describe('generateScoredSlots', () => {
    it('should generate scored slots from request body', async () => {
      const requestBody = {
        participants: [
          {
            id: 'manager@example.com',
            name: 'Manager',
            priority: 'High' as const,
            busy: [
              { startISO: '2024-01-15T10:00:00Z', endISO: '2024-01-15T13:15:00Z' },
              { startISO: '2024-01-15T14:00:00Z', endISO: '2024-01-15T15:00:00Z' }
            ],
            workingTime: {
              startHour: 9,
              endHour: 17,
              workingDays: [1, 2, 3, 4, 5]
            }
          },
          {
            id: 'lead@example.com',
            name: 'Lead Developer',
            priority: 'High' as const,
            busy: [
              { startISO: '2024-01-15T09:00:00Z', endISO: '2024-01-15T09:30:00Z' },
              { startISO: '2024-01-15T15:00:00Z', endISO: '2024-01-15T16:00:00Z' }
            ],
            workingTime: {
              startHour: 9,
              endHour: 17,
              workingDays: [1, 2, 3, 4, 5]
            }
          }
        ],
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        meetingDurationMinutes: 30
      };

      const scoredSlots = await generateScoredSlots(requestBody);

      expect(scoredSlots).toBeDefined();
      expect(Array.isArray(scoredSlots)).toBe(true);
      expect(scoredSlots.length).toBeGreaterThan(0);

      // Verify slot structure
      scoredSlots.forEach(slot => {
        expect(slot).toHaveProperty('start');
        expect(slot).toHaveProperty('end');
        expect(slot).toHaveProperty('score');
        expect(slot).toHaveProperty('midAttendance');
        expect(slot).toHaveProperty('overallAttendance');
        expect(slot).toHaveProperty('participants');
        expect(slot.participants).toHaveProperty('available');
        expect(slot.participants).toHaveProperty('unavailable');
      });
    });

    it('should handle empty participants gracefully', async () => {
      const requestBody = {
        participants: [],
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        meetingDurationMinutes: 30
      };

      const scoredSlots = await generateScoredSlots(requestBody);
      expect(scoredSlots).toEqual([]);
    });
  });

  describe('buildGeminiPrompt', () => {
    it('should build proper Gemini prompt with scored slots', async () => {
      await schedule.generateScoredMeetingSlots();
      const scoredSlots = schedule.ScoredTimeIntervals;

      const requestBody = {
        participants: [
          {
            id: 'manager@example.com',
            name: 'Manager',
            priority: 'High' as const,
            busy: [],
            workingTime: { startHour: 9, endHour: 17, workingDays: [1, 2, 3, 4, 5] }
          }
        ],
        preferences: {
          durationMinutes: 30,
          preferredStartHourRange: { start: 9, end: 17 }
        },
        contextNotes: 'Team standup meeting',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        meetingDurationMinutes: 30
      };

      const prompt = buildGeminiPrompt(requestBody, scoredSlots);

      expect(prompt).toHaveProperty('systemInstruction');
      expect(prompt).toHaveProperty('userPrompt');
      expect(prompt.systemInstruction).toContain('expert meeting scheduler');
      expect(prompt.userPrompt).toContain('PRE-SCORED TIMESLOTS');
      expect(prompt.userPrompt).toContain('PARTICIPANTS:');
      expect(prompt.userPrompt).toContain('PREFERENCES:');
      expect(prompt.userPrompt).toContain('CONTEXT NOTES:');
    });

    it('should limit timeslots to top 10 in prompt', async () => {
      await schedule.generateScoredMeetingSlots();
      const scoredSlots = schedule.ScoredTimeIntervals;

      const requestBody = {
        participants: [],
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        meetingDurationMinutes: 30
      };

      const prompt = buildGeminiPrompt(requestBody, scoredSlots);
      
      // Count occurrences of "id:slot_" to verify limit
      const slotMatches = prompt.userPrompt.match(/id:slot_\d+/g);
      expect(slotMatches?.length).toBeLessThanOrEqual(10);
    });
  });

  describe('parseGeminiTextOutput', () => {
    it('should parse valid Gemini text output correctly', () => {
      const mockGeminiOutput = `
RECOMMENDATION 1:
Slot ID: slot_1
Start Time: 2024-01-15T09:30:00.000Z
End Time: 2024-01-15T10:00:00.000Z
Score: 85
Confidence: 90
Reason: This time slot provides excellent availability for all high-priority participants with minimal conflicts.
Suggested Attendees: manager@example.com:suggest, lead@example.com:suggest, dev1@example.com:optional
Practical Notes: Send calendar invites 24 hours in advance
Consider sending reminder 1 hour before meeting

RECOMMENDATION 2:
Slot ID: slot_2
Start Time: 2024-01-15T13:30:00.000Z
End Time: 2024-01-15T14:00:00.000Z
Score: 75
Confidence: 80
Reason: Good alternative time with decent attendance rates and minimal scheduling conflicts.
Suggested Attendees: manager@example.com:suggest, lead@example.com:suggest
Practical Notes: Check with dev team for availability
Consider shorter meeting duration if needed

RECOMMENDATION 3:
Slot ID: slot_3
Start Time: 2024-01-15T16:30:00.000Z
End Time: 2024-01-15T17:00:00.000Z
Score: 65
Confidence: 70
Reason: Late afternoon slot with moderate attendance but may work for urgent meetings.
Suggested Attendees: manager@example.com:suggest, lead@example.com:optional
Practical Notes: Confirm end-of-day availability
Consider rescheduling if not urgent

METHODOLOGY:
Selected timeslots based on high-priority participant availability, mid-priority attendance rates, and practical scheduling considerations.
`;

      const suggestions = parseGeminiTextOutput(mockGeminiOutput);

      expect(suggestions).toHaveLength(3);
      
      // Verify first suggestion
      expect(suggestions[0].timeslot.id).toBe('slot_1');
      expect(suggestions[0].timeslot.startISO).toBe('2024-01-15T09:30:00.000Z');
      expect(suggestions[0].timeslot.endISO).toBe('2024-01-15T10:00:00.000Z');
      expect(suggestions[0].score).toBe(85);
      expect(suggestions[0].confidence).toBe(90);
      expect(suggestions[0].reason).toContain('excellent availability');
      expect(suggestions[0].suggestedAttendees).toHaveLength(3);
      expect(suggestions[0].practicalNotes).toHaveLength(2);

      // Verify second suggestion
      expect(suggestions[1].timeslot.id).toBe('slot_2');
      expect(suggestions[1].score).toBe(75);
      expect(suggestions[1].confidence).toBe(80);

      // Verify third suggestion
      expect(suggestions[2].timeslot.id).toBe('slot_3');
      expect(suggestions[2].score).toBe(65);
      expect(suggestions[2].confidence).toBe(70);
    });

    it('should handle malformed Gemini output gracefully', () => {
      const malformedOutput = `
RECOMMENDATION 1:
Slot ID: slot_1
Start Time: invalid-date
End Time: 2024-01-15T10:00:00.000Z
Score: 85
Confidence: 90
Reason: This is a test
`;

      const suggestions = parseGeminiTextOutput(malformedOutput);
      expect(suggestions).toHaveLength(0);
    });

    it('should handle empty Gemini output', () => {
      const suggestions = parseGeminiTextOutput('');
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('convertToSuggestedSlot', () => {
    it('should convert ScoredTimeInterval to SuggestedSlot format', async () => {
      await schedule.generateScoredMeetingSlots();
      const scoredSlot = schedule.ScoredTimeIntervals[0];

      const suggestedSlot = convertToSuggestedSlot(scoredSlot, 0);

      expect(suggestedSlot).toHaveProperty('timeslot');
      expect(suggestedSlot).toHaveProperty('score');
      expect(suggestedSlot).toHaveProperty('confidence');
      expect(suggestedSlot).toHaveProperty('reason');
      expect(suggestedSlot).toHaveProperty('suggestedAttendees');
      expect(suggestedSlot).toHaveProperty('practicalNotes');

      expect(suggestedSlot.timeslot.id).toBe('slot_1');
      expect(suggestedSlot.timeslot.startISO).toBe(scoredSlot.start.toISOString());
      expect(suggestedSlot.timeslot.endISO).toBe(scoredSlot.end.toISOString());
      expect(suggestedSlot.score).toBeGreaterThanOrEqual(0);
      expect(suggestedSlot.score).toBeLessThanOrEqual(100);
      expect(suggestedSlot.confidence).toBeGreaterThanOrEqual(60);
      expect(suggestedSlot.confidence).toBeLessThanOrEqual(95);
      expect(suggestedSlot.reason).toContain('attendance');
      expect(Array.isArray(suggestedSlot.suggestedAttendees)).toBe(true);
      expect(Array.isArray(suggestedSlot.practicalNotes)).toBe(true);
    });
  });

  describe('Top 20 Selection Test', () => {
    it('should generate and display top 20 scored slots for Gemini selection', async () => {
      await schedule.generateScoredMeetingSlots();
      const scoredSlots = schedule.ScoredTimeIntervals;

      expect(scoredSlots.length).toBeGreaterThan(0);

      // Get top 20 slots
      const top20Slots = scoredSlots.slice(0, 20);
      
      console.log('\n=== Top 20 Scored Meeting Slots for Gemini Selection ===');
      console.log(`Total available slots: ${scoredSlots.length}`);
      console.log(`Top 20 slots selected for Gemini analysis:`);
      console.log('');

      top20Slots.forEach((slot, index) => {
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
        console.log(`   Score: ${slot.score.toFixed(3)} | Mid: ${(slot.midAttendance * 100).toFixed(1)}% | Overall: ${(slot.overallAttendance * 100).toFixed(1)}%`);
        console.log(`   Attendance: High[${highCount}/${schedule.High.length}] Mid[${midCount}/${schedule.Mid.length}] Low[${lowCount}/${schedule.Low.length}]`);
        
        // Show available participants
        const availableHigh = slot.participants.available.filter(user => user.importance === 'High');
        const availableMid = slot.participants.available.filter(user => user.importance === 'Mid');
        const availableLow = slot.participants.available.filter(user => user.importance === 'Low');
        
        console.log(`   Available: High[${availableHigh.map(u => u.name).join(', ')}] Mid[${availableMid.map(u => u.name).join(', ')}] Low[${availableLow.map(u => u.name).join(', ')}]`);
        console.log('');
      });

      // Test Gemini prompt generation with top 20 slots
      const requestBody = {
        participants: mockUsers.map(user => ({
          id: user.userID,
          name: user.name,
          priority: user.importance,
          busy: user.busySchedule.getBusyIntervals().map(interval => ({
            startISO: interval.start.toISOString(),
            endISO: interval.end.toISOString()
          })),
          workingTime: {
            startHour: user.workingTime.startHour,
            endHour: user.workingTime.endHour,
            workingDays: user.workingTime.workingDays
          }
        })),
        preferences: {
          durationMinutes: 30,
          preferredStartHourRange: { start: 9, end: 17 },
          bufferMinutes: 15
        },
        contextNotes: 'Weekly team standup meeting with all developers and stakeholders',
        startDate: '2024-01-15',
        endDate: '2024-01-15',
        meetingDurationMinutes: 30
      };

      const prompt = buildGeminiPrompt(requestBody, top20Slots);
      
      console.log('=== Gemini Prompt Preview ===');
      console.log('System Instruction Length:', prompt.systemInstruction.length);
      console.log('User Prompt Length:', prompt.userPrompt.length);
      console.log('Timeslots in prompt:', (prompt.userPrompt.match(/id:slot_\d+/g) || []).length);
      console.log('');

      // Verify prompt contains expected elements
      expect(prompt.systemInstruction).toContain('expert meeting scheduler');
      expect(prompt.userPrompt).toContain('PRE-SCORED TIMESLOTS');
      expect(prompt.userPrompt).toContain('PARTICIPANTS:');
      expect(prompt.userPrompt).toContain('PREFERENCES:');
      expect(prompt.userPrompt).toContain('CONTEXT NOTES:');
      expect(prompt.userPrompt).toContain('Weekly team standup meeting');

      // Test conversion to suggested slots
      const top3SuggestedSlots = top20Slots.slice(0, 3).map((slot, index) => 
        convertToSuggestedSlot(slot, index)
      );

      console.log('=== Top 3 Suggested Slots (Algorithmic Fallback) ===');
      top3SuggestedSlots.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion.timeslot.startISO} - ${suggestion.timeslot.endISO}`);
        console.log(`   Score: ${suggestion.score}/100 | Confidence: ${suggestion.confidence}%`);
        console.log(`   Reason: ${suggestion.reason}`);
        console.log(`   Suggested Attendees: ${suggestion.suggestedAttendees.length}`);
        console.log(`   Practical Notes: ${suggestion.practicalNotes.length} items`);
        console.log('');
      });

      expect(top3SuggestedSlots).toHaveLength(3);
      top3SuggestedSlots.forEach(suggestion => {
        expect(suggestion.score).toBeGreaterThanOrEqual(0);
        expect(suggestion.score).toBeLessThanOrEqual(100);
        expect(suggestion.confidence).toBeGreaterThanOrEqual(60);
        expect(suggestion.confidence).toBeLessThanOrEqual(95);
        expect(suggestion.reason).toBeTruthy();
        expect(Array.isArray(suggestion.suggestedAttendees)).toBe(true);
        expect(Array.isArray(suggestion.practicalNotes)).toBe(true);
      });

      expect(top20Slots.length).toBeLessThanOrEqual(20);
      expect(top20Slots.length).toBeGreaterThan(0);
    });

    it('should handle edge case with fewer than 20 available slots', async () => {
      // Create a schedule with very limited availability
      const limitedSchedule = new Schedule(
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-01-15T23:59:59Z'),
        30
      );

      // Add only one user with very limited availability
      const limitedUser = new User('limited@example.com', 'Limited User', 'High', {
        startHour: 9,
        endHour: 10, // Only 1 hour available
        timezone: 'UTC',
        workingDays: [1, 2, 3, 4, 5]
      });

      limitedSchedule.addUser(limitedUser);

      // Mock busy events for most of the day
      vi.mocked(GetCalendarEvents).mockImplementation(async () => [
        {
          id: 'busy1',
          subject: 'Busy',
          start: { dateTime: '2024-01-15T10:00:00Z', timeZone: 'UTC' },
          end: { dateTime: '2024-01-15T17:00:00Z', timeZone: 'UTC' },
          organizer: { emailAddress: { name: 'Limited', address: 'limited@example.com' } },
          isCancelled: false,
          isAllDay: false,
          showAs: 'busy'
        }
      ]);

      await limitedSchedule.generateScoredMeetingSlots();
      const limitedSlots = limitedSchedule.ScoredTimeIntervals;

      console.log(`\n=== Limited Availability Test ===`);
      console.log(`Available slots: ${limitedSlots.length}`);

      const top20FromLimited = limitedSlots.slice(0, 20);
      expect(top20FromLimited.length).toBeLessThanOrEqual(20);
      expect(top20FromLimited.length).toBe(limitedSlots.length); // Should be all available slots

      if (limitedSlots.length > 0) {
        const requestBody = {
          participants: [{
            id: 'limited@example.com',
            name: 'Limited User',
            priority: 'High' as const,
            busy: [],
            workingTime: { startHour: 9, endHour: 10, workingDays: [1, 2, 3, 4, 5] }
          }],
          startDate: '2024-01-15',
          endDate: '2024-01-15',
          meetingDurationMinutes: 30
        };

        const prompt = buildGeminiPrompt(requestBody, top20FromLimited);
        expect(prompt.userPrompt).toContain('PRE-SCORED TIMESLOTS');
      }
    });
  });

  describe('Integration Test with Mock Gemini Response', () => {
    it('should simulate complete Gemini selection workflow', async () => {
      await schedule.generateScoredMeetingSlots();
      const scoredSlots = schedule.ScoredTimeIntervals;
      const top20Slots = scoredSlots.slice(0, 20);

      // Mock Gemini response
      const mockGeminiResponse = `
RECOMMENDATION 1:
Slot ID: slot_1
Start Time: 2024-01-15T09:30:00.000Z
End Time: 2024-01-15T10:00:00.000Z
Score: 88
Confidence: 92
Reason: Optimal time slot with all high-priority participants available and excellent mid-priority attendance. Morning slot ensures fresh minds and minimal conflicts.
Suggested Attendees: manager@example.com:suggest, lead@example.com:suggest, dev1@example.com:suggest, dev2@example.com:optional
Practical Notes: Send calendar invites 24 hours in advance
Consider coffee break before meeting
Prepare agenda in advance

RECOMMENDATION 2:
Slot ID: slot_2
Start Time: 2024-01-15T13:30:00.000Z
End Time: 2024-01-15T14:00:00.000Z
Score: 82
Confidence: 85
Reason: Good afternoon alternative with strong attendance rates. Post-lunch slot may require energy management but offers good availability.
Suggested Attendees: manager@example.com:suggest, lead@example.com:suggest, dev1@example.com:optional
Practical Notes: Schedule after lunch break
Consider shorter meeting if energy is low
Send reminder 30 minutes before

RECOMMENDATION 3:
Slot ID: slot_3
Start Time: 2024-01-15T16:30:00.000Z
End Time: 2024-01-15T17:00:00.000Z
Score: 75
Confidence: 78
Reason: End-of-day slot with moderate attendance. Suitable for urgent meetings but may conflict with end-of-day routines.
Suggested Attendees: manager@example.com:suggest, lead@example.com:optional
Practical Notes: Confirm end-of-day availability
Keep meeting concise
Consider rescheduling if not urgent

METHODOLOGY:
Selected timeslots based on high-priority participant availability (100% required), mid-priority attendance optimization, and practical scheduling considerations including time of day preferences and energy levels.
`;

      // Parse the mock response
      const parsedSuggestions = parseGeminiTextOutput(mockGeminiResponse);

      console.log('\n=== Complete Gemini Selection Workflow Test ===');
      console.log(`Input: ${top20Slots.length} scored slots`);
      console.log(`Output: ${parsedSuggestions.length} Gemini recommendations`);
      console.log('');

      parsedSuggestions.forEach((suggestion, index) => {
        console.log(`Gemini Recommendation ${index + 1}:`);
        console.log(`  Time: ${suggestion.timeslot.startISO} - ${suggestion.timeslot.endISO}`);
        console.log(`  Score: ${suggestion.score}/100 | Confidence: ${suggestion.confidence}%`);
        console.log(`  Reason: ${suggestion.reason}`);
        console.log(`  Attendees: ${suggestion.suggestedAttendees.length} participants`);
        console.log(`  Notes: ${suggestion.practicalNotes.length} practical tips`);
        console.log('');
      });

      // Verify parsed suggestions
      expect(parsedSuggestions).toHaveLength(3);
      expect(parsedSuggestions[0].score).toBe(88);
      expect(parsedSuggestions[0].confidence).toBe(92);
      expect(parsedSuggestions[0].suggestedAttendees).toHaveLength(4);
      expect(parsedSuggestions[0].practicalNotes).toHaveLength(3);

      // Test algorithmic fallback comparison
      const algorithmicSuggestions = top20Slots.slice(0, 3).map((slot, index) => 
        convertToSuggestedSlot(slot, index)
      );

      console.log('=== Algorithmic vs Gemini Comparison ===');
      console.log('Algorithmic Top 3:');
      algorithmicSuggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. Score: ${suggestion.score}/100 | Confidence: ${suggestion.confidence}%`);
      });
      console.log('');
      console.log('Gemini Top 3:');
      parsedSuggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. Score: ${suggestion.score}/100 | Confidence: ${suggestion.confidence}%`);
      });

      // Both should provide valid suggestions
      expect(algorithmicSuggestions.length).toBeGreaterThan(0);
      expect(parsedSuggestions.length).toBeGreaterThan(0);
    });
  });
});
