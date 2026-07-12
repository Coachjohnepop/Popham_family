import { speakBritishBrowser, waitForVoices } from "@/lib/browser-tts";
import { loadStoredStoryVoiceId } from "@/lib/story-voices";
import { chunkTextForTts, configureTtsPlayback } from "@/lib/tts-config";

export type SpeakState = "idle" | "loading" | "speaking" | "paused";

export type SpeakController = {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getState: () => SpeakState;
};

function playBlob(blob: Blob, audioOut: { current: HTMLAudioElement | null }): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    configureTtsPlayback(audio);
    audioOut.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (audioOut.current === audio) audioOut.current = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (audioOut.current === audio) audioOut.current = null;
      reject(new Error("audio playback failed"));
    };
    void audio.play().catch(reject);
  });
}

export async function speakText(
  text: string,
  hooks?: {
    onLoading?: () => void;
    onSpeaking?: () => void;
    onPaused?: () => void;
    onIdle?: () => void;
  },
  options?: { voiceId?: string },
): Promise<SpeakController> {
  const trimmed = text.trim();
  let cancelled = false;
  let paused = false;
  let state: SpeakState = "idle";
  let browserStop: (() => void) | null = null;
  let usingBrowser = false;
  const audioOut = { current: null as HTMLAudioElement | null };
  const voiceId = options?.voiceId ?? loadStoredStoryVoiceId();

  const setState = (next: SpeakState) => {
    state = next;
    if (next === "loading") hooks?.onLoading?.();
    else if (next === "speaking") hooks?.onSpeaking?.();
    else if (next === "paused") hooks?.onPaused?.();
    else if (next === "idle") hooks?.onIdle?.();
  };

  const stop = () => {
    cancelled = true;
    paused = false;
    browserStop?.();
    browserStop = null;
    if (audioOut.current) {
      audioOut.current.pause();
      audioOut.current = null;
    }
    if (usingBrowser && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    usingBrowser = false;
    setState("idle");
  };

  const pause = () => {
    if (state !== "speaking") return;
    paused = true;
    if (usingBrowser && typeof window !== "undefined") {
      window.speechSynthesis.pause();
      setState("paused");
      return;
    }
    if (audioOut.current && !audioOut.current.paused) {
      audioOut.current.pause();
      setState("paused");
    }
  };

  const resume = () => {
    if (state !== "paused") return;
    paused = false;
    if (usingBrowser && typeof window !== "undefined") {
      window.speechSynthesis.resume();
      setState("speaking");
      return;
    }
    if (audioOut.current) {
      void audioOut.current.play();
      setState("speaking");
    }
  };

  const controller: SpeakController = {
    stop,
    pause,
    resume,
    getState: () => state,
  };

  if (!trimmed) {
    setState("idle");
    return controller;
  }

  setState("loading");

  try {
    const chunks = chunkTextForTts(trimmed);
    setState("speaking");

    for (const chunk of chunks) {
      if (cancelled) break;
      while (paused && !cancelled) {
        await new Promise((r) => setTimeout(r, 120));
      }
      if (cancelled) break;

      const res = await fetch("/api/read-aloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk, voiceId }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      if (cancelled) break;

      await playBlob(blob, audioOut);
      while (paused && !cancelled) {
        await new Promise((r) => setTimeout(r, 120));
      }
    }
  } catch {
    if (!cancelled) {
      await waitForVoices();
      if (!cancelled) {
        usingBrowser = true;
        setState("speaking");
        browserStop = speakBritishBrowser(
          trimmed,
          () => {
            if (!cancelled) setState("idle");
          },
          () => {
            if (!cancelled) setState("idle");
          },
        );
        return controller;
      }
    }
  }

  if (!cancelled) setState("idle");
  return controller;
}
