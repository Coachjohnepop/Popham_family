"use client";

import { usePathname } from "next/navigation";
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
  resetHomeEntry: () => void;
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReaderSession | null>(null);
  const [pinnedPerson, setPinnedPerson] = useState<TreePerson | null>(null);
  const [storyChapter, setStoryChapter] = useState<StorySection | null>(null);
  const [nextStoryChapter, setNextStoryChapter] = useState<StorySection | null>(null);
  const [homeEntryKey, setHomeEntryKey] = useState(0);

  const resetHomeEntry = useCallback(() => {
    setHomeEntryKey((key) => key + 1);
  }, []);

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
    const next = updateReaderSession({
      lastChapterId: chapterId,
      lastPath: path ?? `/story/${chapterId}`,
      lastVisitedAt: new Date().toISOString(),
    });
    setSession(next);
  }, []);

  const setAnswerDepth = useCallback((depth: AnswerDepth) => {
    const next = updateReaderSession({
      answerDepth: depth,
      preferShortAnswers: depth === "brief",
    });
    setSession(next);
  }, []);

  const value = useMemo(
    () => ({
      session,
      readerName: session?.readerName ?? "",
      setReaderName,
      completeOnboarding,
      saveProgress,
      answerDepth: session?.answerDepth ?? DEFAULT_ANSWER_DEPTH,
      setAnswerDepth,
      pinnedPerson,
      setPinnedPerson,
      speakEnabled: true,
      storyChapter,
      nextStoryChapter,
      setStoryChapterContext,
      homeEntryKey,
      resetHomeEntry,
    }),
    [
      session,
      setReaderName,
      completeOnboarding,
      saveProgress,
      setAnswerDepth,
      pinnedPerson,
      storyChapter,
      nextStoryChapter,
      setStoryChapterContext,
      homeEntryKey,
      resetHomeEntry,
    ],
  );

  return (
    <ReaderContext.Provider value={value}>
      <HomeEntryWatcher />
      {children}
    </ReaderContext.Provider>
  );
}

function HomeEntryWatcher() {
  const pathname = usePathname();
  const ctx = useContext(ReaderContext);

  useEffect(() => {
    if (pathname !== "/" || !ctx) return;
    ctx.resetHomeEntry();
    ctx.setStoryChapterContext(null, null);
  }, [pathname]);

  return null;
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