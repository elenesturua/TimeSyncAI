
import { NextResponse } from "next/server";

type Priority = "high" | "mid" | "low";

type Timeslot = {
  id?: string; // optional identifier
  startISO: Date; // ISO string
  endISO: Date;   // ISO string
};

type BusyWindow = { startISO: string; endISO: string };

type Participant = {
  id: string;
  name?: string;
  priority: Priority;
  busy: BusyWindow[]; // times they are busy (closed intervals)
  timezone?: string; // optional, for display only
};

type Preferences = {
  durationMinutes?: number; // desired meeting duration (fallback if timeslots don't include end)
  // minHighPriorityPresence?: number; // fraction [0..1] required (e.g., 0.5 meaning at least half of high-priority must be present)
  preferredStartHourRange?: { start: number; end: number } | null; // local hours (e.g., {start:9,end:17})
  bufferMinutes?: number; // buffer before/after slot to respect (default 0)
  avoidWeekdays?: number[]; // 0=Sunday .. 6=Saturday
  timezone?: string; // organizer timezone for prompt/display
};

type RequestBody = {
  timeslots: Timeslot[]; // up to 10
  participants: Participant[]; // whole meeting list; priorities important
  preferences?: Preferences;
  contextNotes?: string; // optional free-text that Gemini can use (e.g., goals of the meeting)
};

type SuggestedSlot = {
  timeslot: Timeslot;
  score: number; // 0..100
  confidence: number; // 0..100
  reason: string;
  suggestedAttendees?: { participantId: string; status: "suggest" | "optional" }[];
};

type ResponseBody = {
  success: boolean;
  source: "gemini" | "algorithm" | "hybrid";
  suggestions: SuggestedSlot[];
  diagnostics?: any;
  rawModelResponse?: any;
  error?: string;
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"; // keep as-is; uses ?key= below

// ---------------------- Utilities ----------------------
function isoToDate(iso: string) {
  return new Date(iso);
}

function overlaps(aStartISO: string, aEndISO: string, bStartISO: string, bEndISO: string) {
  const aS = isoToDate(aStartISO).getTime();
  const aE = isoToDate(aEndISO).getTime();
  const bS = isoToDate(bStartISO).getTime();
  const bE = isoToDate(bEndISO).getTime();
  return Math.max(aS, bS) < Math.min(aE, bE);
}

function durationMinutes(slot: Timeslot, fallback = 60) {
  try {
    const s = isoToDate(slot.startISO).getTime();
    const e = isoToDate(slot.endISO).getTime();
    return Math.max(1, Math.round((e - s) / 60000));
  } catch {
    return fallback;
  }
}

// returns fraction [0..1] of participants of that priority who are available in this slot
function computeAvailabilityFractionForPriority(
  slot: Timeslot,
  participants: Participant[],
  priority: Priority
) {
  const relevant = participants.filter((p) => p.priority === priority);
  if (relevant.length === 0) return 1; // if none of that priority exists, treat as fully available
  let availableCount = 0;
  for (const p of relevant) {
    // available if none of their busy windows overlap slot
    const isBusy = p.busy.some((bw) => overlaps(slot.startISO, slot.endISO, bw.startISO, bw.endISO));
    if (!isBusy) availableCount++;
  }
  return availableCount / relevant.length;
}

// simple algorithmic scoring
function scoreTimeslotAlgorithmic(
  slot: Timeslot,
  participants: Participant[],
  prefs: Preferences | undefined
) {
  // weights
  const wHigh = 4.0;
  const wMid = 1.5;
  const wLow = 0.8;

  const highAvail = computeAvailabilityFractionForPriority(slot, participants, "high");
  const midAvail = computeAvailabilityFractionForPriority(slot, participants, "mid");
  const lowAvail = computeAvailabilityFractionForPriority(slot, participants, "low");

  // base score
  let score = wHigh * highAvail + wMid * midAvail + wLow * lowAvail;

  // preference bonuses
  if (prefs?.preferredStartHourRange) {
    const startHourUTC = isoToDate(slot.startISO).getUTCHours(); // approximate (can't rely on local tz); it's okay as relative heuristic
    const { start, end } = prefs.preferredStartHourRange;
    // if within range (rough), add bonus
    if (start <= startHourUTC && startHourUTC < end) score += 0.8;
  }

  // duration fit: prefer timeslots that are at least desired duration (no penalty if unknown)
  if (prefs?.durationMinutes) {
    const dm = durationMinutes(slot, prefs.durationMinutes);
    if (dm >= prefs.durationMinutes) score += 0.5;
    else score -= 0.3; // slightly penalize too-short
  }

  // avoid weekdays
  if (Array.isArray(prefs?.avoidWeekdays) && prefs!.avoidWeekdays.length > 0) {
    const dow = isoToDate(slot.startISO).getUTCDay();
    if (prefs!.avoidWeekdays.includes(dow)) score -= 1.0;
  }

  // buffer: check if slot is adjacent to busy windows for high priority participants – penalize if so
  const buffer = prefs?.bufferMinutes ?? 0;
  if (buffer > 0) {
    for (const p of participants.filter((x) => x.priority === "high")) {
      for (const bw of p.busy) {
        // if busy window ends within bufferMinutes before slot start OR starts within bufferMinutes after slot end => penalty
        const gapBefore = isoToDate(slot.startISO).getTime() - isoToDate(bw.endISO).getTime();
        const gapAfter = isoToDate(bw.startISO).getTime() - isoToDate(slot.endISO).getTime();
        const gapBeforeMin = gapBefore / 60000;
        const gapAfterMin = gapAfter / 60000;
        if ((gapBeforeMin >= 0 && gapBeforeMin < buffer) || (gapAfterMin >= 0 && gapAfterMin < buffer)) {
          score -= 0.6;
        }
      }
    }
  }

  // Map to 0..100 roughly
  const raw = Math.max(0, score);
  const normalized = Math.min(100, Math.round((raw / (wHigh + wMid + wLow + 2 /*bonuses*/) ) * 100));

  return {
    score: normalized,
    rawScore: raw,
    highAvail,
    midAvail,
    lowAvail,
  };
}

// Build suggested attendees list with statuses
function buildSuggestedAttendees(slot: Timeslot, participants: Participant[], minHighPresence: number | undefined) {
  const suggestions: { participantId: string; status: "suggest" | "optional" }[] = [];
  const highParticipants = participants.filter((p) => p.priority === "high");
  // if we must enforce minHighPresence, mark some high-priority as required (suggest) if they are available
  const requiredHighCount = Math.ceil((minHighPresence ?? 0.5) * Math.max(1, highParticipants.length));
  let availableHigh = highParticipants.filter((p) => !p.busy.some((bw) => overlaps(slot.startISO, slot.endISO, bw.startISO, bw.endISO)));

  // mark available high as suggest
  for (const p of participants) {
    const isBusy = p.busy.some((bw) => overlaps(slot.startISO, slot.endISO, bw.startISO, bw.endISO));
    if (!isBusy) {
      if (p.priority === "high") suggestions.push({ participantId: p.id, status: "suggest" });
      else suggestions.push({ participantId: p.id, status: "optional" });
    } else {
      // busy: still include as optional invite if low priority (maybe they can join late)
      if (p.priority !== "high") suggestions.push({ participantId: p.id, status: "optional" });
    }
  }
  return suggestions;
}

// ---------------------- Gemini prompt builder ----------------------
function buildGeminiPrompt(body: RequestBody) {
  const { timeslots, participants, preferences, contextNotes } = body;

  const timeslotText = timeslots
    .map((t) => `- id:${t.id ?? "n/a"} start:${t.startISO} end:${t.endISO} duration:${durationMinutes(t)}m`)
    .join("\n");

  const participantsText = participants
    .map(
      (p) =>
        `- id:${p.id} name:${p.name ?? "n/a"} priority:${p.priority} busy:[${p.busy
          .map((b) => `${b.startISO}->${b.endISO}`)
          .join(", ")}]`
    )
    .join("\n");

  const prefsText = JSON.stringify(preferences || {}, null, 2);

  const systemInstruction = `
You are an expert meeting scheduler assistant. 
Your job: from the provided candidate timeslots (already pre-filtered to reasonable meeting windows), participant timelines, and user preferences, choose and explain the top 3 meeting times most likely to satisfy constraints and maximize presence of high-priority participants.
Return EXACTLY a JSON object adhering to the schema requested below, and nothing else.
`;

  const userPrompt = `
TIMESLOTS (candidate list):
${timeslotText}

PARTICIPANTS:
${participantsText}

PREFERENCES:
${prefsText}

CONTEXT NOTES:
${contextNotes || "None"}

RULES:
1) Respect participant busy windows (they cannot attend if a busy window overlaps).
2) Prioritize high-priority participants' availability. If a high-priority participant is unavailable in a slot, that should reduce the slot's confidence.
3) Respect preferences like minHighPriorityPresence (fraction), preferredStartHourRange, bufferMinutes, durationMinutes.
4) Provide three (3) suggested timeslots (choose from the provided timeslots only).
5) For each suggestion include: timeslot (id/startISO/endISO), estimated confidence 0-100, numeric score 0-100, why you selected it (2-4 sentences), suggestedAttendees array (participantId + status 'suggest'|'optional'), and practical scheduling notes (e.g., "consider 10-min buffer", "send tentative invite to X first").

OUTPUT SCHEMA (RETURN EXACT JSON following this shape):
{
  "suggestions": [
    {
      "timeslot": { "id":"", "startISO":"", "endISO":"" },
      "score": number,        // 0..100
      "confidence": number,   // 0..100
      "reason": "string",
      "suggestedAttendees": [ { "participantId":"", "status":"suggest"|"optional" } ],
      "practicalNotes": [ "string" ]
    }
  ],
  "explainability": "short summary explaining how scores were computed (1-3 sentences)",
  "metadata": { "generatedAt": "ISO timestamp", "source": "gemini" }
}

Now analyze the provided inputs and return JSON strictly following the schema.
`;

  return { systemInstruction, userPrompt };
}

// ---------------------- Handler ----------------------
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    // Basic validation
    if (!body.timeslots || !Array.isArray(body.timeslots) || body.timeslots.length === 0) {
      return NextResponse.json({ success: false, error: "No timeslots provided" }, { status: 400 });
    }
    if (!body.participants || !Array.isArray(body.participants) || body.participants.length === 0) {
      return NextResponse.json({ success: false, error: "No participants provided" }, { status: 400 });
    }

    // Try Gemini first if key present
    const apiKey = process.env.GEMINI_API_KEY;
    const promptBundle = buildGeminiPrompt(body);

    let geminiResult: any = null;
    let geminiParsed: ResponseBody | null = null;

    if (apiKey) {
      try {
        const payload = {
          systemInstruction: { parts: [{ text: promptBundle.systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: promptBundle.userPrompt }] }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.05,
            topP: 0.95,
          },
        };

        const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          geminiResult = await resp.json();
          // try to extract text and parse JSON (handle markdown fences)
          const candidateText =
            geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text ||
            geminiResult?.candidates?.[0]?.content?.parts?.[0]?.input ||
            "";

          let jsonText = candidateText.trim();
          if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
          }
          const parsed = JSON.parse(jsonText);

          // quick validation of parsed shape
          if (!parsed?.suggestions || !Array.isArray(parsed.suggestions)) {
            throw new Error("Gemini returned unexpected schema");
          }

          geminiParsed = {
            success: true,
            source: "gemini",
            suggestions: parsed.suggestions.map((s: any) => ({
              timeslot: s.timeslot,
              score: s.score,
              confidence: s.confidence,
              reason: s.reason,
              suggestedAttendees: s.suggestedAttendees,
              practicalNotes: s.practicalNotes,
            })),
            diagnostics: { raw: parsed },
            rawModelResponse: geminiResult,
          } as any;

          // return Gemini result
          return NextResponse.json(geminiParsed);
        } else {
          const text = await resp.text();
          console.error("Gemini API failed:", resp.status, text);
        }
      } catch (e) {
        console.warn("Gemini attempt failed, falling back to algorithm:", e);
      }
    } else {
      console.warn("GEMINI_API_KEY not set; using algorithmic fallback");
    }

    // ------------- Algorithmic fallback -------------
    const prefs = body.preferences ?? {};
    const scored = body.timeslots.map((ts) => {
      const res = scoreTimeslotAlgorithmic(ts, body.participants, prefs);
      const suggestedAttendees = buildSuggestedAttendees(ts, body.participants, prefs?.minHighPriorityPresence);
      // build reason string
      const reasonParts: string[] = [];
      reasonParts.push(
        `High-priority availability ${Math.round(res.highAvail * 100)}%, mid ${Math.round(
          res.midAvail * 100
        )}%.`
      );
      if (prefs?.durationMinutes) {
        reasonParts.push(`Slot supports ${prefs.durationMinutes}m meeting: ${durationMinutes(ts) >= prefs.durationMinutes}`);
      }
      const reason = reasonParts.join(" ");

      return {
        timeslot: ts,
        score: res.score,
        confidence: Math.max(30, Math.min(95, Math.round(res.score * 0.9 + 5))), // heuristic mapping
        reason,
        suggestedAttendees,
      } as SuggestedSlot;
    });

    // pick top 3 by score
    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3);

    const respBody: ResponseBody = {
      success: true,
      source: apiKey ? (geminiResult ? "gemini" : "algorithm") : "algorithm",
      suggestions: top3,
      diagnostics: {
        scoringDetail: scored.map((s) => ({
          timeslot: s.timeslot,
          score: s.score,
        })),
      },
      rawModelResponse: geminiResult ?? undefined,
    };

    return NextResponse.json(respBody);
  } catch (error) {
    console.error("Error in schedule recommender:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
