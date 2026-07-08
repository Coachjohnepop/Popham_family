import type { AnswerDepth } from "@/lib/event-briefs";
import narrationData from "@/data/narration-summaries.json";
import {
  narrationCacheKey,
  type NarrationSourceKind,
  type NarrationSummaryEntry,
  type NarrationSummaryStore,
} from "@/lib/narration-types";

const store = narrationData as NarrationSummaryStore;

export function getNarrationStore(): NarrationSummaryStore {
  return store;
}

export function getSpokenNarration(
  sourceKind: NarrationSourceKind,
  sourceId: string,
  depth: AnswerDepth,
): NarrationSummaryEntry | undefined {
  const key = narrationCacheKey(sourceKind, sourceId, depth);
  return store.entries[key];
}

export function listNarrationKeys(): string[] {
  return Object.keys(store.entries);
}