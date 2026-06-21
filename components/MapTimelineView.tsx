"use client";

import { useMemo, useState } from "react";
import { getTimelineEvents, getYearBounds } from "@/lib/data";
import type { TimelineEvent } from "@/lib/types";

const events = getTimelineEvents();
const bounds = getYearBounds(events);

function projectPoint(event: TimelineEvent, width: number, height: number, scope: "us" | "world") {
  const filtered = events.filter((e) => e.location.scope === scope || scope === "world");
  const minLat = Math.min(...filtered.map((e) => e.location.lat));
  const maxLat = Math.max(...filtered.map((e) => e.location.lat));
  const minLng = Math.min(...filtered.map((e) => e.location.lng));
  const maxLng = Math.max(...filtered.map((e) => e.location.lng));
  const x = ((event.location.lng - minLng) / (maxLng - minLng || 1)) * (width - 40) + 20;
  const y = height - (((event.location.lat - minLat) / (maxLat - minLat || 1)) * (height - 40) + 20);
  return { x, y };
}

export default function MapTimelineView() {
  const [year, setYear] = useState(bounds.min);
  const [scope, setScope] = useState<"us" | "world">("us");

  const visible = useMemo(() => {
    return events.filter((event) => {
      const inScope = scope === "world" || event.location.scope === "us";
      return inScope && event.year <= year;
    });
  }, [year, scope]);

  const active = useMemo(() => {
    const scoped = events.filter((e) => scope === "world" || e.location.scope === "us");
    return [...scoped].reverse().find((e) => e.year <= year) ?? scoped[0];
  }, [year, scope]);

  const width = 900;
  const height = 480;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Interactive map
          </p>
          <p className="text-sm text-[#6f5c49]">
            Slide the timeline — highlighted circles show where history and family met.
          </p>
        </div>
        <div className="flex gap-2">
          {(["us", "world"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setScope(mode)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                scope === mode ? "bg-[#8b5e34] text-white" : "bg-[#efe4d2] text-[#5c4a38]"
              }`}
            >
              {mode === "us" ? "United States" : "World"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#e2d4bf] bg-[#dce9f7] shadow-sm">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
          <rect width={width} height={height} fill="#dce9f7" />
          <rect x="20" y="20" width={width - 40} height={height - 40} rx="24" fill="#c7dcf0" />
          <text x="36" y="52" className="fill-[#4d6480] text-[14px] font-semibold">
            {scope === "us" ? "United States focus" : "World view"} · {year}
          </text>

          {visible.map((event) => {
            const { x, y } = projectPoint(event, width, height, scope);
            const isActive = active?.id === event.id;
            return (
              <g key={event.id}>
                {isActive && (
                  <circle cx={x} cy={y} r="22" fill="#d97706" opacity="0.25">
                    <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0.12;0.35" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 9 : 6}
                  fill={isActive ? "#b45309" : "#8b5e34"}
                  stroke="#fffaf2"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {active && (
        <div className="rounded-2xl border border-[#e2d4bf] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            {active.year} · {active.location.name}
          </div>
          <h3 className="mt-1 font-serif text-2xl font-semibold">{active.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5c4a38]">{active.summary}</p>
        </div>
      )}

      <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-5">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
          <span>Timeline</span>
          <span>{year}</span>
        </div>
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full accent-[#8b5e34]"
        />
        <div className="mt-2 flex justify-between text-xs text-[#6f5c49]">
          <span>{bounds.min}</span>
          <span>{bounds.max}</span>
        </div>
        <p className="mt-3 text-xs text-[#6f5c49]">
          Phase 3 swaps this placeholder map for a real US/world map (Mapbox or Leaflet) and geocodes
          all ~350 years of events from the document.
        </p>
      </div>
    </div>
  );
}