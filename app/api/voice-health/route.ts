import { NextResponse } from "next/server";
import { getDeepgramApiKey, parseDeepgramError } from "@/lib/deepgram-server";
import { getOpenAiApiKey, parseOpenAiError } from "@/lib/openai-server";

export async function GET() {
  const deepgramKey = getDeepgramApiKey();
  const openaiKey = getOpenAiApiKey();

  if (!deepgramKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      stt: "missing",
      tts: openaiKey ? "openai" : "browser-fallback",
      hint: "DEEPGRAM_API_KEY is missing. Add it in Vercel and redeploy.",
    });
  }

  let sttOk = false;
  let sttHint: string | undefined;

  try {
    const res = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${deepgramKey}` },
    });
    if (res.ok) {
      sttOk = true;
    } else {
      const detail = await res.text();
      sttHint = parseDeepgramError(detail);
    }
  } catch (err) {
    sttHint = err instanceof Error ? err.message : "Deepgram connection failed";
  }

  let ttsOk = false;
  let ttsHint: string | undefined;

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      if (res.ok) {
        ttsOk = true;
      } else {
        const detail = await res.text();
        ttsHint = parseOpenAiError(detail);
      }
    } catch (err) {
      ttsHint = err instanceof Error ? err.message : "OpenAI connection failed";
    }
  }

  const ok = sttOk;
  const hints: string[] = [];
  if (sttOk) hints.push("Deepgram transcription ready");
  else if (sttHint) hints.push(`Transcription: ${sttHint}`);
  if (ttsOk) hints.push("OpenAI read-aloud ready");
  else hints.push("Read-aloud uses browser voice (no OpenAI billing needed)");

  return NextResponse.json({
    ok,
    configured: true,
    stt: sttOk ? "deepgram" : "error",
    tts: ttsOk ? "openai" : "browser-fallback",
    hint: hints.join(". "),
    ...(sttHint && !sttOk ? { sttError: sttHint } : {}),
    ...(ttsHint && openaiKey && !ttsOk ? { ttsError: ttsHint } : {}),
  });
}