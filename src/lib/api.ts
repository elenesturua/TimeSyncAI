import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export async function withBearer(getToken: () => Promise<string>) {
  const token = await getToken();
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

// API Types
export interface CreateLinkRequest {
  duration: number;
  dateRange: number;
  preferredHours: {
    start: string;
    end: string;
  };
}

export interface CreateLinkResponse {
  linkId: string;
  inviteUrl: string;
}

export interface Participant {
  email: string;
  displayName: string;
  timezone: string;
  connected: boolean;
}

export interface Suggestion {
  startISO: string;
  endISO: string;
  attendeesFree: string[];
  attendeesMissing: string[];
  badges: string[];
  reason: string;
}

export interface BookingRequest {
  title: string;
  startISO: string;
  endISO: string;
  attendees: string[];
  timezone: string;
}

export interface BookingResponse {
  eventId: string;
  outlookLink: string;
  teamsLink: string;
}

export interface Group {
  id: string;
  name: string;
  participants: Participant[];
  createdAt: string;
}

// API Functions
export const linkApi = {
  create: async (data: CreateLinkRequest): Promise<CreateLinkResponse> => {
    const response = await api.post('/links', data);
    return response.data;
  },

  getParticipants: async (linkId: string): Promise<Participant[]> => {
    const response = await api.get(`/links/${linkId}/participants`);
    return response.data;
  },

  getSuggestions: async (linkId: string, duration: number, allowAbsences: number = 0): Promise<{ slots: Suggestion[] }> => {
    const response = await api.get(`/links/${linkId}/suggestions`, {
      params: { duration, allowAbsences }
    });
    return response.data;
  },

  book: async (linkId: string, data: BookingRequest): Promise<BookingResponse> => {
    const response = await api.post(`/links/${linkId}/book`, data);
    return response.data;
  },

  saveAsGroup: async (linkId: string): Promise<{ groupId: string }> => {
    const response = await api.post(`/links/${linkId}/save-as-group`);
    return response.data;
  }
};

export const groupsApi = {
  getAll: async (): Promise<Group[]> => {
    const response = await api.get('/groups');
    return response.data;
  }
};
