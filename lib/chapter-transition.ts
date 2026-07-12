/** Session flag: auto-start narrator after a chapter (or page) transition. */
const AUTO_NARRATE_KEY = "coss-auto-narrate";

export function setAutoNarrate(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.sessionStorage.setItem(AUTO_NARRATE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(AUTO_NARRATE_KEY);
    }
  } catch {
    /* private mode */
  }
}

/** Read and clear the auto-narrate flag (call once on mount). */
export function consumeAutoNarrate(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const on = window.sessionStorage.getItem(AUTO_NARRATE_KEY) === "1";
    window.sessionStorage.removeItem(AUTO_NARRATE_KEY);
    return on;
  } catch {
    return false;
  }
}

export const CHAPTER_FADE_MS = 400;
