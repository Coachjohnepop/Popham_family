"use client";

import { useCallback, useEffect, useId, useState } from "react";
import GuidedFingerCoach from "@/components/GuidedFingerCoach";
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

  // Half the previous dial footprint (was 200 / 168)
  const size = variant === "landing" ? 84 : 100;
  const radius = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  const shellClass =
    "relative overflow-visible rounded-2xl border border-[#e2d4bf] bg-white p-3 shadow-sm sm:p-4 " +
    className;
  const skeletonClass =
    "rounded-2xl border border-[#e2d4bf] bg-white p-3 shadow-sm opacity-80 " +
    className;

  if (!mounted) {
    return (
      <div className={skeletonClass} aria-hidden="true">
        <div className="mx-auto h-[100px] w-[100px] animate-pulse rounded-full bg-[#efe4d2]" />
      </div>
    );
  }

  return (
    <section className={shellClass} aria-labelledby={labelId} data-voice-dial="true">
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          Narrator voice
        </p>
        <h2
          id={labelId}
          className="font-serif text-base font-semibold text-[#2b2118] sm:text-lg"
        >
          Who reads the story?
        </h2>
        <p className="max-w-xs text-[11px] text-[#6f5c49]">
          {selected.label} ({selected.shortLabel.toLowerCase()})
          {previewing ? " · sample…" : ""}
        </p>
      </div>

      <div className="relative mx-auto mt-3 mb-2 flex min-h-[7.5rem] w-fit items-center justify-center overflow-visible px-10 sm:px-14">
        {showCoach ? (
          <GuidedFingerCoach
            label="Tap a voice on the dial"
            placement="right"
            onDismiss={dismissCoach}
          />
        ) : null}

        <div
          className="relative shrink-0 overflow-visible"
          style={{ width: size, height: size }}
          role="radiogroup"
          aria-label="Story narrator voice"
        >
          <div
            className="absolute inset-0 rounded-full border-[3px] border-[#d4c0a0] shadow-inner"
            style={{
              background:
                "radial-gradient(circle at 40% 35%, #fffaf2 0%, #f0e4d0 55%, #e2d0b4 100%)",
              boxShadow:
                "inset 0 1px 4px rgba(43,33,24,0.12), 0 4px 10px rgba(43,33,24,0.1)",
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
              const rOuter = radius - 2;
              const rInner = radius * 0.42;
              const active = voice.id === selected.id;
              const path = annularSector(cx, cy, rInner, rOuter, start, end);
              return (
                <path
                  key={voice.id}
                  d={path}
                  fill={active ? "rgba(139,94,52,0.35)" : "rgba(139,94,52,0.08)"}
                  stroke={active ? "#8b5e34" : "rgba(139,94,52,0.25)"}
                  strokeWidth={active ? 1.5 : 0.75}
                  className="transition-colors duration-200"
                />
              );
            })}
            {DIAL_ANGLES.map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = cx + Math.cos(rad) * (radius - 9);
              const y1 = cy + Math.sin(rad) * (radius - 9);
              const x2 = cx + Math.cos(rad) * (radius - 3);
              const y2 = cy + Math.sin(rad) * (radius - 3);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#8b5e34"
                  strokeWidth={1.25}
                  strokeLinecap="round"
                  opacity={0.5}
                />
              );
            })}
          </svg>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 origin-bottom transition-transform duration-500 ease-out"
            style={{
              width: 2,
              height: radius * 0.52,
              marginLeft: -1,
              marginTop: -radius * 0.52,
              transform: `rotate(${needleAngle + 90}deg)`,
              background: "linear-gradient(to top, #5c3d22, #8b5e34)",
              borderRadius: 1,
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          >
            <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[#8b5e34] ring-1 ring-[#fffaf2]" />
          </div>

          <div className="absolute left-1/2 top-1/2 z-10 flex h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#c8b08d] bg-[#fffaf2] text-center shadow-sm">
            <span className="font-serif text-[9px] font-semibold leading-tight text-[#2b2118] sm:text-[10px]">
              {selected.label}
            </span>
            <span className="text-[7px] font-semibold uppercase tracking-wider text-[#8b5e34]">
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
              ? "border-[#8b5e34] bg-[#8b5e34] text-white shadow-sm scale-105"
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
                  "absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8b5e34] " +
                  btnClass
                }
                style={{ left: x, top: y }}
              >
                <span className="text-[7px] font-bold leading-none">{voice.label.slice(0, 1)}</span>
                <span
                  className={
                    "text-[6px] font-semibold uppercase leading-none " +
                    (active ? "text-white" : "text-[#8b5e34]")
                  }
                >
                  {voice.shortLabel.slice(0, 1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] text-[#6f5c49]">{selected.blurb}</p>

      {previewing ? (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            onClick={stopPreview}
            className="rounded-full bg-[#efe4d2] px-2.5 py-0.5 text-[10px] font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
          >
            Stop
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
