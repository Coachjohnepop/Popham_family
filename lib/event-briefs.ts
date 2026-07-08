import briefsData from "@/data/event-briefs.json";

export type AnswerDepth = "brief" | "standard" | "deep";

export type EventBriefTiers = {
  brief: string;
  standard: string;
  deep: string;
};

export type EventBrief = {
  id: string;
  title: string;
  yearStart: number;
  yearEnd?: number;
  keywords: string[];
  chapterIds?: string[];
  summary: string;
  askOnChapter?: boolean;
  tiers: EventBriefTiers;
  /** @deprecated Use tiers.standard — kept for legacy single-tier entries */
  body?: string;
};

const briefs = briefsData as EventBrief[];

export const ANSWER_DEPTH_LABELS: Record<AnswerDepth, string> = {
  brief: "Brief",
  standard: "Standard",
  deep: "More detail",
};

export function isAnswerDepth(value: string): value is AnswerDepth {
  return value === "brief" || value === "standard" || value === "deep";
}

export function getEventBriefs(): EventBrief[] {
  return briefs;
}

export function getEventBrief(id: string): EventBrief | undefined {
  return briefs.find((b) => b.id === id);
}

export function getEventBriefBody(brief: EventBrief, depth: AnswerDepth = "standard"): string {
  return brief.tiers[depth] ?? brief.tiers.standard ?? brief.body ?? "";
}

export function getBriefsForChapter(chapterId: string): EventBrief[] {
  return briefs.filter((b) => b.chapterIds?.includes(chapterId));
}

export function getAutoShowBriefsForChapter(chapterId: string): EventBrief[] {
  return getBriefsForChapter(chapterId).filter((b) => !b.askOnChapter);
}

export function getAskBriefsForChapter(chapterId: string): EventBrief[] {
  return getBriefsForChapter(chapterId).filter((b) => b.askOnChapter);
}

export function matchEventBriefByKeywords(text: string): EventBrief | undefined {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let best: EventBrief | undefined;
  let bestScore = 0;

  for (const brief of briefs) {
    let score = 0;
    for (const keyword of brief.keywords) {
      const kw = keyword.toLowerCase();
      if (normalized.includes(kw)) score += kw.length > 5 ? 3 : 2;
    }
    if (normalized.includes(brief.id.replace(/-/g, " "))) score += 4;
    if (score > bestScore) {
      bestScore = score;
      best = brief;
    }
  }

  return bestScore >= 2 ? best : undefined;
}