"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chunkTextForTts, configureTtsPlayback } from "@/lib/tts-config";
import { speakBritishBrowser, waitForVoices } from "@/lib/browser-tts";
import { loadStoredStoryVoiceId } from "@/lib/story-voices";

type ReadAloudButtonProps = {
  text: string;
  label?: string;
  /** When this value changes, narration starts automatically (e.g. chapter continue). */
  autoPlayKey?: string;
  /** Delay before auto-play (lets fade-in finish). */
  autoPlayDelayMs?: number;
  onSpeakingChange?: (speaking: boolean) => void;
};

export default function ReadAloudButton({
  text,
  label = "Read aloud",
  autoPlayKey,
  autoPlayDelayMs = 0,
  onSpeakingChange,
}: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceId, setVoiceId] = useState(loadStoredStoryVoiceId);
  const stopRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);
  const textRef = useRef(text);
  textRef.current = text;

  const reportSpeaking = useCallback(
    (next: boolean) => {
      setSpeaking(next);
      onSpeakingChange?.(next);
    },
    [onSpeakingChange],
  );

  useEffect(() => {
    const sync = () => setVoiceId(loadStoredStoryVoiceId());
    sync();
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ voiceId?: string }>).detail;
      if (detail?.voiceId) setVoiceId(detail.voiceId);
      else sync();
    };
    window.addEventListener("coss-narrator-voice", onCustom);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("coss-narrator-voice", onCustom);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopRef.current?.();
    stopRef.current = null;
    reportSpeaking(false);
    setLoading(false);
  }, [reportSpeaking]);

  const playBlob = useCallback((blob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      configureTtsPlayback(audio);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
        reject(new Error("audio playback failed"));
      };
      void audio.play().catch(reject);
    });
  }, []);

  const speakBrowser = useCallback(async () => {
    const body = textRef.current;
    await waitForVoices();
    if (cancelledRef.current) return;
    stopRef.current = speakBritishBrowser(
      body,
      () => {
        reportSpeaking(false);
        stopRef.current = null;
      },
      () => reportSpeaking(false),
    );
    reportSpeaking(true);
  }, [reportSpeaking]);

  const speakApi = useCallback(async () => {
    const body = textRef.current;
    const chunks = chunkTextForTts(body);
    const activeVoice = loadStoredStoryVoiceId();
    reportSpeaking(true);
    for (const chunk of chunks) {
      if (cancelledRef.current) break;
      const res = await fetch("/api/read-aloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk, voiceId: activeVoice }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      if (cancelledRef.current) break;
      await playBlob(blob);
    }
    if (!cancelledRef.current) {
      reportSpeaking(false);
    }
  }, [playBlob, reportSpeaking]);

  const speak = useCallback(async () => {
    stop();
    cancelledRef.current = false;
    setLoading(true);
    try {
      await speakApi();
    } catch {
      if (!cancelledRef.current) {
        await speakBrowser();
      }
    } finally {
      setLoading(false);
    }
  }, [stop, speakApi, speakBrowser]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (autoPlayKey == null || !text.trim()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void speak();
    }, autoPlayDelayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Only react to explicit play triggers, not speak/text churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayKey]);

  const caption = loading ? "Preparing voice…" : speaking ? "Stop reading" : label;

  return (
    <button
      type="button"
      onClick={speaking || loading ? stop : speak}
      disabled={!text.trim()}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        speaking || loading
          ? "bg-[#8b5e34] text-white"
          : "bg-[#efe4d2] text-[#5c4a38] hover:bg-[#e4d4bc]"
      } disabled:opacity-40`}
      title={`Story narrator (${voiceId})`}
    >
      {caption}
    </button>
  );
}
