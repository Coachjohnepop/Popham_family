"use client";

import HomeLink from "@/components/HomeLink";
import Link from "next/link";
import PinSectionButton from "@/components/PinSectionButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import { getStorySections } from "@/lib/storybook";

type StorySidebarProps = {
  activeId?: string;
};

export default function StorySidebar({ activeId }: StorySidebarProps) {
  const sections = getStorySections();
  const reader = useOptionalReader();

  return (
    <aside className="space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          Chapters
        </p>
        <div className="flex gap-2 text-xs font-medium">
          <HomeLink className="text-[#8b5e34] hover:underline">Home</HomeLink>
          <Link href="/favorites" className="text-[#db2777] hover:underline">
            Path
          </Link>
          <Link href="/story" className="text-[#8b5e34] hover:underline">
            All
          </Link>
        </div>
      </div>
      <div className="space-y-2 rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
          Document
        </p>
        <Link
          href="/story#story-topics"
          className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#8b5e34] hover:bg-white"
        >
          16 story topics
        </Link>
        <Link
          href="/favorites"
          className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#db2777] hover:bg-white"
        >
          My Path &amp; progress
        </Link>
        <Link
          href="/story#format"
          className="block rounded-xl px-3 py-2 text-sm font-medium text-[#5c4a38] hover:bg-white"
        >
          Format of the Story
        </Link>
        <Link
          href="/story/family-index"
          className="block rounded-xl px-3 py-2 text-sm font-medium text-[#5c4a38] hover:bg-white"
        >
          Family index
        </Link>
        <Link
          href="/story/references"
          className="block rounded-xl px-3 py-2 text-sm font-medium text-[#5c4a38] hover:bg-white"
        >
          References
        </Link>
      </div>

      {sections.map((section) => {
        const active = section.id === activeId;
        const visited = reader?.isVisited(section.id);
        const pinned = reader?.isFavorite(section.id);
        return (
          <div
            key={section.id}
            className={`relative rounded-2xl border transition ${
              active
                ? "border-[#8b5e34] bg-white shadow-sm"
                : "border-[#e2d4bf] bg-[#fffaf2] hover:border-[#c8b08d]"
            }`}
          >
            <Link href={`/story/${section.id}`} className="block w-full px-4 py-3 pr-12">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                <span>
                  {section.yearStart}
                  {section.yearEnd ? `–${section.yearEnd}` : ""} · {section.branch}
                </span>
                {visited && (
                  <span className="rounded-full bg-[#efe4d2] px-1.5 py-0.5 text-[#6f5c49]">
                    Opened
                  </span>
                )}
                {pinned && (
                  <span className="rounded-full bg-[#fce7f3] px-1.5 py-0.5 text-[#db2777]">
                    Path
                  </span>
                )}
              </div>
              <div className="mt-1 font-serif text-base font-semibold leading-snug">
                {section.title}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-[#6f5c49]">{section.teaser}</p>
            </Link>
            <div className="absolute right-2 top-2">
              <PinSectionButton sectionId={section.id} compact />
            </div>
          </div>
        );
      })}
    </aside>
  );
}
