import type { AnswerDepth } from "@/lib/event-briefs";
import { getEventBrief, getEventBriefBody } from "@/lib/event-briefs";
import { getStorySection } from "@/lib/storybook";
import { getChapterParagraphs } from "@/lib/chapter-narration";
import type { SearchEntry } from "@/lib/types";
import timelineData from "@/data/timeline.index.json";

type TimelineRow = {
  id: string;
  year: number;
  title: string;
  summary: string;
};

const timeline = timelineData as TimelineRow[];

export function chapterFullText(chapterId: string): string {
  const section = getStorySection(chapterId);
  if (!section) return "";
  return getChapterParagraphs(section.blocks).join("\n\n");
}

export function timelineEventText(eventId: string): string {
  const row = timeline.find((e) => e.id === eventId);
  if (!row) return "";
  const title = row.title.replace(/…$/u, "").trim();
  return `${title}\n\n${row.summary}`.trim();
}

/** Full source text for a search-index row (not the truncated index summary). */
export function sourceTextForSearchEntry(entry: SearchEntry): string {
  if (entry.kind === "chapter") {
    const chapterId = entry.id.replace(/^chapter-/, "");
    const text = chapterFullText(chapterId);
    if (text) return text;
  }

  if (entry.kind === "event") {
    const eventId = entry.id.replace(/^event-/, "");
    const fromTimeline = timelineEventText(eventId);
    if (fromTimeline) return fromTimeline;

    const storyRef = entry.references.find((r) => r.href.startsWith("/story/"));
    if (storyRef) {
      const chapterId = storyRef.href.replace("/story/", "").split("?")[0];
      const text = chapterFullText(chapterId);
      if (text) return text;
    }
  }

  if (entry.kind === "person" || entry.kind === "place") {
    return [entry.label, entry.subtitle, ...entry.summary].filter(Boolean).join(". ");
  }

  return [entry.label, entry.subtitle, ...entry.summary].filter(Boolean).join(". ");
}

export function sourceTextForEventBrief(briefId: string, depth: AnswerDepth): string {
  const brief = getEventBrief(briefId);
  if (!brief) return "";
  return getEventBriefBody(brief, depth);
}

export function searchEntryToSourceKind(entry: SearchEntry): "chapter" | "event" | "search" {
  if (entry.kind === "chapter") return "chapter";
  if (entry.kind === "event") return "event";
  return "search";
}

export function searchEntrySourceId(entry: SearchEntry): string {
  if (entry.kind === "chapter") return entry.id.replace(/^chapter-/, "");
  if (entry.kind === "event") return entry.id.replace(/^event-/, "");
  return entry.id;
}