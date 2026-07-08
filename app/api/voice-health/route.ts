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
  let liveOk = false;
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

  if (sttOk) {
    try {
      const grantRes = await fetch("https://api.deepgram.com/v1/auth/grant", {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl_seconds: 30 }),
      });
      liveOk = grantRes.ok;
      if (!grantRes.ok && !sttHint) {
        const detail = await grantRes.text();
        const parsed = parseDeepgramError(detail);
        if (/insufficient permissions|forbidden/i.test(parsed) || /insufficient permissions|forbidden/i.test(detail)) {
          sttHint =
            "Batch transcription works. For live captions, recreate the API key with Member permission (console.deepgram.com → API Keys → Advanced).";
        }
      }
    } catch {
      /* grant probe optional */
    }
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
  if (sttOk) {
    hints.push(
      liveOk
        ? "Deepgram live + batch transcription ready"
        : "Deepgram batch transcription ready (live captions need Member API key)",
    );
  }
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