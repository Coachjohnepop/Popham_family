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
  updateReaderSession,
  type ReaderSession,
} from "@/lib/reader-session";
import type { TreePerson } from "@/lib/family-tree";

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
};

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReaderSession | null>(null);
  const [pinnedPerson, setPinnedPerson] = useState<TreePerson | null>(null);

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
    }),
    [session, setReaderName, completeOnboarding, saveProgress, setAnswerDepth, pinnedPerson],
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