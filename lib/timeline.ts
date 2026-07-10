import type { TimelineEvent } from "@/lib/types";

export type TimelineMarkerKind = "history" | "family" | "both";

export type TimelineMarker = {
  year: number;
  kind: TimelineMarkerKind;
  title: string;
  eventId: string;
  left: number;
};

const MARKER_COLORS: Record<TimelineMarkerKind, string> = {
  history: "#3b82f6",
  family: "#8b5e34",
  both: "#b45309",
};

const MARKER_LABELS: Record<TimelineMarkerKind, string> = {
  history: "Major history",
  family: "Family",
  both: "Family × history",
};

export function getEventKind(event: TimelineEvent): TimelineMarkerKind | null {
  const isFamily = Boolean(event.mentionsFamily || event.familyNames.length > 0);
  const isHistory = event.famousPeople.length > 0;

  if (isFamily && isHistory) return "both";
  if (isFamily) return "family";
  if (isHistory) return "history";
  return null;
}

export function getMarkerColor(kind: TimelineMarkerKind): string {
  return MARKER_COLORS[kind];
}

export function getMarkerLabel(kind: TimelineMarkerKind): string {
  return MARKER_LABELS[kind];
}

export function buildTimelineMarkers(
  events: TimelineEvent[],
  min: number,
  max: number,
): TimelineMarker[] {
  const span = Math.max(max - min, 1);
  const byKey = new Map<string, TimelineMarker>();

  for (const event of events) {
    const kind = getEventKind(event);
    if (!kind) continue;

    const key = `${event.year}-${kind}`;
    const left = ((event.year - min) / span) * 100;

    if (!byKey.has(key)) {
      byKey.set(key, {
        year: event.year,
        kind,
        title: event.title,
        eventId: event.id,
        left,
      });
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.year - b.year);
}

export function markerOffsetTop(kind: TimelineMarkerKind): number {
  switch (kind) {
    case "history":
      return 6;
    case "family":
      return 16;
    case "both":
      return 26;
  }
}

export function topicMarkerOffsetTop(): number {
  return 36;
}

export type TimelineTickGrid = "century" | "half";

export type TimelineTick = {
  year: number;
  left: number;
  grid: TimelineTickGrid | null;
  isStart: boolean;
  isEnd: boolean;
};

export function yearToTimelineLeft(year: number, min: number, max: number): number {
  const span = Math.max(max - min, 1);
  return ((year - min) / span) * 100;
}

export function formatTimelineYear(year: number): string {
  return year.toLocaleString("en-US");
}

export function buildTimelineTicks(min: number, max: number): TimelineTick[] {
  const byYear = new Map<number, TimelineTick>();

  function upsert(year: number, patch: Partial<Omit<TimelineTick, "year" | "left">>) {
    const existing = byYear.get(year);
    if (existing) {
      byYear.set(year, { ...existing, ...patch });
      return;
    }

    byYear.set(year, {
      year,
      left: yearToTimelineLeft(year, min, max),
      grid: null,
      isStart: false,
      isEnd: false,
      ...patch,
    });
  }

  const firstFifty = Math.ceil(min / 50) * 50;
  for (let year = firstFifty; year <= max; year += 50) {
    upsert(year, { grid: year % 100 === 0 ? "century" : "half" });
  }

  if (min !== max) {
    upsert(min, { isStart: true });
    upsert(max, { isEnd: true });
  } else {
    upsert(min, { isStart: true, isEnd: true });
  }

  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}