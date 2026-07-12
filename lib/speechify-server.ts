export function getSpeechifyApiKey(): string | null {
  const raw = process.env.SPEECHIFY_API_KEY;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

export function parseSpeechifyError(body: string): string {
  try {
    const data = JSON.parse(body) as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    const code = data.error?.code ?? "";
    const msg = data.error?.message ?? data.message ?? body;

    if (code === "unauthorized" || /unauthorized|invalid.*(api|key|token)/i.test(msg)) {
      return "Speechify rejected the API key. In Vercel, re-paste SPEECHIFY_API_KEY (no spaces or quotes) and redeploy.";
    }
    if (
      code === "payment_required" ||
      code === "spend_cap_exceeded" ||
      code === "spend_budget_exceeded" ||
      /credit|billing|payment|quota|balance/i.test(msg)
    ) {
      return "Speechify billing or credits issue. Check balance at platform.speechify.ai/billing.";
    }
    if (code === "rate_limited" || code === "concurrency_limit_reached") {
      return "Speechify rate limit hit. Wait a moment and try again.";
    }
    if (code === "voice_not_found") {
      return "Speechify voice not found. Set SPEECHIFY_VOICE to a valid voice id (e.g. edmund_32, geffen_32, george).";
    }
    return String(msg).slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

/** Escape plain text for embedding inside SSML. */
export function escapeSsmlText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Wrap story text in SSML for a warm, unhurried family-history narrator.
 * Rate stays medium here — client playback uses TTS_SPEED (preservesPitch).
 */
export function wrapStorySsml(text: string, emotion = "warm"): string {
  const body = escapeSsmlText(text.replace(/\s+/g, " ").trim());
  return (
    `<speak>` +
    `<speechify:style emotion="${emotion}">` +
    body +
    `</speechify:style>` +
    `</speak>`
  );
}
