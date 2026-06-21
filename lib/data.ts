import type { StoryChapter, TimelineEvent } from "@/lib/types";
import storiesSeed from "@/data/stories.seed.json";
import timelineSeed from "@/data/timeline.seed.json";

export function getHighlightStories(): StoryChapter[] {
  return storiesSeed as StoryChapter[];
}

export function getTimelineEvents(): TimelineEvent[] {
  return (timelineSeed as TimelineEvent[]).sort((a, b) => a.year - b.year);
}

export function getYearBounds(events: TimelineEvent[]) {
  const years = events.map((e) => e.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}