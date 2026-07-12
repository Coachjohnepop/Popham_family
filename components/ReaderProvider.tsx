"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AnswerDepth } from "@/lib/event-briefs";
import {
  DEFAULT_ANSWER_DEPTH,
  loadReaderSession,
  markChapterVisited,
  moveFavoriteChapter,
  setFavoriteChapterOrder,
  toggleFavoriteChapter,
  updateReaderSession,
  type ReaderSession,
} from "@/lib/reader-session";
import type { TreePerson } from "@/lib/family-tree";
import type { StorySection } from "@/lib/types";

type ReaderContextValue = {
  session: ReaderSession | null;
  readerName: string;
  setReaderName: (name: string) => void;
  completeOnboarding: () => void;
  saveProgress: (chapterId: string, path?: string) => void;
  visitedChapterIds: string[];
  favoriteChapterIds: string[];
  isVisited: (chapterId: string) => boolean;
  isFavorite: (chapterId: string) => boolean;
  toggleFavorite: (chapterId: string) => void;
  moveFavorite: (chapterId: string, direction: "up" | "down") => void;
  setFavoriteOrder: (ids: string[]) => void;
  answerDepth: AnswerDepth;
  setAnswerDepth: (depth: AnswerDepth) => void;
  pinnedPerson: TreePerson | null;
  setPinnedPerson: (person: TreePerson | null) => void;
  speakEnabled: boolean;
  storyChapter: StorySection | null;
  nextStoryChapter: StorySection | null;
  setStoryChapterContext: (
    chapter: StorySection | null,
    next?: StorySection | null,
  ) => void;
  homeEntryKey: number;
  resetToLanding: () => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReaderSession | null>(null);
  const [pinnedPerson, setPinnedPerson] = useState<TreePerson | null>(null);
  const [storyChapter, setStoryChapter] = useState<StorySection | null>(null);
  const [nextStoryChapter, setNextStoryChapter] = useState<StorySection | null>(null);
  const [homeEntryKey, setHomeEntryKey] = useState(0);

  const setStoryChapterContext = useCallback(
    (chapter: StorySection | null, next: StorySection | null = null) => {
      setStoryChapter(chapter);
      setNextStoryChapter(next);
    },
    [],
  );

  useEffect(() => {
    setSession(loadReaderSession());
  }, []);

  const setReaderName = useCallback((name: string) => {
    const next = updateReaderSession({ readerName: name.trim() });
    setSession(next);
  }, []);

  const completeOnboarding = useCallback(() => {
    const next = updateReaderSession({ onboardingComplete: true });
    setSession(next);
  }, []);

  const saveProgress = useCallback((chapterId: string, path?: string) => {
    const next = markChapterVisited(chapterId, path);
    setSession(next);
  }, []);

  const toggleFavorite = useCallback((chapterId: string) => {
    const next = toggleFavoriteChapter(chapterId);
    setSession(next);
  }, []);

  const moveFavorite = useCallback((chapterId: string, direction: "up" | "down") => {
    const next = moveFavoriteChapter(chapterId, direction);
    setSession(next);
  }, []);

  const setFavoriteOrder = useCallback((ids: string[]) => {
    const next = setFavoriteChapterOrder(ids);
    setSession(next);
  }, []);

  const visitedChapterIds = session?.visitedChapterIds ?? [];
  const favoriteChapterIds = session?.favoriteChapterIds ?? [];

  const isVisited = useCallback(
    (chapterId: string) => visitedChapterIds.includes(chapterId),
    [visitedChapterIds],
  );

  const isFavorite = useCallback(
    (chapterId: string) => favoriteChapterIds.includes(chapterId),
    [favoriteChapterIds],
  );

  const setAnswerDepth = useCallback((depth: AnswerDepth) => {
    const next = updateReaderSession({
      answerDepth: depth,
      preferShortAnswers: depth === "brief",
    });
    setSession(next);
  }, []);

  const resetToLanding = useCallback(() => {
    setStoryChapter(null);
    setNextStoryChapter(null);
    setPinnedPerson(null);
    setHomeEntryKey((key) => key + 1);
  }, []);

  const value = useMemo(
    () => ({
      session,
      readerName: session?.readerName ?? "",
      setReaderName,
      completeOnboarding,
      saveProgress,
      visitedChapterIds,
      favoriteChapterIds,
      isVisited,
      isFavorite,
      toggleFavorite,
      moveFavorite,
      setFavoriteOrder,
      answerDepth: session?.answerDepth ?? DEFAULT_ANSWER_DEPTH,
      setAnswerDepth,
      pinnedPerson,
      setPinnedPerson,
      speakEnabled: true,
      storyChapter,
      nextStoryChapter,
      setStoryChapterContext,
      homeEntryKey,
      resetToLanding,
    }),
    [
      session,
      setReaderName,
      completeOnboarding,
      saveProgress,
      visitedChapterIds,
      favoriteChapterIds,
      isVisited,
      isFavorite,
      toggleFavorite,
      moveFavorite,
      setFavoriteOrder,
      setAnswerDepth,
      pinnedPerson,
      storyChapter,
      nextStoryChapter,
      setStoryChapterContext,
      homeEntryKey,
      resetToLanding,
    ],
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader() {
  const ctx = useContext(ReaderContext);
  if (!ctx) {
    throw new Error("useReader must be used within ReaderProvider");
  }
  return ctx;
}

export function useOptionalReader() {
  return useContext(ReaderContext);
}
