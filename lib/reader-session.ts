import type { AnswerDepth } from "@/lib/event-briefs";

export type ReaderSession = {
  readerName: string;
  onboardingComplete: boolean;
  lastChapterId?: string;
  lastPath?: string;
  lastVisitedAt?: string;
  answerDepth?: AnswerDepth;
  preferShortAnswers?: boolean;
  /** Chapters the reader has opened (unique, order = first visit order). */
  visitedChapterIds?: string[];
  /** Pinned favorites — order is the reader's custom story path. */
  favoriteChapterIds?: string[];
};

export const DEFAULT_ANSWER_DEPTH: AnswerDepth = "standard";

const STORAGE_KEY = "wcft-reader-session";

function normalizeSession(raw: ReaderSession): ReaderSession {
  return {
    ...raw,
    visitedChapterIds: Array.isArray(raw.visitedChapterIds)
      ? [...new Set(raw.visitedChapterIds.filter(Boolean))]
      : [],
    favoriteChapterIds: Array.isArray(raw.favoriteChapterIds)
      ? [...new Set(raw.favoriteChapterIds.filter(Boolean))]
      : [],
  };
}

export function loadReaderSession(): ReaderSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw) as ReaderSession);
  } catch {
    return null;
  }
}

export function saveReaderSession(session: ReaderSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSession(session)));
}

export function updateReaderSession(patch: Partial<ReaderSession>): ReaderSession {
  const current = loadReaderSession() ?? {
    readerName: "",
    onboardingComplete: false,
    visitedChapterIds: [],
    favoriteChapterIds: [],
  };
  const next = normalizeSession({ ...current, ...patch });
  saveReaderSession(next);
  return next;
}

export function clearReaderSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function markChapterVisited(
  chapterId: string,
  path?: string,
): ReaderSession {
  const current = loadReaderSession() ?? {
    readerName: "",
    onboardingComplete: false,
    visitedChapterIds: [],
    favoriteChapterIds: [],
  };
  const visited = current.visitedChapterIds ?? [];
  const nextVisited = visited.includes(chapterId)
    ? visited
    : [...visited, chapterId];
  return updateReaderSession({
    lastChapterId: chapterId,
    lastPath: path ?? `/story/${chapterId}`,
    lastVisitedAt: new Date().toISOString(),
    visitedChapterIds: nextVisited,
  });
}

export function toggleFavoriteChapter(chapterId: string): ReaderSession {
  const current = loadReaderSession() ?? {
    readerName: "",
    onboardingComplete: false,
    visitedChapterIds: [],
    favoriteChapterIds: [],
  };
  const favs = current.favoriteChapterIds ?? [];
  const next = favs.includes(chapterId)
    ? favs.filter((id) => id !== chapterId)
    : [...favs, chapterId];
  return updateReaderSession({ favoriteChapterIds: next });
}

export function setFavoriteChapterOrder(ids: string[]): ReaderSession {
  return updateReaderSession({
    favoriteChapterIds: [...new Set(ids.filter(Boolean))],
  });
}

export function moveFavoriteChapter(
  chapterId: string,
  direction: "up" | "down",
): ReaderSession {
  const current = loadReaderSession();
  const favs = [...(current?.favoriteChapterIds ?? [])];
  const index = favs.indexOf(chapterId);
  if (index < 0) return current ?? updateReaderSession({});
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= favs.length) {
    return current ?? updateReaderSession({});
  }
  [favs[index], favs[swap]] = [favs[swap]!, favs[index]!];
  return setFavoriteChapterOrder(favs);
}
