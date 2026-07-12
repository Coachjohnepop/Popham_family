"use client";

import Link from "next/link";
import { useOptionalReader } from "@/components/ReaderProvider";
import { getStorySections } from "@/lib/storybook";

type ReadingProgressCardProps = {
  variant?: "compact" | "full";
  className?: string;
};

export default function ReadingProgressCard({
  variant = "full",
  className = "",
}: ReadingProgressCardProps) {
  const reader = useOptionalReader();
  const sections = getStorySections();
  const total = sections.length;
  const visited = reader?.visitedChapterIds ?? [];
  const favorites = reader?.favoriteChapterIds ?? [];
  const visitedCount = visited.filter((id) => sections.some((s) => s.id === id)).length;
  const pct = total > 0 ? Math.round((visitedCount / total) * 100) : 0;
  const lastId = reader?.session?.lastChapterId;
  const lastSection = lastId ? sections.find((s) => s.id === lastId) : null;

  if (variant === "compact") {
    return (
      <div
        className={`flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2d4bf] bg-white/90 px-3 py-2 text-xs ${className}`}
      >
        <div className="min-w-[7rem] flex-1">
          <div className="mb-1 flex justify-between gap-2 font-semibold text-[#5c4a38]">
            <span>Progress</span>
            <span>
              {visitedCount}/{total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#efe4d2]">
            <div
              className="h-full rounded-full bg-[#8b5e34] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <Link
          href="/favorites"
          className="shrink-0 rounded-full bg-[#fdf2f8] px-3 py-1.5 font-semibold text-[#9d174d] hover:bg-[#fce7f3]"
        >
          {favorites.length} pin{favorites.length === 1 ? "" : "s"} · My Path
        </Link>
      </div>
    );
  }

  return (
    <section
      className={`rounded-3xl border border-[#e2d4bf] bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8b5e34]">
            Your reading
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-[#2b2118] sm:text-2xl">
            {visitedCount === 0
              ? "Ready when you are"
              : pct >= 100
                ? "You have opened every chapter"
                : `${pct}% of the story explored`}
          </h2>
          <p className="mt-1 text-sm text-[#6f5c49]">
            {visitedCount} of {total} chapters opened
            {favorites.length > 0
              ? ` · ${favorites.length} pinned for your path`
              : " · pin sections to build a custom path"}
          </p>
        </div>
        <Link
          href="/favorites"
          className="rounded-full bg-[#db2777] px-4 py-2 text-sm font-semibold text-white hover:bg-[#be185d]"
        >
          My Path →
        </Link>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#efe4d2]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8b5e34] to-[#c4a574] transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Story chapters visited"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {lastSection ? (
          <Link
            href={`/story/${lastSection.id}`}
            className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
          >
            Resume: {lastSection.title}
          </Link>
        ) : (
          <Link
            href="/story"
            className="rounded-full bg-[#8b5e34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f4a28]"
          >
            Start the storybook
          </Link>
        )}
        {favorites.length > 0 && (
          <Link
            href={`/story/${favorites[0]}`}
            className="rounded-full border border-[#f9a8d4] bg-[#fdf2f8] px-4 py-2 text-sm font-semibold text-[#9d174d] hover:bg-[#fce7f3]"
          >
            Play my path
          </Link>
        )}
      </div>
    </section>
  );
}
