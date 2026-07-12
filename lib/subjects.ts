/**
 * High-level subjects checklist (easter-egg “Subjects Covered” site).
 * Built from story topics so progress maps to the main narrative.
 */
import { getStoryTopics, type StoryTopic } from "@/lib/story-topics";

export type StorySubject = {
  id: string;
  title: string;
  summary: string;
  yearLabel: string;
  branch: string;
  chapterId: string;
  order: number;
};

export function getStorySubjects(): StorySubject[] {
  return getStoryTopics().map((topic: StoryTopic) => ({
    id: topic.id,
    title: topic.shortTitle || topic.buttonLabel,
    summary: topic.teaser,
    yearLabel:
      topic.yearEnd && topic.yearEnd !== topic.yearStart
        ? `${topic.yearStart}–${topic.yearEnd}`
        : String(topic.yearStart),
    branch: topic.branch,
    chapterId: topic.storyChapterId,
    order: topic.order,
  }));
}

export function getSubjectById(id: string): StorySubject | undefined {
  return getStorySubjects().find((s) => s.id === id);
}

/** Topic / subject ids linked to a chapter (for auto-progress). */
export function subjectIdsForChapter(chapterId: string): string[] {
  return getStorySubjects()
    .filter((s) => s.chapterId === chapterId)
    .map((s) => s.id);
}

export function computeSubjectsProgress(
  coveredIds: string[],
  total = getStorySubjects().length,
): { covered: number; total: number; pct: number } {
  const set = new Set(coveredIds);
  const covered = getStorySubjects().filter((s) => set.has(s.id)).length;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return { covered, total, pct };
}
