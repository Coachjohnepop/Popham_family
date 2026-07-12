import { NextResponse } from "next/server";
import { getOpenAiApiKey, parseOpenAiError } from "@/lib/openai-server";
import {
  getSpeechifyApiKey,
  parseSpeechifyError,
  wrapStorySsml,
} from "@/lib/speechify-server";
import { resolveStoryVoice } from "@/lib/story-voices";
import {
  chunkTextForTts,
  SPEECHIFY_MODEL,
  SPEECHIFY_VOICE,
  TTS_INSTRUCTIONS,
  TTS_PROVIDER,
  TTS_SPEED,
  TTS_VOICE,
} from "@/lib/tts-config";

type TtsResult =
  | { ok: true; audio: ArrayBuffer; provider: "speechify" | "openai" }
  | { ok: false; status: number; error: string; hint?: string };

async function synthesizeSpeechify(
  text: string,
  apiKey: string,
  speechifyVoiceId: string,
): Promise<TtsResult> {
  const res = await fetch("https://api.speechify.ai/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: wrapStorySsml(text),
      voice_id: speechifyVoiceId,
      model: SPEECHIFY_MODEL,
      audio_format: "mp3",
      language: "en-US",
      options: {
        text_normalization: true,
        loudness_normalization: false,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Speechify TTS failed:", res.status, detail);
    return {
      ok: false,
      status: res.status === 401 || res.status === 402 ? res.status : 502,
      error: "Speechify TTS generation failed",
      hint: parseSpeechifyError(detail),
    };
  }

  const payload = (await res.json()) as {
    audio_data?: string;
    audio_format?: string;
  };

  if (!payload.audio_data) {
    return {
      ok: false,
      status: 502,
      error: "Speechify TTS generation failed",
      hint: "Response missing audio_data",
    };
  }

  const binary = Buffer.from(payload.audio_data, "base64");
  return {
    ok: true,
    audio: binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength),
    provider: "speechify",
  };
}

async function synthesizeOpenAi(
  text: string,
  apiKey: string,
  openaiVoice: string,
): Promise<TtsResult> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: openaiVoice,
      input: text,
      instructions: TTS_INSTRUCTIONS,
      speed: TTS_SPEED,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("OpenAI TTS failed:", res.status, detail);
    return {
      ok: false,
      status: 502,
      error: "OpenAI TTS generation failed",
      hint: parseOpenAiError(detail),
    };
  }

  return {
    ok: true,
    audio: await res.arrayBuffer(),
    provider: "openai",
  };
}

export async function POST(request: Request) {
  const speechifyKey = getSpeechifyApiKey();
  const openaiKey = getOpenAiApiKey();
  const preferSpeechify = TTS_PROVIDER !== "openai";
  const preferOpenAi = TTS_PROVIDER === "openai";

  if (!speechifyKey && !openaiKey) {
    return NextResponse.json(
      {
        error: "TTS not configured",
        hint: "Add SPEECHIFY_API_KEY (preferred) or OPENAI_API_KEY on Vercel and redeploy.",
      },
      { status: 503 },
    );
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const storyVoice = resolveStoryVoice(body.voiceId, SPEECHIFY_VOICE);
  const speechifyVoiceId = storyVoice.speechifyId || SPEECHIFY_VOICE;
  const openaiVoice = storyVoice.openaiId || TTS_VOICE;

  const [chunk] = chunkTextForTts(text);
  if (!chunk) {
    return NextResponse.json({ error: "empty text" }, { status: 400 });
  }

  try {
    let result: TtsResult | null = null;
    let lastFailure: TtsResult | null = null;

    const trySpeechify = preferSpeechify && Boolean(speechifyKey);
    const tryOpenAi =
      (preferOpenAi || !trySpeechify || Boolean(openaiKey)) && Boolean(openaiKey);

    if (trySpeechify && speechifyKey) {
      result = await synthesizeSpeechify(chunk, speechifyKey, speechifyVoiceId);
      if (!result.ok) {
        lastFailure = result;
        result = null;
        if (!openaiKey || preferOpenAi) {
          return NextResponse.json(
            { error: lastFailure.error, hint: lastFailure.hint },
            { status: lastFailure.status },
          );
        }
      }
    }

    if (!result && tryOpenAi && openaiKey) {
      result = await synthesizeOpenAi(chunk, openaiKey, openaiVoice);
      if (!result.ok) {
        const fail = lastFailure ?? result;
        return NextResponse.json(
          { error: fail.error, hint: fail.hint },
          { status: fail.status },
        );
      }
    }

    if (!result || !result.ok) {
      return NextResponse.json(
        {
          error: lastFailure?.error ?? "TTS generation failed",
          hint: lastFailure?.hint ?? "No TTS provider available",
        },
        { status: lastFailure?.status ?? 503 },
      );
    }

    return new NextResponse(result.audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
        "X-TTS-Provider": result.provider,
        "X-TTS-Voice": storyVoice.id,
      },
    });
  } catch (err) {
    console.error("read-aloud route:", err);
    return NextResponse.json({ error: "TTS error" }, { status: 500 });
  }
}
