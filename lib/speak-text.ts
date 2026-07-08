import { speakBritishBrowser, waitForVoices } from "@/lib/browser-tts";
import { chunkTextForTts } from "@/lib/tts-config";

export type SpeakController = {
  stop: () => void;
};

function playBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
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
    onIdle?: () => void;
  },
): Promise<SpeakController> {
  const trimmed = text.trim();
  let cancelled = false;
  let browserStop: (() => void) | null = null;
  let audio: HTMLAudioElement | null = null;

  const stop = () => {
    cancelled = true;
    browserStop?.();
    browserStop = null;
    if (audio) {
      audio.pause();
      audio = null;
    }
    hooks?.onIdle?.();
  };

  if (!trimmed) {
    hooks?.onIdle?.();
    return { stop };
  }

  hooks?.onLoading?.();

  let usedApi = false;
  try {
    const chunks = chunkTextForTts(trimmed);
    hooks?.onSpeaking?.();

    for (const chunk of chunks) {
      if (cancelled) break;
      const res = await fetch("/api/read-aloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunk }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      if (cancelled) break;
      usedApi = true;
      await playBlob(blob);
    }
  } catch {
    if (!cancelled) {
      await waitForVoices();
      if (!cancelled) {
        hooks?.onSpeaking?.();
        browserStop = speakBritishBrowser(
          trimmed,
          () => {
            if (!cancelled) hooks?.onIdle?.();
          },
          () => {
            if (!cancelled) hooks?.onIdle?.();
          },
        );
        return { stop };
      }
    }
  }

  if (usedApi && cancelled) {
    hooks?.onIdle?.();
    return { stop };
  }

  if (!cancelled) hooks?.onIdle?.();
  return { stop };
}