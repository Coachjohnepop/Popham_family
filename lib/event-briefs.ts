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

const DEPTH_RANK: Record<AnswerDepth, number> = {
  brief: 0,
  standard: 1,
  deep: 2,
};

export function depthRank(depth: AnswerDepth): number {
  return DEPTH_RANK[depth];
}

export function isDeeperDepth(from: AnswerDepth, to: AnswerDepth): boolean {
  return depthRank(to) > depthRank(from);
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function paragraphAlreadyCovered(paragraph: string, priorCombined: string): boolean {
  const p = normalizeForCompare(paragraph);
  const prior = normalizeForCompare(priorCombined);
  if (!p) return true;
  if (prior.includes(p)) return true;

  const sentences = p.split(/(?<=[.!?])\s+/).filter((s) => s.length > 25);
  if (!sentences.length) {
    return prior.includes(p.slice(0, Math.min(80, p.length)));
  }

  const novel = sentences.filter((s) => !prior.includes(normalizeForCompare(s)));
  return novel.length < sentences.length * 0.4;
}

/** Paragraphs in `toDepth` not already covered by `fromDepth` (for follow-up read-aloud). */
export function getEventBriefDelta(
  brief: EventBrief,
  fromDepth: AnswerDepth,
  toDepth: AnswerDepth,
): string {
  if (!isDeeperDepth(fromDepth, toDepth)) {
    return getEventBriefBody(brief, toDepth);
  }

  const priorText = getEventBriefBody(brief, fromDepth);
  const fresh = splitParagraphs(getEventBriefBody(brief, toDepth)).filter(
    (p) => !paragraphAlreadyCovered(p, priorText),
  );

  if (fresh.length) return fresh.join("\n\n");

  const priorNorm = normalizeForCompare(priorText);
  const novelSentences = getEventBriefBody(brief, toDepth)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const n = normalizeForCompare(s);
      return n.length > 30 && !priorNorm.includes(n);
    });

  return novelSentences.join(" ").trim();
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