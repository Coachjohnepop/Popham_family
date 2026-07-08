"use client";

import { useState } from "react";
import ReadAloudButton from "@/components/ReadAloudButton";
import type { EventBrief } from "@/lib/event-briefs";

type EventBriefCardProps = {
  brief: EventBrief;
};

export default function EventBriefCard({ brief }: EventBriefCardProps) {
  const [pinned, setPinned] = useState(true);

  if (!pinned) {
    return (
      <button
        type="button"
        onClick={() => setPinned(true)}
        className="rounded-full bg-[#fff7ed] px-4 py-2 text-sm font-semibold text-[#9a3412] ring-1 ring-[#fdba74]"
      >
        Show: {brief.title}
      </button>
    );
  }

  return (
    <aside className="rounded-2xl border-2 border-[#fdba74] bg-[#fff7ed] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#c2410c]">
            Historical context · {brief.yearStart}
            {brief.yearEnd ? `–${brief.yearEnd}` : ""}
          </p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-[#2b2118]">{brief.title}</h3>
          <p className="mt-1 text-sm text-[#6f5c49]">{brief.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReadAloudButton text={brief.body.replace(/\n\n/g, " ")} label="Listen" />
          <button
            type="button"
            onClick={() => setPinned(false)}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#6f5c49] hover:bg-[#ffedd5]"
          >
            Minimize
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#3f342c]">
        {brief.body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </aside>
  );
}