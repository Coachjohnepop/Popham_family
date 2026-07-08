import promptIndexData from "@/data/prompt-index.json";
import { isAnswerDepth, type AnswerDepth } from "@/lib/event-briefs";
import type { StorySection } from "@/lib/types";

export type VoiceNavResult =
  | { action: "chapter"; sectionId: string; label: string }
  | { action: "resume" }
  | { action: "open-toc" }
  | { action: "event-brief"; eventId: string; label: string }
  | { action: "answer-depth"; depth: AnswerDepth; label: string }
  | { action: "unknown"; heard: string };

export type PromptChoice = {
  id: string;
  label: string;
  say: string[];
  action: string;
  target?: string;
  topic?: string;
};

export type PromptChoiceGroup = {
  id: string;
  label: string;
  choices: PromptChoice[];
};

export type PromptEntry = {
  id: string;
  question: string;
  dadDocRef?: string;
  contexts: string[];
  choiceGroups: PromptChoiceGroup[];
};

export type PromptIndex = {
  version: number;
  description: string;
  prompts: PromptEntry[];
};

const index = promptIndexData as PromptIndex;

export function getPromptIndex(): PromptIndex {
  return index;
}

export function getPromptById(id: string): PromptEntry | undefined {
  return index.prompts.find((p) => p.id === id);
}

export function getPromptsForContext(context: string): PromptEntry[] {
  return index.prompts.filter((p) => p.contexts.includes(context));
}

export function getAllSayPhrases(): string[] {
  const phrases = new Set<string>();
  for (const prompt of index.prompts) {
    for (const group of prompt.choiceGroups) {
      for (const choice of group.choices) {
        for (const phrase of choice.say) phrases.add(phrase);
      }
    }
  }
  return [...phrases].sort();
}

/** For Deepgram keyterm boosting when we wire cloud STT. */
export function getSttKeyterms(sections: StorySection[]): string[] {
  const terms = new Set<string>(getAllSayPhrases());
  for (const section of sections) {
    terms.add(section.title);
    const short = section.title.split(/[&(+]/)[0]?.trim();
    if (short && short.length > 4) terms.add(short);
  }
  terms.add("Winifred Coss");
  terms.add("Joseph Warren Coss");
  terms.add("Mary Ann Goodwater");
  terms.add("Edith Powers");
  return [...terms];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveChapterTarget(
  target: string | undefined,
  sections: StorySection[],
): StorySection | null {
  if (!target || !sections.length) return null;
  if (target === "first") return sections[0];

  const byId = sections.find((s) => s.id === target);
  if (byId) return byId;

  if (target === "powers-start") {
    return (
      sections.find((s) => normalize(s.title).includes("edith powers")) ??
      sections.find((s) => s.branch === "powers") ??
      null
    );
  }

  if (target === "goodwater-start") {
    return (
      sections.find(
        (s) => normalize(s.title).includes("goodwater") && normalize(s.title).includes("quebec"),
      ) ??
      sections.find((s) => s.branch === "goodwater") ??
      null
    );
  }

  if (target === "dakota") {
    return sections.find((s) => normalize(s.title).includes("dakota")) ?? null;
  }

  return null;
}

function phraseMatches(transcript: string, phrase: string): boolean {
  const t = normalize(transcript);
  const p = normalize(phrase);
  if (!p) return false;
  return t === p || t.includes(p) || p.includes(t);
}

export function executePromptChoice(
  choice: PromptChoice,
  sections: StorySection[],
): VoiceNavResult | null {
  if (choice.action === "resume") return { action: "resume" };
  if (choice.action === "open-toc") return { action: "open-toc" };
  if (choice.action === "event-brief" && choice.target) {
    return { action: "event-brief", eventId: choice.target, label: choice.label };
  }
  if (choice.action === "answer-depth" && choice.target && isAnswerDepth(choice.target)) {
    return { action: "answer-depth", depth: choice.target, label: choice.label };
  }
  if (choice.action === "chapter") {
    const section = resolveChapterTarget(choice.target, sections);
    if (section) {
      return { action: "chapter", sectionId: section.id, label: section.title };
    }
  }
  return null;
}

export function matchPromptIndex(
  transcript: string,
  sections: StorySection[],
  context?: string,
): VoiceNavResult | null {
  const heard = transcript.trim();
  const prompts = context ? getPromptsForContext(context) : index.prompts;

  for (const prompt of prompts) {
    for (const group of prompt.choiceGroups) {
      for (const choice of group.choices) {
        if (!choice.say.some((phrase) => phraseMatches(heard, phrase))) continue;

        if (choice.action === "resume") return { action: "resume" };
        if (choice.action === "open-toc") return { action: "open-toc" };

        if (choice.action === "event-brief" && choice.target) {
          return { action: "event-brief", eventId: choice.target, label: choice.label };
        }

        if (choice.action === "answer-depth" && choice.target && isAnswerDepth(choice.target)) {
          return { action: "answer-depth", depth: choice.target, label: choice.label };
        }

        if (choice.action === "chapter") {
          const section = resolveChapterTarget(choice.target, sections);
          if (section) {
            return { action: "chapter", sectionId: section.id, label: section.title };
          }
        }
      }
    }
  }

  return null;
}

export function getFeaturedChoices(context: string): PromptChoiceGroup[] {
  const prompts = getPromptsForContext(context);
  return prompts.flatMap((p) => p.choiceGroups);
}

export function formatChoiceHints(context: string, maxPerGroup = 2): string {
  const groups = getFeaturedChoices(context);
  const samples: string[] = [];
  for (const group of groups) {
    for (const choice of group.choices.slice(0, maxPerGroup)) {
      if (choice.say[0]) samples.push(`"${choice.say[0]}"`);
    }
  }
  const unique = [...new Set(samples)].slice(0, 6);
  return unique.length ? `Try: ${unique.join(", ")}.` : "";
}