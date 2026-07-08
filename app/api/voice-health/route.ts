import { NextResponse } from "next/server";
import { getOpenAiApiKey, parseOpenAiError } from "@/lib/openai-server";

export async function GET() {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      hint: "OPENAI_API_KEY is missing on this deployment. Add it in Vercel and redeploy.",
    });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({
        ok: false,
        configured: true,
        openai: res.status,
        hint: parseOpenAiError(detail),
      });
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      openai: "connected",
      hint: "Voice transcription and read-aloud should work.",
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      configured: true,
      hint: err instanceof Error ? err.message : "OpenAI connection failed",
    });
  }
}