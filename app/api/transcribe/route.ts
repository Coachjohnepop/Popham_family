import { NextResponse } from "next/server";
import { extensionForAudioMime, getOpenAiApiKey, parseOpenAiError } from "@/lib/openai-server";

export async function POST(request: Request) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Transcription not configured",
        hint: "Add OPENAI_API_KEY on Vercel (Production), then redeploy.",
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

  const ext = extensionForAudioMime(audio.type || "audio/webm");
  const upstream = new FormData();
  upstream.append("file", audio, `speech.${ext}`);
  upstream.append("model", "whisper-1");
  upstream.append("language", "en");
  upstream.append(
    "prompt",
    "Family history question about Salem Witch Trials, Québec, or the Winifred Coss family tree.",
  );

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Whisper failed:", res.status, detail);
      return NextResponse.json(
        {
          error: "Transcription failed",
          hint: parseOpenAiError(detail),
        },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Empty transcript", hint: "Speak a little longer, then tap Done again." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text });
  } catch (err) {
    console.error("transcribe route:", err);
    return NextResponse.json({ error: "Transcription error" }, { status: 500 });
  }
}