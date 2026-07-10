"use client";

import { Suspense } from "react";
import AskEventPanel from "@/components/AskEventPanel";
import EventSearch from "@/components/EventSearch";

export default function StoryAskSection() {
  return (
    <section
      id="ask-anything"
      className="scroll-mt-6 rounded-3xl border border-[#e2d4bf] bg-white p-5 shadow-sm sm:p-8"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
        Ask anything
      </p>
      <h2 className="mt-2 font-serif text-xl font-semibold text-[#2b2118] sm:text-2xl">
        People, places, events, years
      </h2>
      <p className="mt-2 text-sm text-[#6f5c49]">
        Type or say a question — Salem, Goodwater, 1853, witch trials, and more.
      </p>
      <div className="mt-5 space-y-3">
        <AskEventPanel />
        <Suspense fallback={null}>
          <EventSearch placeholder="Search people, places, events, years…" />
        </Suspense>
      </div>
    </section>
  );
}