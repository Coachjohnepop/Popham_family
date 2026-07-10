import narrativePlanData from "@/data/narrative-plan.json";
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

type NarrativePlan = {
  segments: Array<{
    id: string;
    yearStart: number;
    yearEnd: number;
    storybookChapterIds?: string[];
  }>;
};

const narrative = narrativeData as NarrativeStorybook;
const narrativePlan = narrativePlanData as NarrativePlan;

function countImages(blocks: StoryBlock[]): number {
  return (
    blocks.filter((b) => b.type === "image").length +
    blocks
      .filter((b) => b.type === "slideshow")
      .reduce((n, b) => n + (b.images?.length ?? 0), 0)
  );
}

function activeSegments(): NarrativeSegment[] {
  return narrative.segments
    .filter((segment) => segment.status !== "pending")
    .sort((a, b) => a.order - b.order);
}

const legacyChapterToSegmentId = new Map<string, string>();

for (const segment of narrative.segments) {
  if (segment.storybookChapterId) {
    legacyChapterToSegmentId.set(segment.storybookChapterId, segment.id);
  }
}

for (const planSegment of narrativePlan.segments) {
  for (const chapterId of planSegment.storybookChapterIds ?? []) {
    if (!legacyChapterToSegmentId.has(chapterId)) {
      legacyChapterToSegmentId.set(chapterId, planSegment.id);
    }
  }
}

const overrideByChapterId = new Map<string, NarrativeSegment>();

for (const segment of narrative.segments) {
  if (segment.status === "pending") continue;
  if (segment.storybookChapterId) {
    overrideByChapterId.set(segment.storybookChapterId, segment);
  }
}

export function isChronologicalNarrative(): boolean {
  return narrative.mode === "chronological";
}

export function getNarrativeSegments(): NarrativeSegment[] {
  return narrative.segments;
}

export function resolveLegacyChapterId(chapterId: string, legacySections?: StorySection[]): string {
  const mapped = legacyChapterToSegmentId.get(chapterId);
  if (mapped) return mapped;

  if (legacySections?.length) {
    const legacy = legacySections.find((section) => section.id === chapterId);
    if (legacy) {
      const year = legacy.yearStart;
      const segment = activeSegments().find(
        (candidate) =>
          candidate.yearStart <= year && (candidate.yearEnd ?? candidate.yearStart) >= year,
      );
      if (segment) return segment.id;
    }
  }

  return chapterId;
}

export function segmentToStorySection(
  segment: NarrativeSegment,
  legacyById?: Map<string, StorySection>,
): StorySection {
  const legacyIds = [
    segment.storybookChapterId,
    ...(segment.relatedChapterIds ?? []),
    ...(narrativePlan.segments.find((plan) => plan.id === segment.id)?.storybookChapterIds ??
      []),
  ].filter((id): id is string => Boolean(id));

  const famousPeople = new Set<string>();
  const familyNames = new Set<string>();

  for (const legacyId of legacyIds) {
    const legacy = legacyById?.get(legacyId);
    if (!legacy) continue;
    for (const name of legacy.famousPeople) famousPeople.add(name);
    for (const name of legacy.familyNames) familyNames.add(name);
  }

  const teaser =
    segment.blocks.find((block) => block.type === "paragraph")?.text?.slice(0, 160) ?? "";

  return {
    id: segment.id,
    title: segment.title,
    branch: segment.branch as StorySection["branch"],
    yearStart: segment.yearStart,
    yearEnd: segment.yearEnd,
    teaser,
    famousPeople: [...famousPeople],
    familyNames: [...familyNames],
    imageCount: countImages(segment.blocks),
    blocks: segment.blocks,
  };
}

export function getNarrativeStorySections(legacyById?: Map<string, StorySection>): StorySection[] {
  return activeSegments().map((segment) => segmentToStorySection(segment, legacyById));
}

export function getLegacyChapterRedirects(): Array<{ source: string; destination: string }> {
  return [...legacyChapterToSegmentId.entries()]
    .filter(([chapterId, segmentId]) => chapterId !== segmentId)
    .map(([source, destination]) => ({
      source: `/story/${source}`,
      destination: `/story/${destination}`,
    }));
}

export function getNarrativeSegmentForChapter(chapterId: string): NarrativeSegment | undefined {
  return overrideByChapterId.get(chapterId);
}

export function applyNarrativeOverride(section: StorySection): StorySection {
  const segment = overrideByChapterId.get(section.id);
  if (!segment?.blocks?.length) return section;

  const imageCount = countImages(segment.blocks);

  return {
    ...section,
    title: segment.title,
    yearStart: segment.yearStart,
    yearEnd: segment.yearEnd,
    branch: segment.branch as StorySection["branch"],
    teaser:
      segment.blocks.find((block) => block.type === "paragraph")?.text?.slice(0, 160) ??
      section.teaser,
    blocks: segment.blocks,
    imageCount,
  };
}

export function hasNarrativeOverride(chapterId: string): boolean {
  return overrideByChapterId.has(chapterId);
}