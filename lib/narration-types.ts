import type { AnswerDepth } from "@/lib/event-briefs";

export type NarrationSourceKind = "event-brief" | "chapter" | "search" | "event";

export type NarrationSummaryEntry = {
  spoken: string;
  sourceKind: NarrationSourceKind;
  sourceId: string;
  depth: AnswerDepth;
  /** extractive = sentence pick from source; ai = OpenAI; hand = event-brief tiers */
  method: "hand" | "extractive" | "ai";
  updatedAt: string;
};

export type NarrationSummaryStore = {
  version: number;
  generatedAt: string;
  /** Bump when storybook / briefs / timeline change — rebuild summaries */
  contentVersion: string;
  entries: Record<string, NarrationSummaryEntry>;
};

export function narrationCacheKey(
  sourceKind: NarrationSourceKind,
  sourceId: string,
  depth: AnswerDepth,
): string {
  return `${sourceKind}:${sourceId}:${depth}`;
}