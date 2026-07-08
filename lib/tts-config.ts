/** OpenAI steerable TTS — British documentary narrator for family history. */
export const TTS_VOICE = process.env.TTS_VOICE || "fable";

export const TTS_INSTRUCTIONS =
  "Speak in a warm, refined British English accent. Sound like a thoughtful BBC " +
  "documentary narrator reading family history to a loved one — unhurried, smooth, " +
  "and clear. Use natural pacing with gentle pauses at commas and full stops. " +
  "Never rush or sound robotic.";

export const TTS_MAX_CHARS = 3500;

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