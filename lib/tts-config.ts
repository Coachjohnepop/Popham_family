/**
 * OpenAI gpt-4o-mini-tts voices (override with TTS_VOICE on Vercel):
 * alloy — balanced neutral
 * ash — clear, conversational
 * ballad — warm, melodic storytelling
 * coral — warm, approachable female
 * echo — smooth male
 * fable — expressive British-leaning narrator
 * onyx — deep, authoritative male (default)
 * nova — friendly, energetic female
 * sage — calm, measured
 * shimmer — bright female
 * verse — versatile audiobook narrator
 */
export const TTS_VOICE = process.env.TTS_VOICE || "onyx";

/** 1.0 = default; client playback uses preservesPitch so pitch stays natural. */
export const TTS_SPEED = 0.65;

export const TTS_INSTRUCTIONS =
  "Speak in a warm, refined British English accent. Sound like a thoughtful BBC " +
  "documentary narrator reading family history to a loved one — calm, smooth, and clear. " +
  "Use a very relaxed, unhurried pace — noticeably slower than everyday conversation. " +
  "Linger gently on commas and take a full beat at full stops. Never rush or sound robotic.";

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