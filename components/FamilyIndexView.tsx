"use client";

import { useMemo, useState } from "react";
import { getFamilyIndex, type FamilyIndexEntry } from "@/lib/story-format";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function indexLetter(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[^a-zA-Z]+/, "");
  const ch = cleaned.charAt(0).toUpperCase();
  return ch >= "A" && ch <= "Z" ? ch : "#";
}

export default function FamilyIndexView() {
  const entries = useMemo(() => getFamilyIndex(), []);
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState<string | null>("A");

  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = { "#": 0 };
    for (const L of ALPHABET) counts[L] = 0;
    for (const entry of entries) {
      const L = indexLetter(entry.name);
      counts[L] = (counts[L] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  const byLetter = useMemo(() => {
    const map = new Map<string, FamilyIndexEntry[]>();
    for (const entry of entries) {
      const L = indexLetter(entry.name);
      const list = map.get(L) ?? [];
      list.push(entry);
      map.set(L, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return entries
        .filter(
          (entry) =>
            entry.name.toLowerCase().includes(q) || entry.snippet.toLowerCase().includes(q),
        )
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    if (letter) {
      return byLetter.get(letter) ?? [];
    }
    return entries;
  }, [entries, query, letter, byLetter]);

  const searching = query.trim().length > 0;
  const lettersWithNames = ALPHABET.filter((L) => (letterCounts[L] ?? 0) > 0);
  const hasHash = (letterCounts["#"] ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          Index
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">Family index</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6f5c49]">
          {entries.length} names from the family paper. Pick a letter, or search. Birth, marriage,
          and life notes for people in the tree — death dates for ordinary ancestors often appear
          here rather than in the narrative.
        </p>
        <label className="mt-6 block max-w-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
            Search names
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim()) setLetter(null);
            }}
            placeholder="e.g. Coss, Goodwater, Raymond"
            className="mt-2 w-full rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-sm outline-none focus:border-[#8b5e34]"
          />
        </label>
      </div>

      {/* A–Z chooser */}
      <div className="rounded-3xl border border-[#e2d4bf] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Jump to letter
          </p>
          {searching ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setLetter("A");
              }}
              className="text-xs font-semibold text-[#8b5e34] hover:underline"
            >
              Clear search · browse by letter
            </button>
          ) : null}
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Alphabet index"
        >
          {ALPHABET.map((L) => {
            const count = letterCounts[L] ?? 0;
            const disabled = count === 0;
            const active = !searching && letter === L;
            return (
              <button
                key={L}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => {
                  setQuery("");
                  setLetter(L);
                }}
                className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-sm font-bold transition ${
                  active
                    ? "bg-[#8b5e34] text-white shadow-sm"
                    : disabled
                      ? "cursor-not-allowed bg-[#f5f0e8] text-[#c8b08d] opacity-50"
                      : "bg-[#efe4d2] text-[#5c4a38] hover:bg-[#e4d4bc]"
                }`}
                title={disabled ? `No names under ${L}` : `${count} name${count === 1 ? "" : "s"}`}
              >
                {L}
              </button>
            );
          })}
          {hasHash ? (
            <button
              type="button"
              role="tab"
              aria-selected={!searching && letter === "#"}
              onClick={() => {
                setQuery("");
                setLetter("#");
              }}
              className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-sm font-bold transition ${
                !searching && letter === "#"
                  ? "bg-[#8b5e34] text-white shadow-sm"
                  : "bg-[#efe4d2] text-[#5c4a38] hover:bg-[#e4d4bc]"
              }`}
              title={`${letterCounts["#"]} other`}
            >
              #
            </button>
          ) : null}
        </div>
        {!searching && lettersWithNames.length > 0 ? (
          <p className="mt-3 text-xs text-[#6f5c49]">
            Letters with names: {lettersWithNames.join(" · ")}
          </p>
        ) : null}
      </div>

      {/* Names panel */}
      <div className="rounded-3xl border border-[#e2d4bf] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-[#e2d4bf] pb-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#2b2118] sm:text-2xl">
              {searching
                ? `Search results`
                : letter
                  ? letter === "#"
                    ? "Other names"
                    : `Names · ${letter}`
                  : "All names"}
            </h2>
            <p className="mt-1 text-sm text-[#6f5c49]">
              {filtered.length} name{filtered.length === 1 ? "" : "s"}
              {searching
                ? ` matching “${query.trim()}”`
                : letter && letter !== "#"
                  ? ` starting with ${letter}`
                  : ""}
              {" · "}
              {entries.length} total in index
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#6f5c49]">
            No names here
            {searching ? " for that search." : letter ? ` under ${letter}.` : "."}
            {searching ? " Try another spelling, or pick a letter above." : ""}
          </p>
        ) : (
          <ul className="max-h-[min(70vh,40rem)] space-y-3 overflow-y-auto pr-1">
            {filtered.map((entry, index) => (
              <li
                key={`${entry.name}-${entry.year ?? "na"}-${index}`}
                className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg font-semibold text-[#2b2118]">{entry.name}</h3>
                  {entry.year != null && (
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
                      {entry.year}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#6f5c49]">{entry.snippet}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
