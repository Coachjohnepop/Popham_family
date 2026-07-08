"use client";

import { useEffect, useRef, useState } from "react";
import {
  getOverviewIntro,
  getOverviewSummary,
  OVERVIEW_DEPTHS,
  type OverviewDepth,
} from "@/lib/winifred-overview";
import { speakText, type SpeakController, type SpeakState } from "@/lib/speak-text";

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

export default function StoryOverviewSummaries() {
  const [activeDepth, setActiveDepth] = useState<OverviewDepth | null>(null);
  const [speechState, setSpeechState] = useState<SpeakState>("idle");
  const controllerRef = useRef<SpeakController | null>(null);

  function stopReading() {
    controllerRef.current?.stop();
    controllerRef.current = null;
    setSpeechState("idle");
    setActiveDepth(null);
  }

  async function playSummary(depth: OverviewDepth) {
    if (activeDepth === depth && (speechState === "speaking" || speechState === "loading")) {
      stopReading();
      return;
    }

    controllerRef.current?.stop();
    setActiveDepth(depth);
    setSpeechState("loading");

    const summary = getOverviewSummary(depth);
    const script = `${getOverviewIntro(depth)}${summary.spoken}`;

    const controller = await speakText(script, {
      onLoading: () => setSpeechState("loading"),
      onSpeaking: () => setSpeechState("speaking"),
      onPaused: () => setSpeechState("paused"),
      onIdle: () => {
        setSpeechState("idle");
        setActiveDepth(null);
      },
    });

    controllerRef.current = controller;
  }

  useEffect(() => () => stopReading(), []);

  return (
    <div className="mt-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
        Hear the overview
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
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
        <button
          type="button"
          onClick={() => {
            controllerRef.current?.resume();
            setSpeechState("speaking");
          }}
          className="mt-2 rounded-full bg-[#efe4d2] px-3 py-1.5 text-xs font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
        >
          Resume
        </button>
      )}
    </div>
  );
}