"use client";

import Link from "next/link";
import PinSectionButton from "@/components/PinSectionButton";
import ReadingProgressCard from "@/components/ReadingProgressCard";
import { useOptionalReader } from "@/components/ReaderProvider";
import { getStorySections } from "@/lib/storybook";

export default function FavoritesView() {
  const reader = useOptionalReader();
  const sections = getStorySections();
  const byId = new Map(sections.map((s) => [s.id, s]));
  const favoriteIds = reader?.favoriteChapterIds ?? [];
  const visitedIds = new Set(reader?.visitedChapterIds ?? []);
  const favorites = favoriteIds
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const unpinnedVisited = sections.filter(
    (s) => visitedIds.has(s.id) && !favoriteIds.includes(s.id),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ReadingProgressCard />

      <section className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#db2777]">
          My Path
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Build your own story flow
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[#6f5c49]">
          Pin chapters while you read (☆ → ★). Arrange them here in any order — that becomes your
          personal path through the family story. Progress above tracks every chapter you have
          opened.
        </p>

        {favorites.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[#f9a8d4] bg-[#fdf2f8] p-6 text-center">
            <p className="font-serif text-lg font-semibold text-[#9d174d]">No pins yet</p>
            <p className="mt-2 text-sm text-[#6f5c49]">
              Open any chapter and tap <strong>Pin to My Path</strong>, or star sections from the
              chapter list below.
            </p>
            <Link
              href="/story"
              className="mt-4 inline-block rounded-full bg-[#db2777] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#be185d]"
            >
              Browse storybook →
            </Link>
          </div>
        ) : (
          <ol className="mt-6 space-y-3">
            {favorites.map((section, index) => {
              const prevFav = favorites[index - 1];
              const nextFav = favorites[index + 1];
              return (
                <li
                  key={section.id}
                  className="rounded-2xl border border-[#f9a8d4] bg-[#fffafb] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#db2777]">
                        <span className="rounded-full bg-[#fce7f3] px-2 py-0.5">
                          Step {index + 1}
                        </span>
                        <span>
                          {section.yearStart}
                          {section.yearEnd ? `–${section.yearEnd}` : ""}
                        </span>
                        {visitedIds.has(section.id) && (
                          <span className="rounded-full bg-[#efe4d2] px-2 py-0.5 text-[#8b5e34]">
                            Opened
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/story/${section.id}`}
                        className="mt-1 block font-serif text-xl font-semibold text-[#2b2118] hover:text-[#9d174d]"
                      >
                        {section.title}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-sm text-[#6f5c49]">{section.teaser}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => reader?.moveFavorite(section.id, "up")}
                          className="rounded-full bg-[#efe4d2] px-3 py-1 text-xs font-semibold text-[#5c4a38] disabled:opacity-30"
                          title="Move earlier in path"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={index >= favorites.length - 1}
                          onClick={() => reader?.moveFavorite(section.id, "down")}
                          className="rounded-full bg-[#efe4d2] px-3 py-1 text-xs font-semibold text-[#5c4a38] disabled:opacity-30"
                          title="Move later in path"
                        >
                          ↓
                        </button>
                        <PinSectionButton sectionId={section.id} />
                      </div>
                      <Link
                        href={`/story/${section.id}`}
                        className="text-sm font-semibold text-[#db2777] hover:underline"
                      >
                        Read →
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[#fce7f3] pt-3 text-xs">
                    {prevFav && (
                      <Link
                        href={`/story/${prevFav.id}`}
                        className="rounded-full bg-white px-3 py-1 font-medium text-[#6f5c49] hover:bg-[#efe4d2]"
                      >
                        ← {prevFav.title}
                      </Link>
                    )}
                    {nextFav && (
                      <Link
                        href={`/story/${nextFav.id}`}
                        className="rounded-full bg-white px-3 py-1 font-medium text-[#6f5c49] hover:bg-[#efe4d2] sm:ml-auto"
                      >
                        {nextFav.title} →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {favorites.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/story/${favorites[0]!.id}`}
              className="rounded-full bg-[#db2777] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#be185d]"
            >
              Start my path from the beginning
            </Link>
            {reader?.session?.lastChapterId &&
              favoriteIds.includes(reader.session.lastChapterId) && (
                <Link
                  href={`/story/${reader.session.lastChapterId}`}
                  className="rounded-full bg-[#efe4d2] px-5 py-2.5 text-sm font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
                >
                  Continue where I left off
                </Link>
              )}
          </div>
        )}
      </section>

      {unpinnedVisited.length > 0 && (
        <section className="rounded-3xl border border-[#e2d4bf] bg-[#fffaf2] p-6">
          <h3 className="font-serif text-xl font-semibold">Recently opened (not pinned)</h3>
          <p className="mt-1 text-sm text-[#6f5c49]">
            Star any of these to add them to your path.
          </p>
          <ul className="mt-4 space-y-2">
            {unpinnedVisited.map((section) => (
              <li
                key={section.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e2d4bf] bg-white px-4 py-3"
              >
                <Link
                  href={`/story/${section.id}`}
                  className="min-w-0 flex-1 font-medium text-[#2b2118] hover:text-[#8b5e34]"
                >
                  {section.title}
                </Link>
                <PinSectionButton sectionId={section.id} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border border-[#e2d4bf] bg-white p-6">
        <h3 className="font-serif text-xl font-semibold">All chapters</h3>
        <p className="mt-1 text-sm text-[#6f5c49]">
          Pin ahead of time to sketch the journey you want.
        </p>
        <ul className="mt-4 space-y-2">
          {sections.map((section) => (
            <li
              key={section.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/story/${section.id}`}
                  className="font-medium text-[#2b2118] hover:text-[#8b5e34]"
                >
                  {section.title}
                </Link>
                <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                  <span>
                    {section.yearStart}
                    {section.yearEnd ? `–${section.yearEnd}` : ""}
                  </span>
                  {visitedIds.has(section.id) && <span className="text-[#6f5c49]">Opened</span>}
                  {favoriteIds.includes(section.id) && (
                    <span className="text-[#db2777]">On path</span>
                  )}
                </div>
              </div>
              <PinSectionButton sectionId={section.id} compact />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
