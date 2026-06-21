"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getKindLabel, searchEntries } from "@/lib/search";
import type { SearchEntry, SearchReference } from "@/lib/types";

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
  const [selected, setSelected] = useState<SearchEntry | null>(null);
  const [referenceIndex, setReferenceIndex] = useState(0);

  const results = useMemo(() => searchEntries(query), [query]);
  const activeReference: SearchReference | undefined =
    selected?.references[referenceIndex] ?? selected?.references[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setReferenceIndex(0);
  }, [selected?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openDocument(reference?: SearchReference) {
    const target = reference ?? activeReference;
    if (!target) return;
    setOpen(false);
    router.push(target.href);
  }

  function selectEntry(entry: SearchEntry) {
    setSelected(entry);
    setQuery(entry.label);
    setOpen(false);
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

    if (event.key === "Enter") {
      event.preventDefault();
      if (selected && activeReference) {
        openDocument(activeReference);
        return;
      }
      if (results[activeIndex]) {
        selectEntry(results[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setSelected(null);
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
          setSelected(null);
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
                  onClick={() => selectEntry(entry)}
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
                    {entry.summary[0] && (
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-[#5c4a38]">
                        {entry.summary[0]}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {selected && (
        <div className="mt-3 rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
                {getKindLabel(selected.kind)} · {selected.subtitle}
              </p>
              <h3 className="mt-1 font-serif text-lg font-semibold text-[#2b2118]">
                {selected.label}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs font-medium text-[#8b5e34] hover:underline"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 space-y-2 text-sm leading-relaxed text-[#5c4a38]">
            {selected.summary.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            {selected.references.length > 1 ? (
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                  Open in document
                </span>
                <select
                  value={referenceIndex}
                  onChange={(event) => setReferenceIndex(Number(event.target.value))}
                  className="w-full rounded-xl border border-[#d9cbb6] bg-white px-3 py-2 text-sm text-[#2b2118]"
                >
                  {selected.references.map((reference, index) => (
                    <option key={reference.href} value={index}>
                      {reference.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="flex-1 text-xs text-[#6f5c49]">
                Opens: {selected.references[0]?.label ?? "Document"}
              </p>
            )}

            <button
              type="button"
              onClick={() => openDocument()}
              className="rounded-full bg-[#8b5e34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6f4a28]"
            >
              Open
            </button>
          </div>
        </div>
      )}
    </div>
  );
}