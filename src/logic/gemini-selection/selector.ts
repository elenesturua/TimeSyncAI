
import { Schedule, User } from '../schedule/scheduler';
import type { ScoredTimeInterval } from '../schedule/scheduler';

// Types for the Gemini API integration
type Priority = "High" | "Mid" | "Low";

type TimeslotInput = {
  id?: string;
  startISO: string;
  endISO: string;
};

export type ParticipantInput = {
  id: string;
  name?: string;
  priority: Priority;
  busy: { startISO: string; endISO: string }[];
  timezone?: string;
  workingTime?: {
    startHour?: number;
    endHour?: number;
    workingDays?: number[];
  };
};

type Preferences = {
  durationMinutes?: number;
  preferredStartHourRange?: { start: number; end: number } | null;
  bufferMinutes?: number;
  avoidWeekdays?: number[];
  timezone?: string;
};

type RequestBody = {
  timeslots?: TimeslotInput[];
  participants: ParticipantInput[];
  preferences?: Preferences;
  contextNotes?: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  meetingDurationMinutes: number;
};

type SuggestedSlot = {
  timeslot: {
    id?: string;
    startISO: string;
    endISO: string;
  };
  score: number;
  confidence: number;
  reason: string;
  suggestedAttendees?: { participantId: string; status: "suggest" | "optional" }[];
  practicalNotes?: string[];
};

type ResponseBody = {
  success: boolean;
  source: "gemini" | "algorithm" | "hybrid";
  suggestions: SuggestedSlot[];
  diagnostics?: any;
  rawModelResponse?: any;
  error?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type ChatRequest = {
  message: string;
  conversationHistory: ChatMessage[];
  currentSuggestions: SuggestedSlot[];
  allAvailableSlots: ScoredTimeInterval[];
  participants: ParticipantInput[];
  preferences?: Preferences;
  contextNotes?: string;
};

export type ChatResponse = {
  success: boolean;
  message: string;
  newSuggestions?: SuggestedSlot[];
  conversationHistory: ChatMessage[];
  availableActions: string[];
  metadata?: {
    totalSlotsRemaining: number;
    suggestionsChanged: boolean;
  };
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

/**
 * Generate scored meeting slots using the Schedule system
 * @param body - Request body with participants and preferences
 * @returns Promise<ScoredTimeInterval[]> - Array of scored time slots
 */
export async function generateScoredSlots(body: RequestBody): Promise<ScoredTimeInterval[]> {
  try {
    // Create schedule instance
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const schedule = new Schedule(startDate, endDate, body.meetingDurationMinutes);

    // Convert participants to User objects and add to schedule
    for (const participant of body.participants) {
      const user = new User(
        participant.id,
        participant.name || participant.id,
        participant.priority,
        participant.workingTime
      );

      // Add busy events to user's schedule
      for (const busyWindow of participant.busy) {
        user.busySchedule.addEvent(
          new Date(busyWindow.startISO),
          new Date(busyWindow.endISO)
        );
      }

      schedule.addUser(user);
    }

    // Generate scored meeting slots
    // Skip the automatic calendar fetching since we already have busy windows from Firestore
    await schedule.generateScoredMeetingSlotsWithoutFetching();
    
    return schedule.ScoredTimeIntervals;
  } catch (error) {
    console.error('Error generating scored slots:', error);
    return [];
  }
}

/**
 * Build Gemini prompt from request body and scored time slots
 * @param body - Request body
 * @param scoredSlots - Pre-scored time slots from the Schedule system
 * @returns Object with system instruction and user prompt
 */
export function buildGeminiPrompt(body: RequestBody, scoredSlots: ScoredTimeInterval[]) {
  const { participants, preferences, contextNotes } = body;

  // Convert scored slots to timeslot text for prompt
  const timeslotText = scoredSlots
    .slice(0, 10) // Limit to top 10 slots
    .map((slot, index) => {
      // Handle both Date objects and ISO strings
      const startTime = slot.start instanceof Date ? slot.start : new Date(slot.start);
      const endTime = slot.end instanceof Date ? slot.end : new Date(slot.end);
      
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      const availableParticipants = slot.participants.available.map((u: User) => u.userID).join(', ');
      const unavailableParticipants = slot.participants.unavailable.map((u: User) => u.userID).join(', ');
      
      return `- id:slot_${index + 1} start:${startTime.toISOString()} end:${endTime.toISOString()} duration:${duration}m score:${slot.score.toFixed(2)} available:[${availableParticipants}] unavailable:[${unavailableParticipants}]`;
    })
    .join("\n");

  // Convert participants to text
  const participantsText = participants
    .map((p) => {
      const busyWindows = p.busy.map(b => `${b.startISO}->${b.endISO}`).join(", ");
      const workingHours = p.workingTime 
        ? `${p.workingTime.startHour || 9}:00-${p.workingTime.endHour || 17}:00`
        : "9:00-17:00";
      
      return `- id:${p.id} name:${p.name ?? "n/a"} priority:${p.priority} busy:[${busyWindows}] workingHours:${workingHours}`;
    })
    .join("\n");

  const prefsText = JSON.stringify(preferences || {}, null, 2);

  const systemInstruction = `
You are an expert meeting scheduler assistant with advanced calendar analysis capabilities.
Your job: analyze the provided pre-scored candidate timeslots (generated from real calendar data), participant schedules, and preferences to select and explain the top 3 meeting times that maximize attendance and satisfaction.

The timeslots have already been filtered and scored based on:
- High-priority participant availability (must be 100% available)
- Mid-priority participant attendance rates
- Overall attendance optimization
- Working hours and time zone considerations

Your task is to refine this selection using contextual understanding and provide clear explanations in a structured text format.
`;

  const userPrompt = `
PRE-SCORED TIMESLOTS (top candidates from calendar analysis):
${timeslotText}

PARTICIPANTS:
${participantsText}

PREFERENCES:
${prefsText}

CONTEXT NOTES:
${contextNotes || "None"}

ANALYSIS RULES:
1) All timeslots are pre-filtered to ensure High-priority participants are available
2) Scores reflect Mid-priority attendance (40%) + Overall attendance (60%)
3) Consider participant working hours and time zones
4) Factor in buffer time preferences and avoid specified weekdays
5) Provide practical scheduling advice based on participant patterns

SELECTION CRITERIA:
1) Choose 3 timeslots that best balance high scores with practical considerations
2) Consider meeting context and participant roles
3) Provide clear reasoning for each selection
4) Include actionable scheduling recommendations

OUTPUT FORMAT:
For each of your top 3 recommended timeslots, provide the following information in this exact structure:

RECOMMENDATION 1:
Slot ID: [slot_id]
Start Time: [ISO timestamp]
End Time: [ISO timestamp]
Score: [0-100]
Confidence: [0-100]
Reason: [2-4 sentences explaining why this slot is optimal]
Suggested Attendees: [list of participantId:status pairs, where status is either "suggest" or "optional"]
Practical Notes: [actionable scheduling tips, one per line]

RECOMMENDATION 2:
[same format as above]

RECOMMENDATION 3:
[same format as above]

METHODOLOGY:
[Brief summary of your selection methodology in 1-3 sentences]

Analyze the pre-scored timeslots and provide your top 3 recommendations in the exact format above.
`;

  return { systemInstruction, userPrompt };
}

/**
 * Parse Gemini's text output into structured SuggestedSlot array
 * @param geminiText - Raw text output from Gemini
 * @returns Array of SuggestedSlot objects
 */
export function parseGeminiTextOutput(geminiText: string): SuggestedSlot[] {
  const suggestions: SuggestedSlot[] = [];
  
  try {
    // Split the text into recommendation sections
    const sections = geminiText.split(/RECOMMENDATION \d+:/);
    
    // Process each recommendation (skip the first empty section)
    for (let i = 1; i <= 3 && i < sections.length; i++) {
      const section = sections[i].trim();
      
      // Extract fields using regex patterns
      const slotIdMatch = section.match(/Slot ID:\s*(.+)/);
      const startTimeMatch = section.match(/Start Time:\s*(.+)/);
      const endTimeMatch = section.match(/End Time:\s*(.+)/);
      const scoreMatch = section.match(/Score:\s*(\d+)/);
      const confidenceMatch = section.match(/Confidence:\s*(\d+)/);
      const reasonMatch = section.match(/Reason:\s*([\s\S]+?)(?=Suggested Attendees:|$)/);
      const attendeesMatch = section.match(/Suggested Attendees:\s*([\s\S]+?)(?=Practical Notes:|$)/);
      const notesMatch = section.match(/Practical Notes:\s*([\s\S]+?)(?=RECOMMENDATION|METHODOLOGY|$)/);
      
      if (!slotIdMatch || !startTimeMatch || !endTimeMatch || !scoreMatch || !confidenceMatch) {
        console.warn(`Missing required fields in recommendation ${i}`);
        continue;
      }
      
      // Parse suggested attendees
      const suggestedAttendees: { participantId: string; status: "suggest" | "optional" }[] = [];
      if (attendeesMatch) {
        const attendeesText = attendeesMatch[1].trim();
        // Parse format like "user1:suggest, user2:optional" or handle various formats
        const attendeePairs = attendeesText.split(',').map(pair => pair.trim());
        for (const pair of attendeePairs) {
          // Handle both "user:status" and "user - status" formats
          const colonSplit = pair.split(':');
          const dashSplit = pair.split(' - ');
          
          let participantId = '';
          let status = '';
          
          if (colonSplit.length === 2) {
            [participantId, status] = colonSplit.map(s => s.trim());
          } else if (dashSplit.length === 2) {
            [participantId, status] = dashSplit.map(s => s.trim());
          } else {
            // Fallback: assume it's just a participant ID, default to "suggest"
            participantId = pair.trim();
            status = 'suggest';
          }
          
          // Normalize status values
          const normalizedStatus = status.toLowerCase();
          if (participantId && (normalizedStatus === 'suggest' || normalizedStatus === 'optional')) {
            suggestedAttendees.push({ 
              participantId, 
              status: normalizedStatus as "suggest" | "optional" 
            });
          }
        }
      }
      
      // Parse practical notes
      const practicalNotes: string[] = [];
      if (notesMatch) {
        const notesText = notesMatch[1].trim();
        // Split by lines and filter out empty lines
        const noteLines = notesText.split('\n').map(line => line.trim()).filter(line => line);
        practicalNotes.push(...noteLines);
      }
      
      // Validate and clean the timestamps
      const startISO = startTimeMatch[1].trim();
      const endISO = endTimeMatch[1].trim();
      
      // Basic ISO timestamp validation
      const isValidISO = (timestamp: string) => {
        try {
          const date = new Date(timestamp);
          return !isNaN(date.getTime()) && timestamp.includes('T');
        } catch {
          return false;
        }
      };
      
      if (!isValidISO(startISO) || !isValidISO(endISO)) {
        console.warn(`Invalid ISO timestamps in recommendation ${i}: start=${startISO}, end=${endISO}`);
        continue;
      }
      
      // Create the suggestion object
      const suggestion: SuggestedSlot = {
        timeslot: {
          id: slotIdMatch[1].trim(),
          startISO,
          endISO
        },
        score: Math.max(0, Math.min(100, parseInt(scoreMatch[1]) || 0)),
        confidence: Math.max(0, Math.min(100, parseInt(confidenceMatch[1]) || 0)),
        reason: reasonMatch ? reasonMatch[1].trim().replace(/\s+/g, ' ') : '',
        suggestedAttendees,
        practicalNotes
      };
      
      suggestions.push(suggestion);
    }
    
  } catch (error) {
    console.error('Error parsing Gemini text output:', error);
  }
  
  return suggestions;
}

/**
 * Build conversation context for the chatbot
 * @param chatRequest - Chat request with conversation history and current state
 * @returns Object with system instruction and user prompt for chat
 */
function buildChatPrompt(chatRequest: ChatRequest) {
  const { message, conversationHistory, currentSuggestions, allAvailableSlots, participants, preferences, contextNotes } = chatRequest;

  // Build current suggestions summary
  const currentSuggestionsText = currentSuggestions.map((suggestion, index) => {
    return `${index + 1}. ${suggestion.timeslot.id} (${suggestion.timeslot.startISO} - ${suggestion.timeslot.endISO}) - Score: ${suggestion.score}, Confidence: ${suggestion.confidence}`;
  }).join('\n');

  // Build available alternatives summary (excluding current suggestions)
  const currentSlotIds = new Set(currentSuggestions.map(s => s.timeslot.id));
  const alternativeSlots = allAvailableSlots
    .filter((_, index) => !currentSlotIds.has(`slot_${index + 1}`))
    .slice(0, 10) // Show next 10 alternatives
    .map((slot, index) => {
      const slotId = `slot_${currentSuggestions.length + index + 1}`;
      
      // Handle both Date objects and ISO strings
      const startTime = slot.start instanceof Date ? slot.start : new Date(slot.start);
      const endTime = slot.end instanceof Date ? slot.end : new Date(slot.end);
      
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      return `${slotId}: ${startTime.toISOString()} - ${endTime.toISOString()} (${duration}min, Score: ${slot.score.toFixed(2)})`;
    }).join('\n');

  // Build conversation history
  const conversationText = conversationHistory.map(msg => 
    `${msg.role.toUpperCase()}: ${msg.content}`
  ).join('\n');

  // Build participants summary
  const participantsText = participants.map(p => 
    `${p.id} (${p.priority} priority)`
  ).join(', ');

  const systemInstruction = `
You are an intelligent meeting scheduling assistant with access to calendar data and scheduling analytics. You're having a conversation with a user about their meeting scheduling options.

CONTEXT:
- You have access to pre-scored meeting time slots based on participant availability
- You can suggest alternative time slots, explain scheduling decisions, and help refine choices
- You can provide the next best 3 options when requested
- You should be conversational, helpful, and provide actionable insights

CAPABILITIES:
1. Explain why certain time slots are recommended
2. Suggest alternative time slots from the available options
3. Help users understand scheduling conflicts and trade-offs
4. Provide the next set of 3 best options when requested
5. Answer questions about participant availability and preferences
6. Help users make informed scheduling decisions

RESPONSE FORMAT:
Respond naturally in conversation format. If the user requests new time slot suggestions or alternatives, provide them in this format:

NEW SUGGESTIONS:
[List 1-3 time slots with brief explanations]

Otherwise, just respond conversationally to help the user understand their options.
`;

  const userPrompt = `
CURRENT MEETING CONTEXT:
Participants: ${participantsText}
Meeting Preferences: ${JSON.stringify(preferences || {}, null, 2)}
Context Notes: ${contextNotes || "None"}

CURRENT TOP 3 SUGGESTIONS:
${currentSuggestionsText}

AVAILABLE ALTERNATIVE TIME SLOTS:
${alternativeSlots || "No additional alternatives available"}

CONVERSATION HISTORY:
${conversationText}

USER'S LATEST MESSAGE:
${message}

Please respond to the user's message. If they're asking for new suggestions, alternatives, or the "next 3 options", provide them using the NEW SUGGESTIONS format. Otherwise, respond conversationally to help them with their scheduling decision.
`;

  return { systemInstruction, userPrompt };
}

/**
 * Parse chat response to extract new suggestions if provided
 * @param responseText - Gemini's response text
 * @param allAvailableSlots - All available time slots
 * @param currentSuggestionCount - Number of current suggestions shown
 * @returns Object with parsed suggestions and clean message
 */
function parseChatResponse(responseText: string, allAvailableSlots: ScoredTimeInterval[], currentSuggestionCount: number) {
  const newSuggestions: SuggestedSlot[] = [];
  let cleanMessage = responseText;

  // Check if response contains new suggestions
  const suggestionsMatch = responseText.match(/NEW SUGGESTIONS:\s*([\s\S]+?)(?:\n\n|$)/);
  
  if (suggestionsMatch) {
    const suggestionsText = suggestionsMatch[1];
    cleanMessage = responseText.replace(/NEW SUGGESTIONS:\s*[\s\S]+?(?:\n\n|$)/, '').trim();
    
    // Parse suggested slots from the text
    const suggestionLines = suggestionsText.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < Math.min(3, suggestionLines.length); i++) {
      const line = suggestionLines[i];
      
      // Try to extract slot information from various formats
      const slotMatch = line.match(/slot_(\d+)|(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      
      if (slotMatch) {
        let slotIndex = -1;
        
        if (slotMatch[1]) {
          // Format: slot_X
          slotIndex = parseInt(slotMatch[1]) - 1;
        } else if (slotMatch[2]) {
          // Format: ISO timestamp - find matching slot
          const timestamp = slotMatch[2];
          slotIndex = allAvailableSlots.findIndex(slot => {
            const startTime = slot.start instanceof Date ? slot.start : new Date(slot.start);
            return startTime.toISOString().includes(timestamp);
          });
        }
        
        if (slotIndex >= 0 && slotIndex < allAvailableSlots.length) {
          const scoredSlot = allAvailableSlots[slotIndex];
          const suggestion = convertToSuggestedSlot(scoredSlot, currentSuggestionCount + i);
          
          // Override reason with Gemini's explanation if provided
          const reasonMatch = line.match(/[-:]\s*(.+)$/);
          if (reasonMatch) {
            suggestion.reason = reasonMatch[1].trim();
          }
          
          newSuggestions.push(suggestion);
        }
      }
    }
  }

  return { newSuggestions, cleanMessage };
}

/**
 * Interactive chatbot for scheduling assistance
 * @param chatRequest - Chat request with user message and context
 * @returns Promise<ChatResponse> - Chat response with assistant message and optional new suggestions
 */
export async function chatWithSchedulingAssistant(chatRequest: ChatRequest): Promise<ChatResponse> {
  try {
    // Use import.meta.env instead of process.env for Vite
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return {
        success: false,
        message: "I'm sorry, but the AI assistant is not available right now. However, I can help you explore the available time slots manually.",
        conversationHistory: [
          ...chatRequest.conversationHistory,
          {
            role: "user",
            content: chatRequest.message,
            timestamp: new Date().toISOString()
          },
          {
            role: "assistant", 
            content: "AI assistant unavailable - manual exploration available",
            timestamp: new Date().toISOString()
          }
        ],
        availableActions: ["show_next_3", "show_alternatives", "explain_scores"]
      };
    }

    // Build the chat prompt
    const promptBundle = buildChatPrompt(chatRequest);

    const payload = {
      systemInstruction: { parts: [{ text: promptBundle.systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: promptBundle.userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.3,
        topP: 0.8,
      },
    };

    const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(`Gemini API failed: ${resp.status}`);
    }

    const geminiResult = await resp.json();
    const responseText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText.trim()) {
      throw new Error("Empty response from Gemini");
    }

    // Parse the response for new suggestions
    const { newSuggestions, cleanMessage } = parseChatResponse(
      responseText, 
      chatRequest.allAvailableSlots, 
      chatRequest.currentSuggestions.length
    );

    // Update conversation history
    const updatedHistory: ChatMessage[] = [
      ...chatRequest.conversationHistory,
      {
        role: "user",
        content: chatRequest.message,
        timestamp: new Date().toISOString()
      },
      {
        role: "assistant",
        content: cleanMessage,
        timestamp: new Date().toISOString()
      }
    ];

    // Determine available actions
    const availableActions = [
      "show_next_3",
      "explain_current",
      "show_alternatives",
      "ask_question"
    ];

    const response: ChatResponse = {
      success: true,
      message: cleanMessage,
      conversationHistory: updatedHistory,
      availableActions,
      metadata: {
        totalSlotsRemaining: Math.max(0, chatRequest.allAvailableSlots.length - chatRequest.currentSuggestions.length),
        suggestionsChanged: newSuggestions.length > 0
      }
    };

    if (newSuggestions.length > 0) {
      response.newSuggestions = newSuggestions;
    }

    return response;

  } catch (error) {
    console.error('Error in chat assistant:', error);
    
    return {
      success: false,
      message: "I encountered an error while processing your request. Let me help you manually explore the available options.",
      conversationHistory: [
        ...chatRequest.conversationHistory,
        {
          role: "user",
          content: chatRequest.message,
          timestamp: new Date().toISOString()
        },
        {
          role: "assistant",
          content: "Error occurred - manual assistance available",
          timestamp: new Date().toISOString()
        }
      ],
      availableActions: ["show_next_3", "show_alternatives", "manual_help"]
    };
  }
}

/**
 * Get the next best N time slot suggestions
 * @param allAvailableSlots - All available scored time slots
 * @param currentSuggestions - Currently shown suggestions
 * @param count - Number of suggestions to return (default 3)
 * @returns Array of next best SuggestedSlot objects
 */
export function getNextBestSlots(
  allAvailableSlots: ScoredTimeInterval[], 
  currentSuggestions: SuggestedSlot[], 
  count: number = 3
): SuggestedSlot[] {
  // Get IDs of current suggestions to exclude them
  const currentSlotIds = new Set(currentSuggestions.map(s => s.timeslot.id));
  
  // Find the next best slots that aren't already suggested
  const nextSlots: SuggestedSlot[] = [];
  let slotIndex = 0;
  
  for (const scoredSlot of allAvailableSlots) {
    const slotId = `slot_${slotIndex + 1}`;
    
    if (!currentSlotIds.has(slotId) && nextSlots.length < count) {
      const suggestion = convertToSuggestedSlot(scoredSlot, slotIndex);
      nextSlots.push(suggestion);
    }
    
    slotIndex++;
    
    if (nextSlots.length >= count) {
      break;
    }
  }
  
  return nextSlots;
}

/**
 * Convert ScoredTimeInterval to SuggestedSlot format
 * @param scoredSlot - Scored time interval from Schedule system
 * @param index - Index for generating slot ID
 * @returns SuggestedSlot object
 */
export function convertToSuggestedSlot(scoredSlot: ScoredTimeInterval, index: number): SuggestedSlot {
  // Build suggested attendees list
  const suggestedAttendees = [
    ...scoredSlot.participants.available.map((user: User) => ({
      participantId: user.userID,
      status: user.importance === "High" ? "suggest" as const : "optional" as const
    })),
    ...scoredSlot.participants.unavailable.map((user: User) => ({
      participantId: user.userID,
      status: "optional" as const
    }))
  ];

  // Build reason string
  const availableCount = scoredSlot.participants.available.length;
  const totalCount = availableCount + scoredSlot.participants.unavailable.length;
  const attendanceRate = Math.round((availableCount / totalCount) * 100);
  
  const reason = `Strong attendance with ${availableCount}/${totalCount} participants available (${attendanceRate}%). ` +
    `Mid-priority attendance: ${Math.round(scoredSlot.midAttendance * 100)}%. ` +
    `Overall score: ${scoredSlot.score.toFixed(1)} based on priority-weighted availability.`;

  // Handle both Date objects and ISO strings
  const startTime = scoredSlot.start instanceof Date ? scoredSlot.start : new Date(scoredSlot.start);
  const endTime = scoredSlot.end instanceof Date ? scoredSlot.end : new Date(scoredSlot.end);

  return {
    timeslot: {
      id: `slot_${index + 1}`,
      startISO: startTime.toISOString(),
      endISO: endTime.toISOString()
    },
    score: Math.round(scoredSlot.score * 100), // Convert to 0-100 scale
    confidence: Math.max(60, Math.min(95, Math.round(scoredSlot.score * 100 + 10))),
    reason,
    suggestedAttendees,
    practicalNotes: [
      "All high-priority participants are available",
      `${Math.round(scoredSlot.overallAttendance * 100)}% overall attendance rate`,
      "Consider sending calendar invites 24-48 hours in advance"
    ]
  };
}

// ---------------------- Main Handler ----------------------
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    // Basic validation
    if (!body.participants || !Array.isArray(body.participants) || body.participants.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No participants provided" 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!body.startDate || !body.endDate || !body.meetingDurationMinutes) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: startDate, endDate, meetingDurationMinutes" 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate scored slots using the Schedule system
    console.log('Generating scored slots using Schedule system...');
    const scoredSlots = await generateScoredSlots(body);
    
    if (scoredSlots.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No available meeting slots found for the given constraints"
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Generated ${scoredSlots.length} scored slots`);

    // Try Gemini first if API key is available
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        console.log('Attempting Gemini API call...');
        const promptBundle = buildGeminiPrompt(body, scoredSlots);

        const payload = {
          systemInstruction: { parts: [{ text: promptBundle.systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: promptBundle.userPrompt }] }],
          generationConfig: {
            maxOutputTokens: 3000,
            temperature: 0.1,
            topP: 0.9,
          },
        };

        const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          const geminiResult = await resp.json();
          
          // Extract text response
          const candidateText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          if (!candidateText.trim()) {
            throw new Error("Gemini returned empty response");
          }

          console.log('Gemini API call successful, parsing text output...');
          
          // Parse the text output into structured suggestions
          const parsedSuggestions = parseGeminiTextOutput(candidateText);
          
          if (parsedSuggestions.length === 0) {
            throw new Error("Failed to parse any valid suggestions from Gemini output");
          }

          console.log(`Successfully parsed ${parsedSuggestions.length} suggestions from Gemini`);
          
          const response: ResponseBody = {
            success: true,
            source: "gemini",
            suggestions: parsedSuggestions,
            diagnostics: { 
              totalSlotsAnalyzed: scoredSlots.length,
              parsedSuggestions: parsedSuggestions.length,
              rawGeminiText: candidateText
            },
            rawModelResponse: geminiResult,
          };

          return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          const errorText = await resp.text();
          console.error("Gemini API failed:", resp.status, resp.statusText, errorText);
        }
      } catch (error) {
        console.warn("Gemini attempt failed, falling back to algorithm:", error);
      }
    } else {
      console.log("GEMINI_API_KEY not set; using algorithmic fallback");
    }

    // ------------- Algorithmic fallback -------------
    console.log('Using algorithmic fallback...');
    
    // Convert top scored slots to suggested slots format
    const top3Slots = scoredSlots
      .slice(0, 3)
      .map((slot, index) => convertToSuggestedSlot(slot, index));

    const response: ResponseBody = {
      success: true,
      source: "algorithm",
      suggestions: top3Slots,
      diagnostics: {
        totalSlotsGenerated: scoredSlots.length,
        scoringMethod: "Schedule system with priority-weighted attendance",
        topScores: scoredSlots.slice(0, 5).map(s => {
          const startTime = s.start instanceof Date ? s.start : new Date(s.start);
          return {
            start: startTime.toISOString(),
            score: s.score,
            attendance: s.overallAttendance
          };
        })
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in schedule recommender:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ---------------------- Chat Handler ----------------------
export async function CHAT(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;

    // Basic validation
    if (!body.message || !body.message.trim()) {
      return new Response(JSON.stringify({
        success: false,
        message: "Please provide a message to continue the conversation.",
        conversationHistory: body.conversationHistory || [],
        availableActions: ["ask_question"]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!body.allAvailableSlots || body.allAvailableSlots.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: "No time slots available to discuss. Please generate initial suggestions first.",
        conversationHistory: body.conversationHistory || [],
        availableActions: ["generate_initial_suggestions"]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle special commands
    const message = body.message.toLowerCase().trim();
    
    if (message.includes('next 3') || message.includes('show more') || message.includes('more options')) {
      // User wants the next best 3 options
      const nextSlots = getNextBestSlots(body.allAvailableSlots, body.currentSuggestions, 3);
      
      if (nextSlots.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: "I've already shown you all the available time slots that meet your criteria. Would you like me to explain any of the current options in more detail?",
          conversationHistory: [
            ...body.conversationHistory,
            {
              role: "user",
              content: body.message,
              timestamp: new Date().toISOString()
            },
            {
              role: "assistant",
              content: "No more time slots available - all options shown",
              timestamp: new Date().toISOString()
            }
          ],
          availableActions: ["explain_current", "ask_question"]
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const slotsDescription = nextSlots.map((slot, index) => 
        `${index + 1}. ${new Date(slot.timeslot.startISO).toLocaleString()} - ${new Date(slot.timeslot.endISO).toLocaleString()} (Score: ${slot.score})`
      ).join('\n');

      return new Response(JSON.stringify({
        success: true,
        message: `Here are the next 3 best available time slots:\n\n${slotsDescription}\n\nWould you like me to explain why these times work well, or do you have questions about any specific slot?`,
        newSuggestions: nextSlots,
        conversationHistory: [
          ...body.conversationHistory,
          {
            role: "user",
            content: body.message,
            timestamp: new Date().toISOString()
          },
          {
            role: "assistant",
            content: `Provided next 3 best time slots`,
            timestamp: new Date().toISOString()
          }
        ],
        availableActions: ["explain_current", "show_next_3", "ask_question"],
        metadata: {
          totalSlotsRemaining: Math.max(0, body.allAvailableSlots.length - body.currentSuggestions.length - nextSlots.length),
          suggestionsChanged: true
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For all other messages, use the AI chatbot
    const chatResponse = await chatWithSchedulingAssistant(body);
    
    return new Response(JSON.stringify(chatResponse), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error in chat handler:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "I encountered an error while processing your message. Please try again or ask a different question.",
      conversationHistory: [],
      availableActions: ["try_again", "ask_question"]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
