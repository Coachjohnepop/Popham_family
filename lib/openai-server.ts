export function getOpenAiApiKey(): string | null {
  const raw = process.env.OPENAI_API_KEY;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOpenAiError(body: string): string {
  try {
    const data = JSON.parse(body) as { error?: { message?: string; code?: string; type?: string } };
    const msg = data.error?.message ?? body;
    if (msg.toLowerCase().includes("incorrect api key") || data.error?.code === "invalid_api_key") {
      return "OpenAI rejected the API key. In Vercel, re-paste OPENAI_API_KEY (no spaces or quotes) and redeploy.";
    }
    if (msg.toLowerCase().includes("billing") || msg.toLowerCase().includes("quota")) {
      return "OpenAI billing or quota issue. Check payment method at platform.openai.com.";
    }
    return msg.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

export function extensionForAudioMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  return "webm";
}