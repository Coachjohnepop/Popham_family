"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  DEFAULT_STORY_VOICE_ID,
  loadStoredStoryVoiceId,
  loadVoiceDialCoachSeen,
  saveStoredStoryVoiceId,
  saveVoiceDialCoachSeen,
  STORY_VOICES,
  type StoryVoice,
  VOICE_PREVIEW_LINE,
} from "@/lib/story-voices";
import { configureTtsPlayback } from "@/lib/tts-config";

/** Angles for 3 voices around the dial (degrees; SVG 0 = east, -90 = top). */
const DIAL_ANGLES = [-90, 30, 150] as const;

type NarratorVoiceDialProps = {
  /** Compact for landing; full for story home. */
  variant?: "story" | "landing";
  /** Play a short sample when the dial changes. */
  previewOnSelect?: boolean;
  className?: string;
};

export default function NarratorVoiceDial({
  variant = "story",
  previewOnSelect = true,
  className = "",
}: NarratorVoiceDialProps) {
  const labelId = useId();
  const [voiceId, setVoiceId] = useState(DEFAULT_STORY_VOICE_ID);
  const [mounted, setMounted] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    setVoiceId(loadStoredStoryVoiceId());
    setShowCoach(!loadVoiceDialCoachSeen());
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (audioEl) {
        audioEl.pause();
      }
    };
  }, [audioEl]);

  const dismissCoach = useCallback(() => {
    setShowCoach(false);
    saveVoiceDialCoachSeen();
  }, []);

  const stopPreview = useCallback(() => {
    if (audioEl) {
      audioEl.pause();
      setAudioEl(null);
    }
    setPreviewing(false);
  }, [audioEl]);

  const playPreview = useCallback(
    async (id: string) => {
      stopPreview();
      setPreviewing(true);
      try {
        const res = await fetch("/api/read-aloud", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: VOICE_PREVIEW_LINE, voiceId: id }),
        });
        if (!res.ok) throw new Error(`preview ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        configureTtsPlayback(audio);
        setAudioEl(audio);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setAudioEl(null);
          setPreviewing(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setAudioEl(null);
          setPreviewing(false);
        };
        await audio.play();
      } catch {
        setPreviewing(false);
      }
    },
    [stopPreview],
  );

  const selectVoice = useCallback(
    (voice: StoryVoice) => {
      setVoiceId(voice.id);
      saveStoredStoryVoiceId(voice.id);
      dismissCoach();
      if (previewOnSelect) {
        void playPreview(voice.id);
      }
      window.dispatchEvent(
        new CustomEvent("coss-narrator-voice", { detail: { voiceId: voice.id } }),
      );
    },
    [dismissCoach, playPreview, previewOnSelect],
  );

  const selected =
    STORY_VOICES.find((v) => v.id === voiceId) ?? STORY_VOICES[0]!;
  const selectedIndex = Math.max(
    0,
    STORY_VOICES.findIndex((v) => v.id === selected.id),
  );
  const needleAngle = DIAL_ANGLES[selectedIndex] ?? -90;

  const size = variant === "landing" ? 168 : 200;
  const radius = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;

  const shellClass =
    "relative rounded-3xl border border-[#e2d4bf] bg-white p-5 shadow-sm sm:p-6 " +
    className;
  const skeletonClass =
    "rounded-3xl border border-[#e2d4bf] bg-white p-4 shadow-sm opacity-80 " +
    className;

  if (!mounted) {
    return (
      <div className={skeletonClass} aria-hidden="true">
        <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-full bg-[#efe4d2]" />
      </div>
    );
  }

  return (
    <section className={shellClass} aria-labelledby={labelId} data-voice-dial="true">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8b5e34]">
          Narrator voice
        </p>
        <h2
          id={labelId}
          className="font-serif text-xl font-semibold text-[#2b2118] sm:text-2xl"
        >
          Who reads the story?
        </h2>
        <p className="max-w-sm text-sm text-[#6f5c49]">
          Turn the dial - {selected.label} ({selected.shortLabel.toLowerCase()}) is
          selected.
          {previewing ? " Playing a short sample..." : ""}
        </p>
      </div>

      <div className="relative mx-auto mt-5 flex w-fit items-start justify-center">
        {showCoach ? (
          <div
            className="pointer-events-none absolute -right-2 top-6 z-20 flex flex-col items-center sm:-right-8 sm:top-10"
            aria-hidden="true"
          >
            <div className="voice-coach-bubble mb-1 max-w-[9.5rem] rounded-2xl bg-[#8b5e34] px-3 py-2 text-center text-[11px] font-semibold leading-snug text-white shadow-lg">
              Tap a voice on the dial
            </div>
            <span className="voice-coach-finger text-4xl drop-shadow-md" role="img">
              {"\u{1F446}"}
            </span>
          </div>
        ) : null}

        <div
          className="relative shrink-0"
          style={{ width: size, height: size }}
          role="radiogroup"
          aria-label="Story narrator voice"
        >
          <div
            className="absolute inset-0 rounded-full border-[6px] border-[#d4c0a0] shadow-inner"
            style={{
              background:
                "radial-gradient(circle at 40% 35%, #fffaf2 0%, #f0e4d0 55%, #e2d0b4 100%)",
              boxShadow:
                "inset 0 2px 8px rgba(43,33,24,0.12), 0 8px 20px rgba(43,33,24,0.12)",
            }}
          />

          <svg
            className="absolute inset-0"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            aria-hidden="true"
          >
            {STORY_VOICES.map((voice, i) => {
              const angle = DIAL_ANGLES[i] ?? -90;
              const start = (angle - 50) * (Math.PI / 180);
              const end = (angle + 50) * (Math.PI / 180);
              const rOuter = radius - 4;
              const rInner = radius * 0.42;
              const active = voice.id === selected.id;
              const path = annularSector(cx, cy, rInner, rOuter, start, end);
              return (
                <path
                  key={voice.id}
                  d={path}
                  fill={active ? "rgba(139,94,52,0.35)" : "rgba(139,94,52,0.08)"}
                  stroke={active ? "#8b5e34" : "rgba(139,94,52,0.25)"}
                  strokeWidth={active ? 2 : 1}
                  className="transition-colors duration-200"
                />
              );
            })}
            {DIAL_ANGLES.map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = cx + Math.cos(rad) * (radius - 18);
              const y1 = cy + Math.sin(rad) * (radius - 18);
              const x2 = cx + Math.cos(rad) * (radius - 6);
              const y2 = cy + Math.sin(rad) * (radius - 6);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#8b5e34"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              );
            })}
          </svg>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 origin-bottom transition-transform duration-500 ease-out"
            style={{
              width: 4,
              height: radius * 0.52,
              marginLeft: -2,
              marginTop: -radius * 0.52,
              transform: `rotate(${needleAngle + 90}deg)`,
              background: "linear-gradient(to top, #5c3d22, #8b5e34)",
              borderRadius: 2,
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }}
          >
            <div className="absolute -left-1.5 -top-1.5 h-4 w-4 rounded-full bg-[#8b5e34] ring-2 ring-[#fffaf2]" />
          </div>

          <div className="absolute left-1/2 top-1/2 z-10 flex h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-[#c8b08d] bg-[#fffaf2] text-center shadow-md">
            <span className="font-serif text-sm font-semibold leading-tight text-[#2b2118] sm:text-base">
              {selected.label}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              {selected.shortLabel}
            </span>
          </div>

          {STORY_VOICES.map((voice, i) => {
            const deg = DIAL_ANGLES[i] ?? -90;
            const rad = (deg * Math.PI) / 180;
            const labelR = radius * 0.72;
            const x = cx + Math.cos(rad) * labelR;
            const y = cy + Math.sin(rad) * labelR;
            const active = voice.id === selected.id;
            const btnClass = active
              ? "border-[#8b5e34] bg-[#8b5e34] text-white shadow-md scale-105"
              : "border-[#d9cbb6] bg-[#fffaf2] text-[#5c4a38] hover:border-[#8b5e34] hover:bg-[#efe4d2]";
            return (
              <button
                key={voice.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${voice.label}, ${voice.gender} narrator. ${voice.blurb}`}
                onClick={() => selectVoice(voice)}
                className={
                  "absolute z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5e34] " +
                  btnClass
                }
                style={{ left: x, top: y }}
              >
                <span className="text-[11px] font-bold leading-none">{voice.label}</span>
                <span
                  className={
                    "mt-0.5 text-[8px] font-semibold uppercase tracking-wide " +
                    (active ? "text-white" : "text-[#8b5e34]")
                  }
                >
                  {voice.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[#6f5c49]">{selected.blurb}</p>

      {showCoach ? (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={dismissCoach}
            className="text-xs font-medium text-[#8b5e34] underline-offset-2 hover:underline"
          >
            Got it - hide tip
          </button>
        </div>
      ) : null}

      {previewing ? (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={stopPreview}
            className="rounded-full bg-[#efe4d2] px-3 py-1 text-xs font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
          >
            Stop sample
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** SVG path for an annular sector (pie ring slice). Angles in radians, 0 = east. */
function annularSector(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  start: number,
  end: number,
): string {
  const large = end - start > Math.PI ? 1 : 0;
  const x0 = cx + Math.cos(start) * rOuter;
  const y0 = cy + Math.sin(start) * rOuter;
  const x1 = cx + Math.cos(end) * rOuter;
  const y1 = cy + Math.sin(end) * rOuter;
  const x2 = cx + Math.cos(end) * rInner;
  const y2 = cy + Math.sin(end) * rInner;
  const x3 = cx + Math.cos(start) * rInner;
  const y3 = cy + Math.sin(start) * rInner;
  return [
    `M ${x0} ${y0}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1}`,
    `L ${x2} ${y2}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3}`,
    "Z",
  ].join(" ");
}
