import type { StorySection } from "@/lib/types";

export type VoiceNavResult =
  | { action: "chapter"; sectionId: string; label: string }
  | { action: "resume" }
  | { action: "open-toc" }
  | { action: "unknown"; heard: string };

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

function firstByBranch(sections: StorySection[], branch: StorySection["branch"]): StorySection {
  return (
    sections.find((s) => s.branch === branch) ??
    sections[0]
  );
}

function findGoodwaterStart(sections: StorySection[]): StorySection | undefined {
  return (
    sections.find((s) => normalize(s.title).includes("goodwater") && normalize(s.title).includes("quebec")) ??
    sections.find((s) => s.branch === "goodwater")
  );
}

function findPowersStart(sections: StorySection[]): StorySection | undefined {
  return (
    sections.find((s) => normalize(s.title).includes("edith powers")) ??
    sections.find((s) => normalize(s.title).includes("powers") && normalize(s.title).includes("branch")) ??
    sections.find((s) => s.branch === "powers")
  );
}

export function matchVoiceNavigation(
  transcript: string,
  sections: StorySection[],
): VoiceNavResult {
  const heard = transcript.trim();
  const t = normalize(heard);
  if (!t) return { action: "unknown", heard };

  if (
    /^(continue|resume|last chapter|where i left off|pick up where|left off)/.test(t) ||
    /continue where i left/.test(t) ||
    /last (screen|place|chapter|session)/.test(t)
  ) {
    return { action: "resume" };
  }

  if (
    /^(open )?table of contents/.test(t) ||
    /show (the )?chapters/.test(t) ||
    /list (of )?chapters/.test(t) ||
    /different section/.test(t) ||
    /choose (a )?different/.test(t) ||
    /another (chapter|section)/.test(t)
  ) {
    return { action: "open-toc" };
  }

  if (
    /^(the )?beginning/.test(t) ||
    /from the start/.test(t) ||
    /first chapter/.test(t) ||
    /^start over/.test(t) ||
    /^start from the beginning/.test(t)
  ) {
    const first = sections[0];
    return { action: "chapter", sectionId: first.id, label: first.title };
  }

  if (/edith powers|powers branch|england branch/.test(t) || /^powers$/.test(t)) {
    const section = findPowersStart(sections) ?? firstByBranch(sections, "powers");
    return { action: "chapter", sectionId: section.id, label: section.title };
  }

  if (
    /goodwater|good water|quebec|quebec settlement|france branch|canada branch|mary ann goodwater/.test(t)
  ) {
    const section = findGoodwaterStart(sections) ?? firstByBranch(sections, "goodwater");
    return { action: "chapter", sectionId: section.id, label: section.title };
  }

  if (/1853|joseph warren|merge|convergence/.test(t)) {
    const section =
      sections.find((s) => normalize(s.title).includes("dakota")) ??
      sections.find((s) => s.branch === "both") ??
      sections[sections.length - 1];
    return { action: "chapter", sectionId: section.id, label: section.title };
  }

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

export function describeVoiceHints(): string {
  return 'Try: "the beginning", "Powers branch", "Québec", "Salem Witch Trials", or "continue where I left off".';
}