"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getKindLabel, searchEntries } from "@/lib/search";
import type { SearchEntry } from "@/lib/types";

const KIND_STYLES: Record<SearchEntry["kind"], string> = {
  event: "bg-[#dbeafe] text-[#1e3a8a]",
  chapter: "bg-[#efe4d2] text-[#5c4a38]",
  person: "bg-[#f3e8ff] text-[#5b3c88]",
  place: "bg-[#dcfce7] text-[#166534]",
};

type EventSearchProps = {
  className?: string;
  placeholder?: string;
};

export default function EventSearch({
  className = "",
  placeholder = "Search events, people, places, chapters…",
}: EventSearchProps) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => searchEntries(query), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(entry: SearchEntry) {
    setQuery(entry.label);
    setOpen(false);
    router.push(entry.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      goTo(results[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showResults = open && query.trim().length > 0;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <label className="sr-only" htmlFor={`${listboxId}-input`}>
        Search family history
      </label>
      <input
        id={`${listboxId}-input`}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showResults}
        aria-controls={showResults ? `${listboxId}-listbox` : undefined}
        aria-autocomplete="list"
        className="w-full rounded-full border border-[#d9cbb6] bg-white px-4 py-2.5 text-sm text-[#2b2118] shadow-sm outline-none transition placeholder:text-[#9a8570] focus:border-[#8b5e34] focus:ring-2 focus:ring-[#8b5e34]/20"
      />

      {showResults && (
        <ul
          id={`${listboxId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-[#e2d4bf] bg-white py-2 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[#6f5c49]">No matches for “{query}”</li>
          ) : (
            results.map((entry, index) => (
              <li key={entry.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goTo(entry)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                    index === activeIndex ? "bg-[#fffaf2]" : "hover:bg-[#fffaf2]"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_STYLES[entry.kind]}`}
                  >
                    {getKindLabel(entry.kind)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-[#2b2118]">{entry.label}</span>
                    <span className="block text-xs text-[#6f5c49]">{entry.subtitle}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}