"use client";

import Link from "next/link";
import { Suspense } from "react";
import AskEventPanel from "@/components/AskEventPanel";
import EventSearch from "@/components/EventSearch";
import ExplorationPaths from "@/components/ExplorationPaths";
import StoryOverviewSummaries from "@/components/StoryOverviewSummaries";
import StoryTopicsHub from "@/components/StoryTopicsHub";
import { useOptionalReader } from "@/components/ReaderProvider";

export default function LandingEntry() {
  const reader = useOptionalReader();
  const entryKey = reader?.homeEntryKey ?? 0;

  return (
    <div className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-6">
      <StoryOverviewSummaries key={`home-overview-${entryKey}`} variant="landing" />
      <StoryTopicsHub variant="landing-compact" />

      <ExplorationPaths key={`home-paths-${entryKey}`} />

      <div className="w-full border-t border-[#e2d4bf] pt-6">
        <p className="mb-3 text-center text-sm font-medium text-[#6f5c49]">
          Or ask anything about the family tree
        </p>
        <div className="space-y-3">
          <AskEventPanel key={`home-ask-${entryKey}`} />
          <Suspense fallback={null}>
            <EventSearch
              key={`home-search-${entryKey}`}
              placeholder="Search people, places, events, years…"
            />
          </Suspense>
        </div>
      </div>

      <Link
        href="/read"
        className="w-full rounded-full bg-[#8b5e34] px-8 py-4 text-center text-base font-semibold text-white shadow-md transition hover:bg-[#6f4a28] sm:w-auto"
      >
        Start guided reading →
      </Link>
      <p className="text-center text-sm text-[#6f5c49]">
        Personalized welcome, read-aloud, and clickable family names
      </p>
    </div>
  );
}