import topicsData from "@/data/story-topics.json";
import type { Branch, MapScope } from "@/lib/types";

export type StoryTopicStyle = "amber" | "violet" | "sky" | "sage" | "rose" | "slate";

export type StoryTopicLocation = {
  name: string;
  lat: number;
  lng: number;
  scope: MapScope;
};

export type StoryTopicNarrative = {
  label: string;
  spoken: string;
  paragraphs: string[];
};

export type StoryTopic = {
  id: string;
  order: number;
  buttonLabel: string;
  shortTitle: string;
  teaser: string;
  style: StoryTopicStyle;
  branch: Branch;
  yearStart: number;
  yearEnd: number;
  location: StoryTopicLocation;
  storyChapterId: string;
  nextTopicId: string | null;
  narrative: StoryTopicNarrative;
};

type StoryTopicsData = {
  version: number;
  topicCount: number;
  topics: StoryTopic[];
};

const data = topicsData as StoryTopicsData;

const TOPIC_BUTTON_STYLES: Record<StoryTopicStyle, { idle: string; active: string }> = {
  amber: {
    idle: "bg-[#fef3c7] text-[#92400e] ring-[#fcd34d] hover:bg-[#fde68a]",
    active: "bg-[#92400e] text-white ring-[#92400e]",
  },
  violet: {
    idle: "bg-[#ede9fe] text-[#5b21b6] ring-[#c4b5fd] hover:bg-[#ddd6fe]",
    active: "bg-[#5b21b6] text-white ring-[#5b21b6]",
  },
  sky: {
    idle: "bg-[#dbeafe] text-[#1e3a8a] ring-[#93c5fd] hover:bg-[#bfdbfe]",
    active: "bg-[#1e3a8a] text-white ring-[#1e3a8a]",
  },
  sage: {
    idle: "bg-[#dcfce7] text-[#166534] ring-[#86efac] hover:bg-[#bbf7d0]",
    active: "bg-[#166534] text-white ring-[#166534]",
  },
  rose: {
    idle: "bg-[#ffe4e6] text-[#9f1239] ring-[#fda4af] hover:bg-[#fecdd3]",
    active: "bg-[#9f1239] text-white ring-[#9f1239]",
  },
  slate: {
    idle: "bg-[#e2e8f0] text-[#334155] ring-[#94a3b8] hover:bg-[#cbd5e1]",
    active: "bg-[#334155] text-white ring-[#334155]",
  },
};

export function getTopicButtonStyles(style: StoryTopicStyle) {
  return TOPIC_BUTTON_STYLES[style];
}

export function getStoryTopics(): StoryTopic[] {
  return [...data.topics].sort((a, b) => a.order - b.order);
}

export function getStoryTopicCount(): number {
  return data.topicCount;
}

export function getStoryTopic(id: string): StoryTopic | undefined {
  return data.topics.find((topic) => topic.id === id);
}

export function getStoryTopicMapHref(topic: StoryTopic): string {
  const year = topic.yearStart;
  return `/map?topic=${topic.id}&year=${year}`;
}

export function getStoryTopicChapterHref(topic: StoryTopic): string {
  return `/story/${topic.storyChapterId}`;
}

export type TopicTimelineMarker = {
  year: number;
  topicId: string;
  title: string;
  left: number;
};

export function buildTopicTimelineMarkers(
  topics: StoryTopic[],
  min: number,
  max: number,
): TopicTimelineMarker[] {
  const span = Math.max(max - min, 1);
  return topics.map((topic) => ({
    year: topic.yearStart,
    topicId: topic.id,
    title: topic.shortTitle,
    left: ((topic.yearStart - min) / span) * 100,
  }));
}

export const TOPIC_MARKER_COLOR = "#059669";
export const TOPIC_MARKER_LABEL = "Story topic";