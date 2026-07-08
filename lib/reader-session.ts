export type ReaderSession = {
  readerName: string;
  onboardingComplete: boolean;
  lastChapterId?: string;
  lastPath?: string;
  lastVisitedAt?: string;
};

const STORAGE_KEY = "wcft-reader-session";

export function loadReaderSession(): ReaderSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReaderSession;
  } catch {
    return null;
  }
}

export function saveReaderSession(session: ReaderSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function updateReaderSession(patch: Partial<ReaderSession>): ReaderSession {
  const current = loadReaderSession() ?? {
    readerName: "",
    onboardingComplete: false,
  };
  const next = { ...current, ...patch };
  saveReaderSession(next);
  return next;
}

export function clearReaderSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}