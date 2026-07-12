"use client";

import { useEffect, useRef, useState } from "react";
import GuidedFingerCoach from "@/components/GuidedFingerCoach";
import {
  getOverviewIntro,
  getOverviewSummary,
  OVERVIEW_DEPTHS,
  type OverviewDepth,
} from "@/lib/winifred-overview";
import { speakText, type SpeakController, type SpeakState } from "@/lib/speak-text";
import {
  DEFAULT_STORY_VOICE_ID,
  loadSummaryCoachSeen,
  saveSummaryCoachSeen,
} from "@/lib/story-voices";

const BUTTON_STYLES: Record<OverviewDepth, string> = {
  short: "bg-[#dbeafe] text-[#1e3a8a] ring-[#93c5fd] hover:bg-[#bfdbfe]",
  medium: "bg-[#ede9fe] text-[#5b21b6] ring-[#c4b5fd] hover:bg-[#ddd6fe]",
  full: "bg-[#dcfce7] text-[#166534] ring-[#86efac] hover:bg-[#bbf7d0]",
};

const ACTIVE_STYLES: Record<OverviewDepth, string> = {
  short: "bg-[#1e3a8a] text-white ring-[#1e3a8a]",
  medium: "bg-[#5b21b6] text-white ring-[#5b21b6]",
  full: "bg-[#166534] text-white ring-[#166534]",
};

type StoryOverviewSummariesProps = {
  variant?: "landing" | "compact";
};

export default function StoryOverviewSummaries({
  variant = "compact",
}: StoryOverviewSummariesProps) {
  const [activeDepth, setActiveDepth] = useState<OverviewDepth | null>(null);
  const [speechState, setSpeechState] = useState<SpeakState>("idle");
  const [showCoach, setShowCoach] = useState(false);
  const [mounted, setMounted] = useState(false);
  const controllerRef = useRef<SpeakController | null>(null);

  useEffect(() => {
    setMounted(true);
    setShowCoach(!loadSummaryCoachSeen());
  }, []);

  function dismissCoach() {
    setShowCoach(false);
    saveSummaryCoachSeen();
  }

  function stopReading() {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setSpeechState("idle");
    setActiveDepth(null);
  }

  async function playSummary(depth: OverviewDepth) {
    dismissCoach();
    if (activeDepth === depth && (speechState === "speaking" || speechState === "loading")) {
      stopReading();
      return;
    }

    controllerRef.current?.stop();
    setActiveDepth(depth);
    setSpeechState("loading");

    const summary = getOverviewSummary(depth);
    const script = `${getOverviewIntro(depth)}${summary.spoken}`;

    // Always use default storyteller voice (Edmund) for overview summaries
    const controller = await speakText(
      script,
      {
        onLoading: () => setSpeechState("loading"),
        onSpeaking: () => setSpeechState("speaking"),
        onPaused: () => setSpeechState("paused"),
        onIdle: () => {
          setSpeechState("idle");
          setActiveDepth(null);
        },
      },
      { voiceId: DEFAULT_STORY_VOICE_ID },
    );

    controllerRef.current = controller;
  }

  useEffect(() => () => stopReading(), []);

  const isLanding = variant === "landing";

  return (
    <section
      className={
        isLanding
          ? "relative w-full overflow-visible rounded-3xl border border-[#e2d4bf] bg-white px-5 py-6 shadow-sm sm:px-8"
          : "relative mt-4 overflow-visible"
      }
      aria-labelledby={isLanding ? "document-overview-heading" : undefined}
    >
      {isLanding ? (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Full document overview
          </p>
          <h2
            id="document-overview-heading"
            className="mt-2 text-center font-serif text-xl font-semibold text-[#2b2118] sm:text-2xl"
          >
            Summary of the family story
          </h2>
        </>
      ) : (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
          Summary of the family story
        </p>
      )}

      <div
        className={`relative flex flex-wrap justify-center gap-2 overflow-visible ${
          isLanding ? "mt-5" : "mt-2"
        }`}
      >
        {mounted && showCoach ? (
          <GuidedFingerCoach
            label="Pick a summary length"
            placement="above"
            onDismiss={dismissCoach}
          />
        ) : null}

        {OVERVIEW_DEPTHS.map((depth) => {
          const summary = getOverviewSummary(depth);
          const isActive = activeDepth === depth;
          const isBusy = isActive && (speechState === "loading" || speechState === "speaking");

          return (
            <button
              key={depth}
              type="button"
              onClick={() => void playSummary(depth)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                isActive ? ACTIVE_STYLES[depth] : BUTTON_STYLES[depth]
              }`}
              aria-pressed={isActive}
            >
              {isBusy
                ? speechState === "loading"
                  ? `Loading ${summary.label}…`
                  : `Stop ${summary.label}`
                : summary.label}
            </button>
          );
        })}
      </div>

      {activeDepth && speechState === "paused" && (
        <div className={isLanding ? "mt-3 text-center" : "mt-2"}>
          <button
            type="button"
            onClick={() => {
              controllerRef.current?.resume();
              setSpeechState("speaking");
            }}
            className="rounded-full bg-[#efe4d2] px-3 py-1.5 text-xs font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
          >
            Resume
          </button>
        </div>
      )}
    </section>
  );
}
