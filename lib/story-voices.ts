/**
 * Curated narrator voices for the story UI (Speechify primary).
 * Only these three are exposed on the radial dial — keep the allowlist tight.
 */

export type StoryVoiceGender = "male" | "female";

export type StoryVoice = {
  id: string;
  /** Speechify voice_id */
  speechifyId: string;
  /** OpenAI gpt-4o-mini-tts fallback voice */
  openaiId: string;
  label: string;
  gender: StoryVoiceGender;
  shortLabel: string;
  blurb: string;
};

export const STORY_VOICES: readonly StoryVoice[] = [
  {
    id: "edmund",
    speechifyId: "edmund_32",
    openaiId: "onyx",
    label: "Edmund",
    gender: "male",
    shortLabel: "Male",
    blurb: "Classic storyteller — default",
  },
  {
    id: "hugh",
    speechifyId: "hugh_32",
    openaiId: "ballad",
    label: "Hugh",
    gender: "male",
    shortLabel: "Male",
    blurb: "Warm, measured guide",
  },
  {
    id: "beatrice",
    speechifyId: "beatrice_32",
    openaiId: "coral",
    label: "Beatrice",
    gender: "female",
    shortLabel: "Female",
    blurb: "Clear, bright narrator",
  },
] as const;

export const DEFAULT_STORY_VOICE_ID = "edmund";

const STORAGE_KEY = "coss-story-narrator-voice";
/** Bump suffix when coach UX changes so users see the tip again. */
const COACH_SEEN_KEY = "coss-story-voice-dial-coach-seen-v2";
const SUMMARY_COACH_SEEN_KEY = "coss-summary-coach-seen-v2";

export function getStoryVoice(id: string | null | undefined): StoryVoice {
  const found = STORY_VOICES.find((v) => v.id === id);
  return found ?? STORY_VOICES.find((v) => v.id === DEFAULT_STORY_VOICE_ID)!;
}

export function isAllowedStoryVoiceId(id: string | null | undefined): boolean {
  return Boolean(id && STORY_VOICES.some((v) => v.id === id));
}

/** Resolve a client-sent id (or speechify id) to a catalog entry. */
export function resolveStoryVoice(
  voiceId?: string | null,
  speechifyId?: string | null,
): StoryVoice {
  if (voiceId && isAllowedStoryVoiceId(voiceId)) {
    return getStoryVoice(voiceId);
  }
  if (speechifyId) {
    const bySpeechify = STORY_VOICES.find((v) => v.speechifyId === speechifyId);
    if (bySpeechify) return bySpeechify;
  }
  return getStoryVoice(DEFAULT_STORY_VOICE_ID);
}

export function loadStoredStoryVoiceId(): string {
  if (typeof window === "undefined") return DEFAULT_STORY_VOICE_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isAllowedStoryVoiceId(raw)) return raw;
  } catch {
    /* private mode */
  }
  return DEFAULT_STORY_VOICE_ID;
}

export function saveStoredStoryVoiceId(id: string): void {
  if (typeof window === "undefined") return;
  if (!isAllowedStoryVoiceId(id)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
}

export function loadVoiceDialCoachSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(COACH_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function saveVoiceDialCoachSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COACH_SEEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function loadSummaryCoachSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SUMMARY_COACH_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function saveSummaryCoachSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUMMARY_COACH_SEEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** Sample line for optional preview when the user turns the dial. */
export const VOICE_PREVIEW_LINE =
  "Hello — this is your story narrator. I'll read Winifred's family history in a warm, unhurried voice.";

