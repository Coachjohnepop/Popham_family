"use client";

import { useMemo } from "react";
import {
  buildTimelineMarkers,
  getMarkerColor,
  getMarkerLabel,
  markerOffsetTop,
  type TimelineMarkerKind,
} from "@/lib/timeline";
import type { TimelineEvent } from "@/lib/types";

type TimelineBarProps = {
  events: TimelineEvent[];
  min: number;
  max: number;
  year: number;
  onYearChange: (year: number) => void;
};

export default function TimelineBar({ events, min, max, year, onYearChange }: TimelineBarProps) {
  const markers = useMemo(() => buildTimelineMarkers(events, min, max), [events, min, max]);

  return (
    <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-5">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
        <span>Timeline</span>
        <span>{year}</span>
      </div>

      <div className="relative px-1 pt-9 pb-1">
        <div
          className="pointer-events-none absolute inset-x-1 top-9 h-1.5 rounded-full bg-[#e2d4bf]"
          aria-hidden
        />

        {markers.map((marker) => {
          const isActive = marker.year === year;
          const color = getMarkerColor(marker.kind);

          return (
            <button
              key={`${marker.year}-${marker.kind}`}
              type="button"
              title={`${marker.year} · ${getMarkerLabel(marker.kind)}: ${marker.title}`}
              aria-label={`${marker.year}, ${getMarkerLabel(marker.kind)}: ${marker.title}`}
              onClick={() => onYearChange(marker.year)}
              className="absolute z-20 -translate-x-1/2 rounded-full border-2 border-[#fffaf2] transition hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5e34]/50"
              style={{
                left: `calc(${marker.left}% + 4px)`,
                top: `${markerOffsetTop(marker.kind)}px`,
                width: isActive ? 11 : 8,
                height: isActive ? 11 : 8,
                backgroundColor: color,
                boxShadow: isActive ? `0 0 0 2px ${color}55` : undefined,
              }}
            />
          );
        })}

        <input
          type="range"
          min={min}
          max={max}
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="relative z-10 w-full accent-[#8b5e34]"
          aria-label="Timeline year"
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-[#6f5c49]">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[#6f5c49]">
        {(["history", "family", "both"] as TimelineMarkerKind[]).map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-[#fffaf2]"
              style={{ backgroundColor: getMarkerColor(kind) }}
            />
            {getMarkerLabel(kind)}
          </span>
        ))}
      </div>
    </div>
  );
}