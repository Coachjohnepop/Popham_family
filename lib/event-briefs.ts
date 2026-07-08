import briefsData from "@/data/event-briefs.json";

export type EventBrief = {
  id: string;
  title: string;
  yearStart: number;
  yearEnd?: number;
  keywords: string[];
  chapterIds?: string[];
  summary: string;
  body: string;
};

const briefs = briefsData as EventBrief[];

export function getEventBriefs(): EventBrief[] {
  return briefs;
}

export function getEventBrief(id: string): EventBrief | undefined {
  return briefs.find((b) => b.id === id);
}

export function getBriefsForChapter(chapterId: string): EventBrief[] {
  return briefs.filter((b) => b.chapterIds?.includes(chapterId));
}