import { NextResponse } from "next/server";
import { getOpenAiApiKey, parseOpenAiError } from "@/lib/openai-server";
import { chunkTextForTts, TTS_INSTRUCTIONS, TTS_VOICE } from "@/lib/tts-config";

export async function POST(request: Request) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "TTS not configured", hint: "Add OPENAI_API_KEY on Vercel and redeploy." },
      { status: 503 },
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const [chunk] = chunkTextForTts(text);
  if (!chunk) {
    return NextResponse.json({ error: "empty text" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: TTS_VOICE,
        input: chunk,
        instructions: TTS_INSTRUCTIONS,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("OpenAI TTS failed:", res.status, detail);
      return NextResponse.json(
        { error: "TTS generation failed", hint: parseOpenAiError(detail) },
        { status: 502 },
      );
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("read-aloud route:", err);
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}