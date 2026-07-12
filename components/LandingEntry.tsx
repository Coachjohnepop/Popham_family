"use client";

import Link from "next/link";
import ExplorationPaths from "@/components/ExplorationPaths";
import ReadingProgressCard from "@/components/ReadingProgressCard";
import StoryOverviewSummaries from "@/components/StoryOverviewSummaries";
import StoryTopicsHub from "@/components/StoryTopicsHub";
import { useOptionalReader } from "@/components/ReaderProvider";

export default function LandingEntry() {
  const reader = useOptionalReader();
  const entryKey = reader?.homeEntryKey ?? 0;

  return (
    <div className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-6 sm:mt-10">
      <StoryOverviewSummaries key={`home-overview-${entryKey}`} variant="landing" />
      <ReadingProgressCard className="w-full" />
      <StoryTopicsHub variant="landing-compact" />

      <ExplorationPaths key={`home-paths-${entryKey}`} />

      <Link
        href="/story"
        className="w-full rounded-full bg-[#8b5e34] px-8 py-4 text-center text-base font-semibold text-white shadow-md transition hover:bg-[#6f4a28] sm:w-auto"
      >
        Open Interactive Storybook →
      </Link>
      <p className="text-center text-sm text-[#6f5c49]">
        Voice dial, ask anything, and full chapters live on the Storybook page
      </p>
    </div>
  );
}
