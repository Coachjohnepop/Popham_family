import { getFamilyTree, getTreePerson, type TreePerson } from "@/lib/family-tree";

export type PersonMatch = {
  person: TreePerson;
  displayName: string;
};

type NameEntry = {
  person: TreePerson;
  pattern: string;
};

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildNameEntries(): NameEntry[] {
  const { people } = getFamilyTree();
  const entries: NameEntry[] = [];

  for (const person of people) {
    entries.push({ person, pattern: person.name });
    const firstLast = person.name.split(/\s+/).slice(0, 2).join(" ");
    if (firstLast.length >= 4 && firstLast !== person.name) {
      entries.push({ person, pattern: firstLast });
    }
    if (person.id === "mary-goodwater") {
      entries.push({ person, pattern: "Mary Ann Goodwater" });
    }
    if (person.id === "joseph-warren-coss") {
      entries.push({ person, pattern: "Joseph Warren Coss" });
    }
  }

  const seen = new Set<string>();
  return entries
    .filter((e) => {
      const key = `${e.person.id}:${normalizeForMatch(e.pattern)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return e.pattern.length >= 4;
    })
    .sort((a, b) => b.pattern.length - a.pattern.length);
}

let cachedEntries: NameEntry[] | null = null;

function getNameEntries(): NameEntry[] {
  if (!cachedEntries) cachedEntries = buildNameEntries();
  return cachedEntries;
}

export function findPersonByName(name: string): TreePerson | undefined {
  const target = normalizeForMatch(name);
  for (const entry of getNameEntries()) {
    if (normalizeForMatch(entry.pattern) === target) return entry.person;
  }
  return undefined;
}

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "person"; value: string; personId: string; personName: string };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitTextByPeople(text: string): TextSegment[] {
  const entries = getNameEntries();
  if (!entries.length) return [{ type: "text", value: text }];

  const pattern = entries.map((e) => escapeRegex(e.pattern)).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const matchedText = match[0];
    const entry = entries.find(
      (e) => normalizeForMatch(e.pattern) === normalizeForMatch(matchedText),
    );
    if (entry) {
      segments.push({
        type: "person",
        value: matchedText,
        personId: entry.person.id,
        personName: entry.person.name,
      });
    } else {
      segments.push({ type: "text", value: matchedText });
    }
    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: text }];
}

export function getPersonLineage(personId: string): {
  parents: TreePerson[];
  spouse?: TreePerson;
  children: TreePerson[];
} {
  const tree = getFamilyTree();
  const person = getTreePerson(personId);
  if (!person) return { parents: [], children: [] };

  const parents = (person.parents ?? [])
    .map((id) => getTreePerson(id))
    .filter((p): p is TreePerson => Boolean(p));

  const spouse = person.spouseId ? getTreePerson(person.spouseId) : undefined;

  const children = tree.people.filter((p) => p.parents?.includes(personId));

  return { parents, spouse, children };
}