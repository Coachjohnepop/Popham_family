import type { IndexMeta, IndexedLocation, StoryChapter, TimelineEvent } from "@/lib/types";
import storiesSeed from "@/data/stories.seed.json";
import timelineIndex from "@/data/timeline.index.json";
import locationsIndex from "@/data/locations.index.json";
import indexMeta from "@/data/index.meta.json";

export function getHighlightStories(): StoryChapter[] {
  return storiesSeed as StoryChapter[];
}

export function getTimelineEvents(): TimelineEvent[] {
  return (timelineIndex as TimelineEvent[]).sort((a, b) => a.year - b.year);
}

export function getIndexedLocations(): IndexedLocation[] {
  return locationsIndex as IndexedLocation[];
}

export function getIndexMeta(): IndexMeta {
  return indexMeta as IndexMeta;
}

export function getYearBounds(events: TimelineEvent[]) {
  const years = events.map((e) => e.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}