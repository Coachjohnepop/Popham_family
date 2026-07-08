export type VoiceInputMode = "web-speech" | "server-stt";

export type VoiceEnvironment = {
  mode: VoiceInputMode;
  browserLabel: string;
  isBrave: boolean;
  isLikelyPrivate: boolean;
  warning?: string;
};

function detectBrave(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> | boolean } };
  if (nav.brave?.isBrave) return true;
  return /Brave/i.test(navigator.userAgent);
}

/** Best-effort private/incognito detection (not guaranteed in all browsers). */
function detectLikelyPrivate(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const storage = window.sessionStorage;
    storage.setItem("__wcft_priv_probe", "1");
    storage.removeItem("__wcft_priv_probe");
  } catch {
    return true;
  }

  if (window.matchMedia?.("(display-mode: standalone)").matches) return false;

  // Brave/Chrome private often blocks cloud speech even when sessionStorage works.
  return false;
}

export function getBrowserLabel(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Brave/i.test(ua)) return "Brave";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "browser";
}

/**
 * Brave (especially Private) blocks the Web Speech API — it sends audio to Google
 * and Brave Shields kill it with a instant network error. Use server STT instead.
 */
export function getVoiceEnvironment(): VoiceEnvironment {
  const isBrave = detectBrave();
  const isLikelyPrivate = detectLikelyPrivate();
  const browserLabel = getBrowserLabel();

  const braveBlocked =
    isBrave ||
    (isLikelyPrivate && (browserLabel === "Brave" || browserLabel === "Chrome"));

  if (braveBlocked) {
    return {
      mode: "server-stt",
      browserLabel,
      isBrave,
      isLikelyPrivate,
      warning:
        isBrave && isLikelyPrivate
          ? "Brave Private blocks live speech-to-text. We record your voice and transcribe when you tap Done — or type your question above."
          : isBrave
            ? "Brave blocks browser speech-to-text. We record your voice and transcribe when you tap Done — or type above."
            : "Private browsing may block live captions. We transcribe when you tap Done.",
    };
  }

  return {
    mode: "web-speech",
    browserLabel,
    isBrave,
    isLikelyPrivate,
  };
}

export function shouldFallbackToServerStt(errorCode: string): boolean {
  return errorCode === "network" || errorCode === "service-not-allowed";
}