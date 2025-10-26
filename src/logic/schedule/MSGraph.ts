import { PublicClientApplication } from '@azure/msal-browser';

// Utility functions to access Microsoft Graph API

// Type definitions for Microsoft Graph API responses
interface GraphEvent {
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
  location?: {
    displayName: string;
    locationType: string;
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    type: string;
    status: {
      response: string;
    };
  }>;
  organizer: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  isAllDay: boolean;
  isCancelled: boolean;
  showAs: string;
  body?: {
    contentType: string;
    content: string;
  };
}

interface GraphEventsResponse {
  value: GraphEvent[];
  '@odata.context': string;
}

/**
 * Get authentication token for Microsoft Graph API
 * @param msalInstance - MSAL instance for token retrieval
 * @returns Promise<string> - The access token
 */
async function GetToken(msalInstance?: PublicClientApplication): Promise<string> {
  if (!msalInstance) {
    throw new Error('MSAL instance required for token retrieval');
  }
  
  try {
    const account = msalInstance.getActiveAccount();
    if (!account) {
      throw new Error('No active account');
    }

    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: ['Calendars.Read', 'Calendars.ReadWrite'],
      account
    });

    return tokenResponse.accessToken;
  } catch (error) {
    console.error('Error acquiring token:', error);
    throw new Error('Token retrieval failed');
  }
}

/**
 * Retrieve calendar events for a specific user within a date range
 * @param userID - The user ID or email address
 * @param startDay - Start date in ISO format (YYYY-MM-DD)
 * @param endDay - End date in ISO format (YYYY-MM-DD)
 * @param msalInstance - MSAL instance for authentication
 * @returns Promise<GraphEvent[]> - Array of calendar events
 */
async function GetCalendarEvents(
  userID: string, 
  startDay: string, 
  endDay: string,
  msalInstance?: PublicClientApplication
): Promise<GraphEvent[]> {
  try {
    // Get authentication token
    const token = await GetToken(msalInstance);
    
    // Construct the API endpoint
    const endpoint = userID === 'me' 
      ? 'https://graph.microsoft.com/v1.0/me/calendar/events'
      : `https://graph.microsoft.com/v1.0/users/${userID}/calendar/events`;
    
    // Build query parameters for date filtering
    const queryParams = new URLSearchParams({
      $filter: `start/dateTime ge '${startDay}T00:00:00.000Z' and end/dateTime le '${endDay}T23:59:59.999Z'`,
      $orderby: 'start/dateTime asc',
      $select: 'id,subject,start,end,location,attendees,organizer,isAllDay,isCancelled,showAs,body'
    });
    
    const url = `${endpoint}?${queryParams.toString()}`;
    
    // Make the API request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'outlook.timezone="UTC"'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data: GraphEventsResponse = await response.json();
    return data.value;
    
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw new Error(`Failed to retrieve calendar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export { GetToken, GetCalendarEvents, type GraphEvent, type GraphEventsResponse };