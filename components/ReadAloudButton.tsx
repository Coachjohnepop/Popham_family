"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chunkTextForTts } from "@/lib/tts-config";
import { speakBritishBrowser, waitForVoices } from "@/lib/browser-tts";

type ReadAloudButtonProps = {
  text: string;
  label?: string;
  /** When this value changes, narration starts automatically (e.g. jelly-bean selection). */
  autoPlayKey?: string;
};

export default function ReadAloudButton({
  text,
  label = "Read aloud",
  autoPlayKey,
}: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopRef.current?.();
    stopRef.current = null;
    setSpeaking(false);
    setLoading(false);
  }, []);

  const playBlob = useCallback((blob: Blob): Promise<void> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
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
    await waitForVoices();
    if (cancelledRef.current) return;
    stopRef.current = speakBritishBrowser(
      text,
      () => {
        setSpeaking(false);
        stopRef.current = null;
      },
      () => setSpeaking(false),
    );
    setSpeaking(true);
  }, [text]);

  const speakApi = useCallback(async () => {
    const chunks = chunkTextForTts(text);
    setSpeaking(true);
    for (const chunk of chunks) {
      if (cancelledRef.current) break;
      const res = await fetch("/api/read-aloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      if (cancelledRef.current) break;
      await playBlob(blob);
    }
    if (!cancelledRef.current) {
      setSpeaking(false);
    }
  }, [text, playBlob]);

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
    void speak();
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
      title="British narrator voice"
    >
      {caption}
    </button>
  );
}