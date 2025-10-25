# Email API Usage Examples

Here are examples of how to use the email API in your React components.

## Example 1: Send a Single Meeting Invite

```typescript
import { emailApi, SendInviteRequest } from './lib/api';
import { useState } from 'react';

function SendMeetingInvite() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleSendInvite = async () => {
    setLoading(true);
    setResult('');

    try {
      const request: SendInviteRequest = {
        to: 'participant@example.com',
        organizerName: 'Your Name',
        organizerEmail: 'you@example.com',
        plan: 'Let\'s discuss the Q4 roadmap',
        meeting: {
          title: 'Q4 Planning Meeting',
          description: 'Quarterly planning session',
          location: 'Conference Room A or Teams',
          startISO: '2025-10-26T15:00:00Z',
          endISO: '2025-10-26T16:00:00Z',
          timezone: 'America/New_York'
        }
      };

      const response = await emailApi.sendInvite(request);

      if (response.success) {
        setResult(`✅ Email sent successfully! Message ID: ${response.messageId}`);
      } else {
        setResult(`❌ Failed to send email: ${response.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSendInvite} disabled={loading}>
        {loading ? 'Sending...' : 'Send Meeting Invite'}
      </button>
      {result && <p>{result}</p>}
    </div>
  );
}
```

## Example 2: Send Multiple Time Options

```typescript
import { emailApi } from './lib/api';

async function sendMeetingOptions() {
  const response = await emailApi.sendInvite({
    to: 'participant@example.com',
    cc: ['manager@example.com', 'team@example.com'],
    organizerName: 'John Doe',
    organizerEmail: 'john@example.com',
    plan: 'Please choose the time that works best for you',
    options: [
      {
        title: 'Team Sync - Option 1',
        description: 'Morning slot',
        location: 'Teams Meeting',
        startISO: '2025-10-26T14:00:00Z',
        endISO: '2025-10-26T15:00:00Z',
        timezone: 'America/New_York'
      },
      {
        title: 'Team Sync - Option 2',
        description: 'Afternoon slot',
        location: 'Teams Meeting',
        startISO: '2025-10-26T18:00:00Z',
        endISO: '2025-10-26T19:00:00Z',
        timezone: 'America/New_York'
      },
      {
        title: 'Team Sync - Option 3',
        description: 'Next day morning',
        location: 'Teams Meeting',
        startISO: '2025-10-27T14:00:00Z',
        endISO: '2025-10-27T15:00:00Z',
        timezone: 'America/New_York'
      }
    ]
  });

  return response;
}
```

## Example 3: Integration with TimeSyncAI Booking Flow

```typescript
import { emailApi } from './lib/api';
import { useAuth } from './context/AuthContext';

function BookingConfirmation({ suggestion, participants }) {
  const { user } = useAuth();

  const handleConfirmBooking = async () => {
    // Send invite to all participants
    for (const participant of participants) {
      try {
        await emailApi.sendInvite({
          to: participant.email,
          organizerName: user.displayName,
          organizerEmail: user.email,
          meeting: {
            title: 'TimeSyncAI Meeting',
            description: 'Scheduled via TimeSyncAI',
            location: 'Microsoft Teams',
            startISO: suggestion.startISO,
            endISO: suggestion.endISO,
            timezone: participant.timezone || 'UTC'
          }
        });
      } catch (error) {
        console.error(`Failed to send invite to ${participant.email}`, error);
      }
    }
  };

  return (
    <button onClick={handleConfirmBooking}>
      Confirm & Send Invites
    </button>
  );
}
```

## Example 4: Using with React Query

```typescript
import { useMutation } from '@tanstack/react-query';
import { emailApi, SendInviteRequest } from './lib/api';

function useSendInvite() {
  return useMutation({
    mutationFn: (request: SendInviteRequest) => emailApi.sendInvite(request),
    onSuccess: (data) => {
      if (data.success) {
        console.log('Email sent!', data.messageId);
      } else {
        console.error('Failed:', data.error);
      }
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    }
  });
}

// Usage in component
function MyComponent() {
  const sendInvite = useSendInvite();

  const handleClick = () => {
    sendInvite.mutate({
      to: 'user@example.com',
      organizerName: 'Me',
      organizerEmail: 'me@example.com',
      meeting: {
        title: 'Quick Sync',
        startISO: '2025-10-26T15:00:00Z',
        endISO: '2025-10-26T15:30:00Z',
        timezone: 'UTC'
      }
    });
  };

  return (
    <button 
      onClick={handleClick} 
      disabled={sendInvite.isPending}
    >
      {sendInvite.isPending ? 'Sending...' : 'Send Invite'}
    </button>
  );
}
```

## Example 5: Error Handling

```typescript
import { emailApi } from './lib/api';

async function sendWithErrorHandling() {
  try {
    const response = await emailApi.sendInvite({
      to: 'participant@example.com',
      organizerName: 'Your Name',
      organizerEmail: 'you@example.com',
      meeting: {
        title: 'Meeting',
        startISO: '2025-10-26T15:00:00Z',
        endISO: '2025-10-26T16:00:00Z',
        timezone: 'America/New_York'
      }
    });

    if (response.success) {
      // Email sent successfully
      return { success: true, messageId: response.messageId };
    } else {
      // Backend returned an error
      console.error('Backend error:', response.error);
      return { success: false, error: response.error };
    }
  } catch (error) {
    // Network error or other exception
    console.error('Network error:', error);
    return { success: false, error: 'Network error' };
  }
}
```

## Common Patterns

### Getting User's Timezone
```typescript
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// Example: "America/New_York"
```

### Converting Date to ISO String
```typescript
const startDate = new Date('2025-10-26T15:00:00');
const startISO = startDate.toISOString();
// Example: "2025-10-26T15:00:00.000Z"
```

### With Luxon (already in dependencies)
```typescript
import { DateTime } from 'luxon';

const dt = DateTime.fromObject({
  year: 2025,
  month: 10,
  day: 26,
  hour: 15,
  minute: 0
}, { zone: 'America/New_York' });

const startISO = dt.toISO(); // "2025-10-26T15:00:00.000-04:00"
```

## TypeScript Types

All types are exported from `src/lib/api.ts`:

```typescript
import { 
  SendInviteRequest, 
  SendInviteResponse 
} from './lib/api';

// SendInviteRequest has:
// - to: string (required)
// - cc?: string[]
// - plan?: string
// - organizerName?: string
// - organizerEmail?: string
// - meeting?: SingleMeeting
// - options?: SingleMeeting[]

// SingleMeeting has:
// - title: string
// - description?: string
// - location?: string
// - startISO: string (ISO 8601 datetime)
// - endISO: string (ISO 8601 datetime)
// - timezone?: string (IANA timezone, e.g., "America/New_York")
```

