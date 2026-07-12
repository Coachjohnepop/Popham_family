/**
 * Read-aloud TTS configuration.
 *
 * Provider order (server /api/read-aloud):
 *   1. Speechify — when SPEECHIFY_API_KEY is set (preferred)
 *   2. OpenAI gpt-4o-mini-tts — when OPENAI_API_KEY is set
 *   3. Browser speechSynthesis — client fallback
 *
 * Speechify simba-3.2 curated voices (override with SPEECHIFY_VOICE):
 *   beatrice_32, dominic_32, edmund_32, geffen_32,
 *   harper_32, hugh_32, imogen_32, wyatt_32
 * Classic voices also work with simba-english: george, henry, carly, sabrina
 *
 * OpenAI gpt-4o-mini-tts voices (override with TTS_VOICE):
 *   alloy, ash, ballad, coral, echo, fable, onyx (default),
 *   nova, sage, shimmer, verse
 */
export const TTS_PROVIDER = (process.env.TTS_PROVIDER || "auto").toLowerCase();

/** Speechify voice id — British-leaning storytelling default. */
export const SPEECHIFY_VOICE = process.env.SPEECHIFY_VOICE || "edmund_32";

/** simba-3.2 = recommended English model (lowest TTFB, richest expressivity). */
export const SPEECHIFY_MODEL = process.env.SPEECHIFY_MODEL || "simba-3.2";

/** OpenAI voice (used only when Speechify is unavailable). */
export const TTS_VOICE = process.env.TTS_VOICE || "onyx";

/** 1.0 = default; client playback uses preservesPitch so pitch stays natural. */
export const TTS_SPEED = 0.65;

export const TTS_INSTRUCTIONS =
  "Speak in a warm, refined British English accent. Sound like a thoughtful BBC " +
  "documentary narrator reading family history to a loved one — calm, smooth, and clear. " +
  "Use a very relaxed, unhurried pace — noticeably slower than everyday conversation. " +
  "Linger gently on commas and take a full beat at full stops. Never rush or sound robotic.";

/** Chunk size for API requests (OpenAI ~4k limit; Speechify allows more). */
export const TTS_MAX_CHARS = 3500;

export function configureTtsPlayback(audio: HTMLAudioElement): void {
  audio.preservesPitch = true;
  audio.defaultPlaybackRate = TTS_SPEED;
  audio.playbackRate = TTS_SPEED;
}

export function chunkTextForTts(text: string, maxLen = TTS_MAX_CHARS): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return [cleaned];

  const chunks: string[] = [];
  let rest = cleaned;
  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      break;
    }
    let cut = rest.lastIndexOf(". ", maxLen);
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf(" ", maxLen);
    if (cut < 1) cut = maxLen;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return chunks.filter(Boolean);
}
