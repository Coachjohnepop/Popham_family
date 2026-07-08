import {
  formatChoiceHints,
  matchPromptIndex,
  type VoiceNavResult,
} from "@/lib/prompt-index";
import type { StorySection } from "@/lib/types";

export type { VoiceNavResult };

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s: string): string[] {
  return normalize(s)
    .split(" ")
    .filter((w) => w.length > 2);
}

function scoreTitleMatch(transcript: string, title: string): number {
  const t = normalize(transcript);
  const titleNorm = normalize(title);
  if (t.includes(titleNorm) || titleNorm.includes(t)) return 100;

  const tWords = words(transcript);
  const titleWords = words(title);
  if (!tWords.length || !titleWords.length) return 0;

  let score = 0;
  for (const tw of tWords) {
    if (titleWords.some((w) => w.includes(tw) || tw.includes(w))) score += 2;
  }
  if (titleWords.filter((w) => t.includes(w)).length >= 2) score += 4;
  return score;
}

export function matchVoiceNavigation(
  transcript: string,
  sections: StorySection[],
  context?: string,
): VoiceNavResult {
  const heard = transcript.trim();
  if (!heard) return { action: "unknown", heard };

  const fromIndex = matchPromptIndex(heard, sections, context);
  if (fromIndex) return fromIndex;

  let best: StorySection | null = null;
  let bestScore = 0;
  for (const section of sections) {
    const score = scoreTitleMatch(heard, section.title);
    if (score > bestScore) {
      bestScore = score;
      best = section;
    }
  }

  if (best && bestScore >= 4) {
    return { action: "chapter", sectionId: best.id, label: best.title };
  }

  return { action: "unknown", heard };
}

export function describeVoiceHints(context = "toc"): string {
  return formatChoiceHints(context);
}