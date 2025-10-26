import { parseISO, addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export interface TimeSlot {
  start: Date;
  end: Date;
  timezone: string;
}

export function formatTimeSlot(slot: TimeSlot, userTimezone: string = 'America/Chicago'): string {
  // Always use Chicago timezone for displaying meeting times
  const startFormatted = formatInTimeZone(slot.start, userTimezone, 'h:mm a');
  const endFormatted = formatInTimeZone(slot.end, userTimezone, 'h:mm a');
  const dateFormatted = formatInTimeZone(slot.start, userTimezone, 'MMM d, yyyy');
  
  return `${dateFormatted} • ${startFormatted} - ${endFormatted}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function parseISOTimeSlot(startISO: string, endISO: string): TimeSlot {
  // Parse ISO strings as UTC, then format in Chicago timezone
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  return {
    start,
    end,
    timezone: 'America/Chicago' // Always use Chicago timezone for display
  };
}

export function createTimeSlot(start: Date, durationMinutes: number): TimeSlot {
  return {
    start,
    end: addMinutes(start, durationMinutes),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

export function getPreferredHoursPresets() {
  return [
    { label: '8–6', start: '08:00', end: '18:00' },
    { label: '9–7', start: '09:00', end: '19:00' },
    { label: '10–8', start: '10:00', end: '20:00' },
  ];
}

export function formatBadge(badge: string): string {
  const badgeMap: Record<string, string> = {
    'All free': 'All free',
    'Earliest': 'Earliest',
    'Within hours': 'Within hours',
    'Least disruption': 'Least disruption'
  };
  return badgeMap[badge] || badge;
}
