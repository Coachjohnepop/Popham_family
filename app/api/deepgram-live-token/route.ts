import { NextResponse } from "next/server";
import { getDeepgramApiKey, parseDeepgramError } from "@/lib/deepgram-server";

/** Short-lived JWT for browser WebSocket to Deepgram (only needed at connect time). */
const TOKEN_TTL_SECONDS = 300;

export async function POST() {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Live transcription not configured",
        hint: "Add DEEPGRAM_API_KEY on Vercel (Production + Preview), then redeploy.",
      },
      { status: 503 },
    );
  }

  try {
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: TOKEN_TTL_SECONDS }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Deepgram grant failed:", res.status, detail);
      return NextResponse.json(
        {
          error: "Could not start live transcription",
          hint: parseDeepgramError(detail),
        },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) {
      return NextResponse.json({ error: "Empty live token" }, { status: 502 });
    }

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in ?? TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error("deepgram-live-token:", err);
    return NextResponse.json({ error: "Live token error" }, { status: 500 });
  }
}