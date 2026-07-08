import { searchFromQueries } from "@/lib/search";
import type { SearchEntry } from "@/lib/types";

export type AskSearchResult = {
  topicLabel: string;
  directMatch: boolean;
  intro: string;
  entries: SearchEntry[];
  totalRanked: number;
};

type TopicAlias = {
  id: string;
  label: string;
  phrases: string[];
  directTerms: string[];
  relatedQueries: string[];
  notInDocumentNote: string;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "at",
  "be",
  "by",
  "did",
  "do",
  "family",
  "for",
  "from",
  "get",
  "had",
  "has",
  "have",
  "how",
  "if",
  "in",
  "involved",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "people",
  "tell",
  "that",
  "the",
  "their",
  "them",
  "this",
  "to",
  "tree",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "about",
  "all",
  "into",
  "movement",
  "party",
  "question",
]);

const TOPIC_ALIASES: TopicAlias[] = [
  {
    id: "boston-tea-party",
    label: "Boston Tea Party",
    phrases: ["boston tea party", "tea party", "sons of liberty", "tea act"],
    directTerms: ["tea party", "boston tea", "sons of liberty", "tea act", "december 16 1773"],
    relatedQueries: ["american revolutionary", "continental army", "1775", "1778", "new hampshire regiment"],
    notInDocumentNote:
      "The family narrative does not mention the Boston Tea Party (1773). The closest documented ties are relatives who enlisted in the Continental Army during the American Revolutionary War, a few years later.",
  },
  {
    id: "american-revolution",
    label: "American Revolution",
    phrases: ["american revolution", "revolutionary war", "continental army", "independence war"],
    directTerms: ["american revolution", "revolutionary war", "continental army", "continental troops"],
    relatedQueries: ["josiah powers", "1775", "1778", "new hampshire regiment"],
    notInDocumentNote:
      "The family tree records Revolutionary War service, especially Josiah Powers Jr. in New Hampshire regiments.",
  },
  {
    id: "salem-witch-trials",
    label: "Salem Witch Trials",
    phrases: ["salem witch", "witch trials", "witchcraft", "martha sparks"],
    directTerms: ["witch", "witchcraft", "salem", "martha sparks", "barrett sparks"],
    relatedQueries: ["martha barrett sparks", "chelmsford", "1691"],
    notInDocumentNote: "",
  },
];

const DIRECT_MATCH_SCORE = 45;
const MIN_RESULT_SCORE = 28;
const DEFAULT_LIMIT = 4;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectTopicAlias(normalized: string): TopicAlias | undefined {
  let best: TopicAlias | undefined;
  let bestLen = 0;

  for (const alias of TOPIC_ALIASES) {
    for (const phrase of alias.phrases) {
      if (normalized.includes(phrase) && phrase.length > bestLen) {
        best = alias;
        bestLen = phrase.length;
      }
    }
  }

  return best;
}

function extractQueryPhrases(question: string, alias?: TopicAlias): string[] {
  const normalized = normalize(question);
  const phrases = new Set<string>();

  if (alias) {
    for (const phrase of alias.phrases) {
      if (normalized.includes(phrase)) phrases.add(phrase);
    }
    for (const query of alias.relatedQueries) phrases.add(query);
  }

  if (!alias && normalized) phrases.add(normalized);

  const words = normalized.split(/\s+/).filter((w) => !STOP_WORDS.has(w) && w.length > 2);
  if (words.length) {
    if (!alias) phrases.add(words.join(" "));
    for (let i = 0; i < words.length; i++) {
      if (i + 1 < words.length) phrases.add(`${words[i]} ${words[i + 1]}`);
      if (i + 2 < words.length) phrases.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }

  return [...phrases].filter(Boolean);
}

const REVOLUTION_BOOST_TERMS = ["revolutionary", "continental", "1775", "1778", "regiment", "enlisted"];

function boostRankedForAlias(
  ranked: Array<{ entry: SearchEntry; score: number }>,
  alias: TopicAlias,
): Array<{ entry: SearchEntry; score: number }> {
  if (alias.id !== "boston-tea-party" && alias.id !== "american-revolution") {
    return ranked;
  }

  return ranked
    .map((item) => {
      const haystack = normalize(
        [item.entry.label, item.entry.subtitle, ...item.entry.summary, ...item.entry.terms].join(
          " ",
        ),
      );
      const boost = REVOLUTION_BOOST_TERMS.some((term) => haystack.includes(term)) ? 18 : 0;
      return { ...item, score: item.score + boost };
    })
    .sort((a, b) => b.score - a.score || (a.entry.year ?? 9999) - (b.entry.year ?? 9999));
}

function entryMentionsTerms(entry: SearchEntry, terms: string[]): boolean {
  const haystack = normalize(
    [entry.label, entry.subtitle, ...entry.summary, ...entry.terms].join(" "),
  );
  return terms.some((term) => haystack.includes(normalize(term)));
}

function buildIntro(
  topicLabel: string,
  directMatch: boolean,
  alias: TopicAlias | undefined,
  topEntry?: SearchEntry,
): string {
  if (directMatch && topEntry) {
    return `Here's what the family tree records about ${topicLabel}, starting with ${topEntry.label.replace(/…$/, "").trim()}.`;
  }

  if (alias?.notInDocumentNote) {
    return alias.notInDocumentNote;
  }

  if (topEntry) {
    return `I couldn't find an exact match for "${topicLabel}" in the indexed narrative. These are the closest related entries.`;
  }

  return `I couldn't find "${topicLabel}" in the indexed family narrative.`;
}

export function buildSearchAnswer(
  question: string,
  opts?: { limit?: number; offset?: number },
): AskSearchResult | null {
  const limit = opts?.limit ?? DEFAULT_LIMIT;
  const offset = opts?.offset ?? 0;
  const normalized = normalize(question);
  if (!normalized) return null;

  const alias = detectTopicAlias(normalized);
  const topicLabel = alias?.label ?? question.trim();
  const queries = extractQueryPhrases(question, alias);

  let ranked = searchFromQueries(queries, 24).filter((item) => item.score >= MIN_RESULT_SCORE);
  if (alias) ranked = boostRankedForAlias(ranked, alias);
  if (!ranked.length) return null;

  const directQueries = alias
    ? alias.phrases.filter((p) => normalized.includes(p))
    : queries.slice(0, 4);

  const directRanked = searchFromQueries(directQueries, 12).filter(
    (item) => item.score >= DIRECT_MATCH_SCORE,
  );

  let directMatch =
    directRanked.length > 0 &&
    (!alias || directRanked.some((item) => entryMentionsTerms(item.entry, alias.directTerms)));

  if (alias && !directMatch) {
    const aliasDirectHits = ranked.filter((item) => entryMentionsTerms(item.entry, alias.directTerms));
    directMatch = aliasDirectHits.length > 0 && aliasDirectHits[0].score >= DIRECT_MATCH_SCORE;
  }

  const ordered = directMatch
    ? [...directRanked, ...ranked.filter((r) => !directRanked.some((d) => d.entry.id === r.entry.id))]
    : ranked;

  const deduped: SearchEntry[] = [];
  const seen = new Set<string>();
  for (const item of ordered) {
    if (seen.has(item.entry.id)) continue;
    seen.add(item.entry.id);
    deduped.push(item.entry);
  }

  const page = deduped.slice(offset, offset + limit);
  if (!page.length) return null;

  return {
    topicLabel,
    directMatch,
    intro: buildIntro(topicLabel, directMatch, alias, page[0]),
    entries: page,
    totalRanked: deduped.length,
  };
}

export function getMoreSearchEntries(
  question: string,
  alreadyShown: number,
  limit = 3,
): SearchEntry[] {
  const result = buildSearchAnswer(question, { limit: alreadyShown + limit, offset: alreadyShown });
  return result?.entries ?? [];
}