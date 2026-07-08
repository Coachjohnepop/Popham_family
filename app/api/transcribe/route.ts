import { NextResponse } from "next/server";
import {
  getDeepgramApiKey,
  parseDeepgramError,
  transcribeAudioWithDeepgram,
} from "@/lib/deepgram-server";

export async function POST(request: Request) {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Transcription not configured",
        hint: "Add DEEPGRAM_API_KEY on Vercel (Production + Preview), then redeploy.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "audio required" }, { status: 400 });
  }

  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "audio too large" }, { status: 413 });
  }

  try {
    const text = await transcribeAudioWithDeepgram(audio);
    if (!text) {
      return NextResponse.json(
        { error: "Empty transcript", hint: "Speak a little longer, then tap Done again." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    console.error("Deepgram transcribe failed:", message);
    return NextResponse.json(
      {
        error: "Transcription failed",
        hint: message.includes("DEEPGRAM") ? message : parseDeepgramError(message),
      },
      { status: 502 },
    );
  }
}