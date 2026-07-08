export function getDeepgramApiKey(): string | null {
  const raw = process.env.DEEPGRAM_API_KEY;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  return trimmed.length > 0 ? trimmed : null;
}

export function parseDeepgramError(body: string): string {
  try {
    const data = JSON.parse(body) as {
      err_msg?: string;
      err_code?: string;
      message?: string;
      error?: string;
    };
    const msg = data.err_msg ?? data.message ?? data.error ?? body;
    const lower = msg.toLowerCase();
    if (lower.includes("invalid credentials") || data.err_code === "INVALID_AUTH") {
      return "Deepgram rejected the API key. Re-paste DEEPGRAM_API_KEY in Vercel and redeploy.";
    }
    if (lower.includes("quota") || lower.includes("balance") || lower.includes("credits")) {
      return "Deepgram quota or balance issue. Check console.deepgram.com.";
    }
    return msg.slice(0, 200);
  } catch {
    return body.slice(0, 200);
  }
}

export type DeepgramListenResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string }>;
    }>;
  };
};

export async function transcribeAudioWithDeepgram(audio: Blob): Promise<string> {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const contentType = audio.type || "audio/webm";
  const params = new URLSearchParams({
    model: "nova-2",
    language: "en",
    smart_format: "true",
    punctuate: "true",
  });

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": contentType,
    },
    body: await audio.arrayBuffer(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(parseDeepgramError(detail));
  }

  const data = (await res.json()) as DeepgramListenResponse;
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}