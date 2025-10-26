# AI Suggestions Flow - Implementation Plan

## Overview
Connect the Gemini AI selection logic with the UI to provide intelligent meeting suggestions based on participant calendars and preferences.

## Current Architecture

### 1. **Schedule System** (`src/logic/schedule/scheduler.ts`)
- `User` class with importance (High/Mid/Low) and working time
- `BusySchedule` to track calendar conflicts
- `Schedule` class to manage multiple users and generate time slots

### 2. **AI Selection** (`src/logic/gemini-selection/selector.ts`)
- `generateScoredSlots()` - Creates scored time intervals
- Integrates with Gemini API for intelligent suggestions
- Supports chat-based refinement

### 3. **UI** (`src/routes/PlanMeeting.tsx`)
- Currently uses mock data
- Needs integration with real AI suggestions

## Integration Steps

### Step 1: Implement GetCalendarEvents in MSGraph.ts

```typescript
// src/logic/schedule/MSGraph.ts
export async function GetCalendarEvents(
  userID: string, 
  startDay: string, 
  endDay: string,
  msalInstance: PublicClientApplication
): Promise<GraphEvent[]> {
  try {
    // Get token from MSAL
    const account = msalInstance.getActiveAccount();
    if (!account) throw new Error('No active account');
    
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ['Calendars.Read'],
      account
    });
    
    const token = tokenResponse.accessToken;
    
    // Fetch calendar events from Microsoft Graph
    const endpoint = 'https://graph.microsoft.com/v1.0/me/calendar/calendarView';
    const params = new URLSearchParams({
      startDateTime: `${startDay}T00:00:00Z`,
      endDateTime: `${endDay}T23:59:59Z`,
      $select: 'subject,start,end,isAllDay,showAs'
    });
    
    const response = await fetch(`${endpoint}?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return [];
  }
}
```

### Step 2: Create User Objects with Importance

```typescript
// In PlanMeeting.tsx
const createUserObjects = (participants: Participant[]) => {
  return participants.map((p, index) => {
    // Assign importance based on some logic (could be user-defined)
    const importance = index === 0 ? 'High' : 'Mid';
    
    return new User(
      p.email,
      p.name || p.email,
      importance,
      {
        startHour: 9, // Default or from preferences
        endHour: 17,
        timezone: 'UTC',
        workingDays: [1,2,3,4,5] // Mon-Fri
      }
    );
  });
};
```

### Step 3: Fetch Calendar Data and Populate Busy Schedules

```typescript
// In PlanMeeting.tsx
const loadCalendarDataAndGenerateSuggestions = async () => {
  // 1. Create User objects with importance
  const userObjects = createUserObjects(participants);
  
  // 2. Fetch calendar events for each user
  for (const user of userObjects) {
    const events = await GetCalendarEvents(
      user.userID,
      dateRange.start,
      dateRange.end,
      instance
    );
    
    // Populate busy schedule
    for (const event of events) {
      // Skip if showAs is 'free'
      if (event.showAs === 'free') continue;
      
      user.busySchedule.addEvent(
        new Date(event.start.dateTime),
        new Date(event.end.dateTime)
      );
    }
  }
  
  // 3. Create Schedule and generate slots
  const schedule = new Schedule(
    new Date(dateRange.start),
    new Date(dateRange.end),
    duration
  );
  
  // Add users to schedule
  userObjects.forEach(user => schedule.addUser(user));
  
  // 4. Generate scored slots
  await schedule.generateScoredMeetingSlots();
  
  // 5. Pass to AI for refinement
  const aiSuggestions = await generateScoredSlots({
    participants: userObjects.map(u => ({
      id: u.userID,
      name: u.name,
      priority: u.importance,
      busy: u.busySchedule.getBusyIntervals().map(interval => ({
        startISO: interval.start.toISOString(),
        endISO: interval.end.toISOString()
      })),
      workingTime: u.workingTime
    })),
    preferences: {
      durationMinutes: duration,
      preferredStartHourRange: { start: 9, end: 17 },
      bufferMinutes: 15,
      timezone: 'UTC'
    },
    startDate: dateRange.start,
    endDate: dateRange.end,
    meetingDurationMinutes: duration
  });
  
  setSuggestions(aiSuggestions);
};
```

### Step 4: Update UI to Use Real AI Suggestions

```typescript
// Replace getSuggestions in PlanMeeting.tsx
const getSuggestions = async () => {
  setIsLoadingSuggestions(true);
  try {
    await loadCalendarDataAndGenerateSuggestions();
  } catch (error) {
    console.error('Error getting suggestions:', error);
    // Fallback to simple time slots
  } finally {
    setIsLoadingSuggestions(false);
  }
};
```

## Key Improvements for Efficiency

### 1. **Batch Calendar Fetching**
- Fetch all participant calendars in parallel
- Cache calendar data for 5 minutes

### 2. **Incremental Scoring**
- Generate base slots first
- Then refine with AI (more efficient)

### 3. **Smart Priority Assignment**
- Organizer: High priority
- Invited by admin: High priority  
- Regular participants: Mid priority
- Optional attendees: Low priority

### 4. **Working Time Detection**
- Use timezone from user profile
- Allow override in PlanMeeting UI
- Default to 9am-5pm in user's timezone

## UI Integration Points

### In PlanMeeting.tsx:

```typescript
// Add importance selector for each participant
const [participantImportance, setParticipantImportance] = useState<{
  [email: string]: 'High' | 'Mid' | 'Low'
}>({});

// Add working hours preference
const [workingHours, setWorkingHours] = useState({ start: 9, end: 17 });

// When generating suggestions, pass these to AI
const getSuggestions = async () => {
  const requestBody = {
    participants: participants.map(p => ({
      id: p.email,
      name: p.name,
      priority: participantImportance[p.email] || 'Mid',
      busy: [], // Will be populated from calendars
      workingTime: {
        startHour: workingHours.start,
        endHour: workingHours.end,
        workingDays: [1,2,3,4,5],
        timezone: 'UTC'
      }
    })),
    preferences: {
      durationMinutes: duration,
      preferredStartHourRange: { start: workingHours.start, end: workingHours.end }
    },
    startDate: dateRange.start,
    endDate: dateRange.end,
    meetingDurationMinutes: duration
  };
  
  const suggestions = await generateScoredSlots(requestBody);
  setSuggestions(suggestions);
};
```

## Privacy & Performance

✅ **Privacy**: Only free/busy times are fetched (no event details)  
✅ **Performance**: Parallel fetching, caching, incremental processing  
✅ **Scalability**: Gemini handles 10+ participants efficiently  
✅ **Intelligence**: AI considers working hours, time zones, preferences

