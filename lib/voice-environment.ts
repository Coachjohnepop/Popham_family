export type VoiceInputMode = "web-speech" | "deepgram-live" | "server-stt";

export type VoiceEnvironment = {
  mode: VoiceInputMode;
  browserLabel: string;
  isBrave: boolean;
  isLikelyPrivate: boolean;
  /** Short how-to shown above the mic (Brave uses record → Done, not live captions). */
  instruction?: string;
};

function detectBraveFromUa(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Brave/i.test(navigator.userAgent);
}

function detectBrave(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> | boolean } };
  if (nav.brave?.isBrave) return true;
  return detectBraveFromUa();
}

function braveInstruction(): string {
  return "Tap the mic — words appear as you speak. Tap Done when finished.";
}

function environmentForBrave(isPrivate: boolean): VoiceEnvironment {
  return {
    mode: "deepgram-live",
    browserLabel: "Brave",
    isBrave: true,
    isLikelyPrivate: isPrivate,
    instruction: braveInstruction(),
  };
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
    if (isBrave) return environmentForBrave(isLikelyPrivate);
    return {
      mode: "deepgram-live",
      browserLabel,
      isBrave,
      isLikelyPrivate,
      instruction: braveInstruction(),
    };
  }

  return {
    mode: "web-speech",
    browserLabel,
    isBrave,
    isLikelyPrivate,
  };
}

/**
 * Brave often omits "Brave" from the user agent. Confirm via navigator.brave before
 * choosing live captions vs record-and-transcribe.
 */
export async function resolveVoiceEnvironment(): Promise<VoiceEnvironment> {
  const sync = getVoiceEnvironment();
  if (sync.isBrave) return sync;

  if (typeof navigator === "undefined") return sync;

  const nav = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> | boolean } };
  if (!nav.brave?.isBrave) return sync;

  try {
    const isBrave = await Promise.resolve(nav.brave.isBrave());
    if (isBrave) return environmentForBrave(detectLikelyPrivate());
  } catch {
    /* fall through */
  }

  return sync;
}

export function shouldFallbackToServerStt(errorCode: string): boolean {
  return errorCode === "network" || errorCode === "service-not-allowed";
}