"use client";

import { useMemo } from "react";
import {
  buildTimelineMarkers,
  buildTimelineTicks,
  formatTimelineYear,
  getMarkerColor,
  getMarkerLabel,
  markerOffsetTop,
  topicMarkerOffsetTop,
  type TimelineMarkerKind,
  type TimelineTick,
} from "@/lib/timeline";
import {
  TOPIC_MARKER_COLOR,
  TOPIC_MARKER_LABEL,
  type TopicTimelineMarker,
} from "@/lib/story-topics";
import type { TimelineEvent } from "@/lib/types";

type TimelineBarProps = {
  events: TimelineEvent[];
  topicMarkers?: TopicTimelineMarker[];
  showTopics?: boolean;
  activeTopicId?: string;
  min: number;
  max: number;
  year: number;
  onYearChange: (year: number) => void;
  onTopicSelect?: (topicId: string, year: number) => void;
};

function tickLabelClass(tick: TimelineTick): string {
  if (tick.grid === "century") {
    return "font-serif text-[11px] font-semibold tracking-wide text-[#2b2118]";
  }
  if (tick.grid === "half") {
    return "text-[10px] font-medium text-[#6f5c49]";
  }
  if (tick.isStart || tick.isEnd) {
    return "text-[10px] font-semibold text-[#8b5e34]";
  }
  return "text-[10px] text-[#6f5c49]";
}

function tickMarkClass(tick: TimelineTick): string {
  if (tick.grid === "century") {
    return "h-3 w-px bg-[#8b5e34]";
  }
  if (tick.grid === "half") {
    return "h-2 w-px bg-[#c9b89e]";
  }
  return "h-2 w-px bg-[#8b5e34]/50";
}

export default function TimelineBar({
  events,
  topicMarkers = [],
  showTopics = true,
  activeTopicId,
  min,
  max,
  year,
  onYearChange,
  onTopicSelect,
}: TimelineBarProps) {
  const markers = useMemo(() => buildTimelineMarkers(events, min, max), [events, min, max]);
  const ticks = useMemo(() => buildTimelineTicks(min, max), [min, max]);
  const visibleTopicMarkers = showTopics ? topicMarkers : [];

  return (
    <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-5">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
        <span>Timeline</span>
        <span>{year}</span>
      </div>

      <div className="relative px-1 pt-9 pb-7">
        <div
          className="pointer-events-none absolute inset-x-1 top-9 h-1.5 rounded-full bg-[#e2d4bf]"
          aria-hidden
        />

        {ticks.map((tick) => {
          const isEdgeStart = tick.year === min;
          const isEdgeEnd = tick.year === max && !isEdgeStart;

          return (
            <div
              key={`tick-${tick.year}`}
              className="pointer-events-none absolute top-9 z-[5] flex flex-col items-center"
              style={{
                left: `calc(${tick.left}% + 4px)`,
                transform: isEdgeStart
                  ? "translateX(0)"
                  : isEdgeEnd
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
              }}
              aria-hidden
            >
              <span className={tickMarkClass(tick)} />
            </div>
          );
        })}

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

        {visibleTopicMarkers.map((marker) => {
          const isActive = marker.topicId === activeTopicId;
          const color = TOPIC_MARKER_COLOR;

          return (
            <button
              key={`topic-${marker.topicId}`}
              type="button"
              title={`${marker.year} · ${TOPIC_MARKER_LABEL}: ${marker.title}`}
              aria-label={`${marker.year}, ${TOPIC_MARKER_LABEL}: ${marker.title}`}
              onClick={() => {
                onYearChange(marker.year);
                onTopicSelect?.(marker.topicId, marker.year);
              }}
              className="absolute z-20 -translate-x-1/2 rounded-sm border-2 border-[#fffaf2] transition hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669]/50"
              style={{
                left: `calc(${marker.left}% + 4px)`,
                top: `${topicMarkerOffsetTop()}px`,
                width: isActive ? 12 : 9,
                height: isActive ? 12 : 9,
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

        <div className="pointer-events-none absolute inset-x-1 top-[calc(2.25rem+0.75rem)] h-5">
          {ticks.map((tick) => {
            const isEdgeStart = tick.year === min;
            const isEdgeEnd = tick.year === max && !isEdgeStart;

            return (
              <span
                key={`label-${tick.year}`}
                className={`absolute whitespace-nowrap tabular-nums ${tickLabelClass(tick)}`}
                style={{
                  left: `calc(${tick.left}% + 4px)`,
                  transform: isEdgeStart
                    ? "translateX(0)"
                    : isEdgeEnd
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
                }}
              >
                {formatTimelineYear(tick.year)}
              </span>
            );
          })}
        </div>
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
        {showTopics && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm border border-[#fffaf2]"
              style={{ backgroundColor: TOPIC_MARKER_COLOR }}
            />
            {TOPIC_MARKER_LABEL}
          </span>
        )}
      </div>
    </div>
  );
}