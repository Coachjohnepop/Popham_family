"use client";

import Link from "next/link";
import FlowerBouquet from "@/components/FlowerBouquet";
import SiteBrandHeader from "@/components/SiteBrandHeader";
import { useOptionalReader } from "@/components/ReaderProvider";
import {
  computeSubjectsProgress,
  getStorySubjects,
} from "@/lib/subjects";

export default function SubjectsChecklistView() {
  const reader = useOptionalReader();
  const subjects = getStorySubjects();
  const coveredIds = reader?.coveredSubjectIds ?? [];
  const coveredSet = new Set(coveredIds);
  const { covered, total, pct } = computeSubjectsProgress(coveredIds);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:py-12">
      <SiteBrandHeader size="app" />

      <section className="rounded-2xl border border-[#e2d4bf] bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex items-center gap-3">
          <FlowerBouquet size="sm" />
          <h2 className="shrink-0 font-serif text-lg font-semibold text-[#2b2118] sm:text-xl">
            Subjects covered
          </h2>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex justify-between text-xs font-semibold text-[#5c4a38]">
              <span>
                {covered}/{total}
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#efe4d2]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5f9e5f] to-[#c97b9a] transition-all duration-500"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Subjects covered"
              />
            </div>
          </div>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {subjects.map((subject) => {
          const isCovered = coveredSet.has(subject.id);
          return (
            <li
              key={subject.id}
              className={`flex h-full flex-col rounded-2xl border p-3 transition sm:p-4 ${
                isCovered
                  ? "border-[#86efac] bg-[#f0fdf4]"
                  : "border-[#e2d4bf] bg-white"
              }`}
            >
              <div className="flex flex-1 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => reader?.toggleSubjectCovered(subject.id)}
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold transition ${
                    isCovered
                      ? "border-[#166534] bg-[#166534] text-white"
                      : "border-[#d9cbb6] bg-[#fffaf2] text-transparent hover:border-[#8b5e34]"
                  }`}
                  aria-pressed={isCovered}
                  aria-label={
                    isCovered
                      ? `Mark ${subject.title} not covered`
                      : `Mark ${subject.title} covered`
                  }
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#8b5e34] sm:text-[10px]">
                    <span>{subject.yearLabel}</span>
                    <span className="text-[#c8b08d]">·</span>
                    <span className="text-[#6f5c49]">{subject.branch}</span>
                    {isCovered && (
                      <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[#166534]">
                        Covered
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-serif text-base font-semibold leading-snug text-[#2b2118] sm:text-lg">
                    {subject.title}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs text-[#6f5c49] sm:text-sm">
                    {subject.summary}
                  </p>
                  <Link
                    href={`/story/${subject.chapterId}`}
                    className="mt-3 inline-block text-xs font-semibold text-[#8b5e34] hover:underline sm:text-sm"
                  >
                    Open related chapter →
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap justify-center gap-3 pb-8 pt-2">
        <Link
          href="/story"
          className="rounded-full bg-[#8b5e34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f4a28]"
        >
          Back to storybook
        </Link>
      </div>
    </div>
  );
}
