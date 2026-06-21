"use client";

import { useState } from "react";
import { getHighlightStories } from "@/lib/data";

const stories = getHighlightStories();

export default function StoryView() {
  const [activeId, setActiveId] = useState(stories[0]?.id ?? "");

  const active = stories.find((s) => s.id === activeId) ?? stories[0];

  if (!active) {
    return <p className="text-sm text-[#6f5c49]">No stories loaded yet.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          Chapters (preview)
        </p>
        {stories.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() => setActiveId(story.id)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
              story.id === active.id
                ? "border-[#8b5e34] bg-white shadow-sm"
                : "border-[#e2d4bf] bg-[#fffaf2] hover:border-[#c8b08d]"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              {story.yearStart}
              {story.yearEnd ? `–${story.yearEnd}` : ""} · {story.branch}
            </div>
            <div className="mt-1 font-serif text-base font-semibold">{story.title}</div>
            <p className="mt-1 text-xs text-[#6f5c49]">{story.teaser}</p>
          </button>
        ))}
        <p className="text-xs leading-relaxed text-[#6f5c49]">
          Phase 1 will expand this to all 79 chapters from the Word document, rewritten at
          sixth-grade reading level with family × famous-people callouts.
        </p>
      </aside>

      <article className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8b5e34]">
          Grade 6 story
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{active.title}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {active.famousPeople.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#efe4d2] px-3 py-1 text-xs font-medium text-[#5c4a38]"
            >
              Famous: {name}
            </span>
          ))}
          {active.familyNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-medium text-[#5b3c88]"
            >
              Family: {name}
            </span>
          ))}
        </div>
        <div className="prose-story mt-6 space-y-4 text-[17px] leading-8 text-[#3f342c]">
          {active.story.split("\n\n").map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
        </div>
      </article>
    </div>
  );
}