import type { AnswerDepth } from "@/lib/event-briefs";
import type { AskSearchResult } from "@/lib/ask-search";
import { getEventBriefBody, getEventBriefDelta, isDeeperDepth } from "@/lib/event-briefs";
import type { EventBrief } from "@/lib/event-briefs";
import { extractiveSpokenSummary } from "@/lib/narration-extractive";
import { getSpokenNarration } from "@/lib/narration-summaries";
import {
  searchEntrySourceId,
  searchEntryToSourceKind,
  sourceTextForSearchEntry,
} from "@/lib/narration-sources";
import type { SearchEntry } from "@/lib/types";

function spokenForSearchEntry(entry: SearchEntry, depth: AnswerDepth): string {
  const sourceKind = searchEntryToSourceKind(entry);
  const sourceId = searchEntrySourceId(entry);
  const cached = getSpokenNarration(sourceKind, sourceId, depth);
  if (cached?.spoken) return cached.spoken;

  const cachedSearch = getSpokenNarration("search", entry.id, depth);
  if (cachedSearch?.spoken) return cachedSearch.spoken;

  return extractiveSpokenSummary(sourceTextForSearchEntry(entry), depth);
}

export function buildSearchNarrationScript(
  answer: AskSearchResult,
  question: string,
  depth: AnswerDepth = "standard",
): string {
  const parts = answer.entries.map((entry) => {
    const spoken = spokenForSearchEntry(entry, depth);
    return spoken ? `${entry.label.replace(/…$/u, "").trim()}. ${spoken}` : entry.label;
  });
  return `You asked: ${question}. ${answer.intro} ${parts.join(" ")}`.trim();
}

export function buildBriefNarrationScript(
  brief: EventBrief,
  question: string,
  depth: AnswerDepth,
  opts?: { addendumFrom?: AnswerDepth },
): string {
  const fromDepth = opts?.addendumFrom;
  const isAddendum = fromDepth && isDeeperDepth(fromDepth, depth);

  if (isAddendum) {
    const delta = getEventBriefDelta(brief, fromDepth, depth);
    const cached = getSpokenNarration("event-brief", brief.id, depth);
    const body = delta.trim() || cached?.spoken || getEventBriefBody(brief, depth);
    return `Here is more detail. ${body}`;
  }

  const cached = getSpokenNarration("event-brief", brief.id, depth);
  const body = cached?.spoken || getEventBriefBody(brief, depth);
  return `You asked: ${question}. Here is the answer. ${body}`;
}

export function buildChapterNarrationScript(paragraphText: string): string {
  return `Continuing the story. ${paragraphText}`;
}