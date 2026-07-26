import type { NextConfig } from "next";
import narrativePlanData from "./data/narrative-plan.json";
import narrativeData from "./data/narrative-storybook.json";
import storybookData from "./data/storybook.json";

type NarrativeSegment = {
  id: string;
  order?: number;
  yearStart?: number;
  yearEnd?: number;
  storybookChapterId?: string;
  relatedChapterIds?: string[];
  status: string;
};

type NarrativePlanSegment = {
  id: string;
  storybookChapterIds?: string[];
};

type StorybookSection = {
  id: string;
  yearStart?: number;
};

const narrative = narrativeData as { segments: NarrativeSegment[] };
const narrativePlan = narrativePlanData as { segments: NarrativePlanSegment[] };
const storybook = storybookData as { sections: StorybookSection[] };

const activeSegments = narrative.segments
  .filter((segment) => segment.status !== "pending")
  .slice()
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

function segmentForYear(year: number | undefined): string | undefined {
  if (year == null || !Number.isFinite(year)) return activeSegments[0]?.id;
  const hit = activeSegments.find(
    (segment) =>
      (segment.yearStart ?? 0) <= year &&
      (segment.yearEnd ?? segment.yearStart ?? 0) >= year,
  );
  if (hit) return hit.id;
  // Closest earlier segment
  const earlier = [...activeSegments].reverse().find((s) => (s.yearStart ?? 0) <= year);
  return earlier?.id ?? activeSegments[0]?.id;
}

const legacyRedirects = new Map<string, string>();

for (const segment of narrative.segments) {
  if (segment.status === "pending") continue;
  if (segment.storybookChapterId) {
    legacyRedirects.set(segment.storybookChapterId, segment.id);
  }
  // relatedChapterIds were previously omitted — left several legacy URLs as hard 404s
  // (e.g. seigneurial-system-return-to-qu-bec-1-more on pophamstory.com).
  for (const chapterId of segment.relatedChapterIds ?? []) {
    if (!legacyRedirects.has(chapterId)) {
      legacyRedirects.set(chapterId, segment.id);
    }
  }
}

for (const planSegment of narrativePlan.segments) {
  for (const chapterId of planSegment.storybookChapterIds ?? []) {
    if (!legacyRedirects.has(chapterId)) {
      legacyRedirects.set(chapterId, planSegment.id);
    }
  }
}

// Any remaining storybook section IDs still in bookmarks / old links → year-based segment.
for (const section of storybook.sections ?? []) {
  if (legacyRedirects.has(section.id)) continue;
  const dest = segmentForYear(section.yearStart);
  if (dest && dest !== section.id) {
    legacyRedirects.set(section.id, dest);
  }
}

const nextConfig: NextConfig = {
  async redirects() {
    return [...legacyRedirects.entries()]
      .filter(([source, destination]) => source !== destination)
      .map(([source, destination]) => ({
        source: `/story/${source}`,
        destination: `/story/${destination}`,
        permanent: true,
      }));
  },
};

export default nextConfig;