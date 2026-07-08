"use client";

import { useState } from "react";
import ReadAloudButton from "@/components/ReadAloudButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import {
  ANSWER_DEPTH_LABELS,
  getEventBriefBody,
  type AnswerDepth,
  type EventBrief,
} from "@/lib/event-briefs";

type EventBriefCardProps = {
  brief: EventBrief;
  depth?: AnswerDepth;
  onDepthChange?: (depth: AnswerDepth) => void;
  question?: string;
};

export default function EventBriefCard({
  brief,
  depth: depthProp,
  onDepthChange,
  question,
}: EventBriefCardProps) {
  const reader = useOptionalReader();
  const sessionDepth = reader?.answerDepth ?? "standard";
  const depth = depthProp ?? sessionDepth;
  const [pinned, setPinned] = useState(true);

  const body = getEventBriefBody(brief, depth);

  function handleDepthChange(next: AnswerDepth) {
    reader?.setAnswerDepth(next);
    onDepthChange?.(next);
  }

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
          {question && (
            <p className="mt-2 text-sm font-medium text-[#9a3412]">{question}</p>
          )}
          <p className="mt-1 text-sm text-[#6f5c49]">{brief.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReadAloudButton text={body.replace(/\n\n/g, " ")} label="Listen" />
          <button
            type="button"
            onClick={() => setPinned(false)}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#6f5c49] hover:bg-[#ffedd5]"
          >
            Minimize
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["brief", "standard", "deep"] as const).map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => handleDepthChange(tier)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              depth === tier
                ? "bg-[#c2410c] text-white"
                : "bg-white text-[#9a3412] ring-1 ring-[#fdba74] hover:bg-[#ffedd5]"
            }`}
          >
            {ANSWER_DEPTH_LABELS[tier]}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#3f342c]">
        {body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </aside>
  );
}