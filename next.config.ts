import type { NextConfig } from "next";
import narrativePlanData from "./data/narrative-plan.json";
import narrativeData from "./data/narrative-storybook.json";

type NarrativeSegment = {
  id: string;
  storybookChapterId?: string;
  status: string;
};

type NarrativePlanSegment = {
  id: string;
  storybookChapterIds?: string[];
};

const narrative = narrativeData as { segments: NarrativeSegment[] };
const narrativePlan = narrativePlanData as { segments: NarrativePlanSegment[] };

const legacyRedirects = new Map<string, string>();

for (const segment of narrative.segments) {
  if (segment.status === "pending") continue;
  if (segment.storybookChapterId) {
    legacyRedirects.set(segment.storybookChapterId, segment.id);
  }
}

for (const planSegment of narrativePlan.segments) {
  for (const chapterId of planSegment.storybookChapterIds ?? []) {
    if (!legacyRedirects.has(chapterId)) {
      legacyRedirects.set(chapterId, planSegment.id);
    }
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