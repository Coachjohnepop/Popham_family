import type { StoryBlock, StorySection } from "@/lib/types";

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getChapterParagraphs(blocks: StoryBlock[]): string[] {
  return blocks
    .filter((b): b is Extract<StoryBlock, { type: "paragraph" }> => b.type === "paragraph")
    .map((b) => b.text.trim())
    .filter(Boolean);
}

function paragraphMostlyNew(paragraph: string, spoken: string): boolean {
  const p = normalizeForCompare(paragraph);
  const prior = normalizeForCompare(spoken);
  if (!p) return false;
  if (prior.includes(p)) return false;

  const sentences = p.split(/(?<=[.!?])\s+/).filter((s) => s.length > 30);
  if (!sentences.length) return !prior.includes(p.slice(0, 60));

  const novel = sentences.filter((s) => !prior.includes(normalizeForCompare(s)));
  return novel.length >= Math.max(1, sentences.length * 0.35);
}

export type ChapterNarrationChunk = {
  text: string;
  nextCursor: number;
  paragraphIndex: number;
  done: boolean;
};

/** Next chronological paragraph(s) from the chapter not already spoken. */
export function getNextChapterNarration(
  paragraphs: string[],
  cursor: number,
  spokenSoFar: string,
  maxParagraphs = 1,
): ChapterNarrationChunk | null {
  if (!paragraphs.length) return null;

  let index = Math.max(0, cursor);
  const picked: string[] = [];

  while (index < paragraphs.length && picked.length < maxParagraphs) {
    const para = paragraphs[index];
    if (paragraphMostlyNew(para, spokenSoFar + picked.join(" "))) {
      picked.push(para);
    }
    index += 1;
  }

  if (!picked.length) {
    if (index >= paragraphs.length) return null;
    picked.push(paragraphs[index]);
    index += 1;
  }

  const done = index >= paragraphs.length;
  return {
    text: picked.join("\n\n"),
    nextCursor: index,
    paragraphIndex: index - picked.length,
    done,
  };
}

export function getSectionTeaser(section: StorySection): string {
  return section.teaser?.trim() || section.title;
}