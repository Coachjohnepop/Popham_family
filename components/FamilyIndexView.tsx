"use client";

import { useMemo, useState } from "react";
import { getFamilyIndex } from "@/lib/story-format";

export default function FamilyIndexView() {
  const entries = useMemo(() => getFamilyIndex(), []);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) || entry.snippet.toLowerCase().includes(q),
    );
  }, [entries, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          Index
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Family index</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6f5c49]">
          Birth, marriage, and life events for direct family members — drawn from the original
          document. Death dates for ordinary ancestors appear here rather than in the narrative,
          per Dad&apos;s format rules.
        </p>
        <label className="mt-6 block max-w-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
            Search names
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Coss, Goodwater, Raymond"
            className="mt-2 w-full rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8b5e34]"
          />
        </label>
        <p className="mt-3 text-xs text-[#6f5c49]">
          {filtered.length} of {entries.length} indexed entries
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((entry, index) => (
          <article
            key={`${entry.name}-${entry.year ?? "na"}-${index}`}
            className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-4"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-[#2b2118]">{entry.name}</h2>
              {entry.year && (
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
                  {entry.year}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#6f5c49]">{entry.snippet}</p>
          </article>
        ))}
      </div>
    </div>
  );
}