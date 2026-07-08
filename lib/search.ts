import type { SearchIndexData, SearchEntry, SearchKind } from "@/lib/types";
import searchIndex from "@/data/search.index.json";

const index = searchIndex as SearchIndexData;

export function getSearchIndex(): SearchIndexData {
  return index;
}

export function getSearchEntries(): SearchEntry[] {
  return index.entries;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreEntry(entry: SearchEntry, query: string): number {
  const q = normalize(query.trim());
  if (!q) return 0;

  const label = normalize(entry.label);
  const subtitle = normalize(entry.subtitle);
  const terms = entry.terms.map(normalize).join(" ");

  if (label === q) return 120;
  if (label.startsWith(q)) return 95;
  if (label.includes(q)) return 75;
  if (subtitle.includes(q)) return 65;
  if (entry.terms.some((term) => normalize(term).startsWith(q))) return 58;
  if (terms.includes(q)) return 50;

  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((word) => terms.includes(word))) {
    return 42;
  }
  if (words.some((word) => label.includes(word) || terms.includes(word))) {
    return 30;
  }

  return 0;
}

export function searchEntriesRanked(
  query: string,
  limit = 8,
): Array<{ entry: SearchEntry; score: number }> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return index.entries
    .map((entry) => ({ entry, score: scoreEntry(entry, trimmed) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.entry.year ?? 9999) - (b.entry.year ?? 9999))
    .slice(0, limit);
}

export function searchEntries(query: string, limit = 8): SearchEntry[] {
  return searchEntriesRanked(query, limit).map((item) => item.entry);
}

export function searchFromQueries(
  queries: string[],
  limit = 8,
): Array<{ entry: SearchEntry; score: number }> {
  const byId = new Map<string, { entry: SearchEntry; score: number }>();

  for (const query of queries) {
    const trimmed = query.trim();
    if (!trimmed) continue;

    for (const item of searchEntriesRanked(trimmed, limit * 2)) {
      const prev = byId.get(item.entry.id);
      if (!prev || item.score > prev.score) {
        byId.set(item.entry.id, item);
      }
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.score - a.score || (a.entry.year ?? 9999) - (b.entry.year ?? 9999))
    .slice(0, limit);
}

export function getKindLabel(kind: SearchKind): string {
  switch (kind) {
    case "event":
      return "Event";
    case "chapter":
      return "Chapter";
    case "person":
      return "Person";
    case "place":
      return "Place";
  }
}