import narrativeData from "@/data/narrative-storybook.json";
import type { StoryBlock, StorySection } from "@/lib/types";

type NarrativeSegment = {
  id: string;
  order: number;
  yearStart: number;
  yearEnd: number;
  title: string;
  branch: string;
  status: string;
  storybookChapterId?: string;
  /** Planning only — does not override reader until a dedicated chapter mapping is set */
  relatedChapterIds?: string[];
  supplementalSources?: string[];
  blocks: StoryBlock[];
};

type NarrativeStorybook = {
  version: number;
  mode: string;
  segments: NarrativeSegment[];
};

const narrative = narrativeData as NarrativeStorybook;

const overrideByChapterId = new Map<string, NarrativeSegment>();

for (const segment of narrative.segments) {
  if (segment.status === "pending") continue;
  if (segment.storybookChapterId) {
    overrideByChapterId.set(segment.storybookChapterId, segment);
  }
}

export function getNarrativeSegments(): NarrativeSegment[] {
  return narrative.segments;
}

export function getNarrativeSegmentForChapter(chapterId: string): NarrativeSegment | undefined {
  return overrideByChapterId.get(chapterId);
}

export function applyNarrativeOverride(section: StorySection): StorySection {
  const segment = overrideByChapterId.get(section.id);
  if (!segment?.blocks?.length) return section;

  const imageCount = segment.blocks.filter((b) => b.type === "image").length
    + segment.blocks
        .filter((b) => b.type === "slideshow")
        .reduce((n, b) => n + (b.images?.length ?? 0), 0);

  return {
    ...section,
    title: segment.title,
    yearStart: segment.yearStart,
    yearEnd: segment.yearEnd,
    branch: segment.branch as StorySection["branch"],
    teaser: segment.blocks.find((b) => b.type === "paragraph")?.text?.slice(0, 160) ?? section.teaser,
    blocks: segment.blocks,
    imageCount,
  };
}

export function hasNarrativeOverride(chapterId: string): boolean {
  return overrideByChapterId.has(chapterId);
}