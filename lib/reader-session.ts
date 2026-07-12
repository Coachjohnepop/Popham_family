import type { AnswerDepth } from "@/lib/event-briefs";
import { subjectIdsForChapter } from "@/lib/subjects";

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
  /** High-level subjects covered (story topic ids). */
  coveredSubjectIds?: string[];
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
    coveredSubjectIds: Array.isArray(raw.coveredSubjectIds)
      ? [...new Set(raw.coveredSubjectIds.filter(Boolean))]
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
    coveredSubjectIds: [],
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
    coveredSubjectIds: [],
  };
  const visited = current.visitedChapterIds ?? [];
  const nextVisited = visited.includes(chapterId)
    ? visited
    : [...visited, chapterId];
  const covered = new Set(current.coveredSubjectIds ?? []);
  for (const subjectId of subjectIdsForChapter(chapterId)) {
    covered.add(subjectId);
  }
  return updateReaderSession({
    lastChapterId: chapterId,
    lastPath: path ?? `/story/${chapterId}`,
    lastVisitedAt: new Date().toISOString(),
    visitedChapterIds: nextVisited,
    coveredSubjectIds: [...covered],
  });
}

export function markSubjectCovered(subjectId: string): ReaderSession {
  const current = loadReaderSession() ?? {
    readerName: "",
    onboardingComplete: false,
    visitedChapterIds: [],
    favoriteChapterIds: [],
    coveredSubjectIds: [],
  };
  const covered = current.coveredSubjectIds ?? [];
  if (covered.includes(subjectId)) return current;
  return updateReaderSession({
    coveredSubjectIds: [...covered, subjectId],
  });
}

export function toggleSubjectCovered(subjectId: string): ReaderSession {
  const current = loadReaderSession() ?? {
    readerName: "",
    onboardingComplete: false,
    visitedChapterIds: [],
    favoriteChapterIds: [],
    coveredSubjectIds: [],
  };
  const covered = current.coveredSubjectIds ?? [];
  const next = covered.includes(subjectId)
    ? covered.filter((id) => id !== subjectId)
    : [...covered, subjectId];
  return updateReaderSession({ coveredSubjectIds: next });
}

export function toggleFavoriteChapter(chapterId: string): ReaderSession {
  const current = loadReaderSession() ?? {
    readerName: "",
    onboardingComplete: false,
    visitedChapterIds: [],
    favoriteChapterIds: [],
    coveredSubjectIds: [],
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
