import familyIndexData from "@/data/family-index.json";
import storyFormatData from "@/data/story-format.json";
import storyReferencesData from "@/data/story-references.json";
import { getDirectFamilyNames, getFamousPeopleNames } from "@/lib/direct-family-names";
import { findPersonByName } from "@/lib/person-match";

export type StoryFormatConvention = {
  id: string;
  label: string;
  detail: string;
};

export type StoryFormatData = {
  title: string;
  rules: { text: string }[];
  conventions: StoryFormatConvention[];
};

export type FamilyIndexEntry = {
  name: string;
  year: number | null;
  snippet: string;
};

export type StoryReferenceEntry = {
  kind: string;
  title: string;
  detail: string;
};

export type StoryTextSegment =
  | { type: "text"; value: string }
  | { type: "family"; value: string; personId?: string }
  | { type: "famous"; value: string }
  | { type: "maiden"; value: string }
  | { type: "date-estimate"; value: string };

const formatData = storyFormatData as StoryFormatData;
const directNames = getDirectFamilyNames();
const famousPeople = getFamousPeopleNames();
const familyIndex = familyIndexData as { count: number; entries: FamilyIndexEntry[] };
const references = storyReferencesData as {
  count: number;
  entries: StoryReferenceEntry[];
  notes: string[];
};

export function getStoryFormat(): StoryFormatData {
  return formatData;
}

export function getFamilyIndex(): FamilyIndexEntry[] {
  return familyIndex.entries;
}

export function getFamilyIndexEntry(name: string): FamilyIndexEntry | undefined {
  const target = normalizeForMatch(name);
  return familyIndex.entries.find((entry) => normalizeForMatch(entry.name) === target);
}

export function getStoryReferences(): StoryReferenceEntry[] {
  return references.entries;
}

export function getStoryNotes(): string[] {
  return references.notes;
}

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sortedFamilyNames = [...directNames].sort((a, b) => b.length - a.length);
const sortedFamousNames = [...famousPeople].sort((a, b) => b.length - a.length);

const familyPattern = sortedFamilyNames.length
  ? new RegExp(
      `(${sortedFamilyNames.map((name) => escapeRegex(name)).join("|")})`,
      "gi",
    )
  : null;

const famousPattern = sortedFamousNames.length
  ? new RegExp(
      `(${sortedFamousNames.map((name) => escapeRegex(name)).join("|")})`,
      "gi",
    )
  : null;

const maidenPattern = /\(([A-Z][A-Za-zÀ-ÿ'’./\- ]{1,48})\)/g;
const dateEstimatePattern = /\b(about|before|after|late)\b/gi;

type MatchKind = "maiden" | "date-estimate" | "famous" | "family";

type PendingMatch = {
  index: number;
  length: number;
  kind: MatchKind;
  value: string;
  personId?: string;
};

const KIND_PRIORITY: Record<MatchKind, number> = {
  maiden: 4,
  "date-estimate": 3,
  famous: 2,
  family: 1,
};

function considerMatch(best: PendingMatch | null, candidate: PendingMatch): PendingMatch {
  if (!best) return candidate;
  if (candidate.index < best.index) return candidate;
  if (candidate.index > best.index) return best;
  if (candidate.length > best.length) return candidate;
  if (candidate.length < best.length) return best;
  return KIND_PRIORITY[candidate.kind] >= KIND_PRIORITY[best.kind] ? candidate : best;
}

function findNextMatch(text: string, from: number): PendingMatch | null {
  let best: PendingMatch | null = null;

  maidenPattern.lastIndex = from;
  let maiden: RegExpExecArray | null;
  while ((maiden = maidenPattern.exec(text)) !== null) {
    best = considerMatch(best, {
      index: maiden.index,
      length: maiden[0].length,
      kind: "maiden",
      value: maiden[0],
    });
    break;
  }

  dateEstimatePattern.lastIndex = from;
  let estimate: RegExpExecArray | null;
  while ((estimate = dateEstimatePattern.exec(text)) !== null) {
    best = considerMatch(best, {
      index: estimate.index,
      length: estimate[0].length,
      kind: "date-estimate",
      value: estimate[0],
    });
    break;
  }

  if (famousPattern) {
    famousPattern.lastIndex = from;
    let famous: RegExpExecArray | null;
    while ((famous = famousPattern.exec(text)) !== null) {
      best = considerMatch(best, {
        index: famous.index,
        length: famous[0].length,
        kind: "famous",
        value: famous[0],
      });
      break;
    }
  }

  if (familyPattern) {
    familyPattern.lastIndex = from;
    let family: RegExpExecArray | null;
    while ((family = familyPattern.exec(text)) !== null) {
      const matched = family[0];
      const person = findPersonByName(matched);
      best = considerMatch(best, {
        index: family.index,
        length: matched.length,
        kind: "family",
        value: matched,
        personId: person?.id,
      });
      break;
    }
  }

  return best;
}

export function splitFormattedStoryText(text: string): StoryTextSegment[] {
  if (!text) return [{ type: "text", value: "" }];

  const segments: StoryTextSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = findNextMatch(text, cursor);
    if (!match || match.index > text.length) {
      segments.push({ type: "text", value: text.slice(cursor) });
      break;
    }

    if (match.index > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, match.index) });
    }

    if (match.kind === "family") {
      segments.push({
        type: "family",
        value: match.value,
        personId: match.personId,
      });
    } else if (match.kind === "famous") {
      segments.push({ type: "famous", value: match.value });
    } else if (match.kind === "maiden") {
      segments.push({ type: "maiden", value: match.value });
    } else {
      segments.push({ type: "date-estimate", value: match.value });
    }

    cursor = match.index + match.length;
  }

  return segments.length ? segments : [{ type: "text", value: text }];
}