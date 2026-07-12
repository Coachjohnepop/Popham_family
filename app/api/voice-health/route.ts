import { NextResponse } from "next/server";
import { getDeepgramApiKey, parseDeepgramError } from "@/lib/deepgram-server";
import { getOpenAiApiKey, parseOpenAiError } from "@/lib/openai-server";
import { getSpeechifyApiKey, parseSpeechifyError } from "@/lib/speechify-server";
import { SPEECHIFY_MODEL, SPEECHIFY_VOICE } from "@/lib/tts-config";

export async function GET() {
  const deepgramKey = getDeepgramApiKey();
  const speechifyKey = getSpeechifyApiKey();
  const openaiKey = getOpenAiApiKey();

  if (!deepgramKey) {
    return NextResponse.json({
      ok: false,
      configured: false,
      stt: "missing",
      tts: speechifyKey ? "speechify" : openaiKey ? "openai" : "browser-fallback",
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

  let ttsProvider: "speechify" | "openai" | "browser-fallback" = "browser-fallback";
  let ttsOk = false;
  let ttsHint: string | undefined;

  if (speechifyKey) {
    try {
      const res = await fetch("https://api.speechify.ai/v1/voices", {
        headers: { Authorization: `Bearer ${speechifyKey}` },
      });
      if (res.ok) {
        ttsOk = true;
        ttsProvider = "speechify";
      } else {
        const detail = await res.text();
        ttsHint = parseSpeechifyError(detail);
      }
    } catch (err) {
      ttsHint = err instanceof Error ? err.message : "Speechify connection failed";
    }
  }

  if (!ttsOk && openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      if (res.ok) {
        ttsOk = true;
        ttsProvider = "openai";
      } else {
        const detail = await res.text();
        ttsHint = ttsHint ?? parseOpenAiError(detail);
      }
    } catch (err) {
      ttsHint = ttsHint ?? (err instanceof Error ? err.message : "OpenAI connection failed");
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
  } else if (sttHint) {
    hints.push(`Transcription: ${sttHint}`);
  }

  if (ttsOk && ttsProvider === "speechify") {
    hints.push(`Speechify read-aloud ready (voice ${SPEECHIFY_VOICE}, model ${SPEECHIFY_MODEL})`);
  } else if (ttsOk && ttsProvider === "openai") {
    hints.push("OpenAI read-aloud ready");
  } else if (ttsHint) {
    hints.push(`Read-aloud: ${ttsHint}`);
  } else {
    hints.push("Read-aloud uses browser voice (add SPEECHIFY_API_KEY for premium TTS)");
  }

  return NextResponse.json({
    ok,
    configured: true,
    stt: sttOk ? "deepgram" : "error",
    tts: ttsProvider,
    ...(ttsProvider === "speechify"
      ? { speechifyVoice: SPEECHIFY_VOICE, speechifyModel: SPEECHIFY_MODEL }
      : {}),
    hint: hints.join(". "),
    ...(sttHint && !sttOk ? { sttError: sttHint } : {}),
    ...(ttsHint && (speechifyKey || openaiKey) && !ttsOk ? { ttsError: ttsHint } : {}),
  });
}
