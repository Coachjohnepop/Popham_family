#!/usr/bin/env python3
"""Extract Dad's format rules, direct family names, family index, and references from the docx."""

from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

DEFAULT_DOCX = Path.home() / "Library/CloudStorage/Dropbox/THE STORY OF WINIDRED COSS FAMILY TREE.docx"
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

FAMOUS_PEOPLE = [
    "Queen Elizabeth I",
    "Queen Mary I",
    "Queen Mary",
    "King Henry VIII",
    "King Henry VII",
    "Henry VIII",
    "Henry VII",
    "Henry Tudor",
    "Martin Luther",
    "Jacques Cartier",
    "Samuel de Champlain",
    "John Winthrop",
    "George Washington",
    "Thomas Jefferson",
    "Benjamin Franklin",
    "Abraham Lincoln",
    "Robert Giffard",
    "Paul Le Jeune",
    "William Bradford",
    "Myles Standish",
    "Metacom",
    "King Philip",
    "Napoleon Bonaparte",
    "Francis Drake",
    "John Calvin",
    "Pope Leo X",
    "Pope Pius V",
    "Charles V",
    "King James I",
    "King James V",
    "King Charles I",
    "King Edward VI",
    "Johannes Gutenberg",
    "Christopher Columbus",
    "Sir Humphrey Gilbert",
    "Captain John Smith",
    "Henry Hudson",
    "William Laud",
    "Lady Jane Grey",
    "Anne Boleyn",
]

SKIP_NAME_FRAGMENTS = {
    "bold type",
    "protestant reformation",
    "church of england",
    "book of common prayer",
    "act of supremacy",
    "penal laws",
    "battle of bosworth field",
    "dissolution of the monasteries",
    "puritans",
    "separatists",
    "indulgences",
    "church money-making scheme",
    "protestantism",
    "american revolution",
    "american revolutionary war",
    "anglo-french war",
    "note",
    "see the",
    "winifred eloise coss",
    "edith powers",
    "mary ann goodwater",
}


def load_paragraphs(docx: Path) -> list[str]:
    with zipfile.ZipFile(docx) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    paragraphs: list[str] = []
    for p in root.iter(f"{W}p"):
        parts = []
        for r in p.findall(f"{W}r"):
            parts.extend(t.text or "" for t in r.findall(f"{W}t"))
        text = "".join(parts).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def extract_format_rules(paragraphs: list[str]) -> list[dict]:
    rules: list[dict] = []
    capture = False
    for text in paragraphs:
        if text == "Format of the Story":
            capture = True
            continue
        if capture:
            if text in {"Edith Powers' Family Tree Story", "Edith Powers\u2019 Family Tree Story"}:
                break
            if text.startswith("Edith Powers") and "Family Tree Story" in text:
                break
            rules.append({"text": re.sub(r"\s+", " ", text).strip()})
    return rules


def clean_name(raw: str) -> str | None:
    name = re.sub(r"\s+", " ", raw).strip()
    name = re.sub(r"^[\d\s]+", "", name)
    name = re.sub(
        r"^(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-\w+)?-year-old\s+",
        "",
        name,
        flags=re.I,
    )
    name = re.sub(r"^(?:widow|widower)\s+", "", name, flags=re.I)
    if not name or len(name) < 4 or len(name) > 72:
        return None
    if name.lower() in SKIP_NAME_FRAGMENTS:
        return None
    if re.match(r"^\d", name):
        return None
    return name


def split_couple_names(name: str) -> list[str]:
    if " and " not in name.lower():
        cleaned = clean_name(name)
        return [cleaned] if cleaned else []
    parts = re.split(r"\s+and\s+", name, flags=re.I)
    out: list[str] = []
    for part in parts:
        cleaned = clean_name(part)
        if cleaned:
            out.append(cleaned)
    return out


def extract_family_data(paragraphs: list[str]) -> tuple[list[str], list[dict], list[str]]:
    direct_names: set[str] = set()
    index_entries: list[dict] = []
    notes: list[str] = []
    seen_index: set[str] = set()

    event_re = re.compile(
        r"(?:was born|were married|married|died|left|sailed|arrived|became|enlisted|received|applied|filed|baptized)",
        re.I,
    )
    lead_re = re.compile(r"^(?:On|Sometime|About|In)\s+", re.I)

    for text in paragraphs:
        if text.startswith("Note:"):
            note = text[5:].strip()
            if note and note not in notes:
                notes.append(note)

        if not lead_re.match(text) or not event_re.search(text):
            continue

        year_match = re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", text)
        year = int(year_match.group(1)) if year_match else None

        name_match = re.search(
            r"(?:On|Sometime|About|In)\s+[^,]+,\s+(.+?)\s+(?:was born|were married|married|died|left|sailed|arrived|became|enlisted|received|applied|filed|baptized)",
            text,
            re.I,
        )
        if not name_match:
            continue

        raw_names = name_match.group(1)
        for name in split_couple_names(raw_names):
            direct_names.add(name)
            key = name.lower()
            if key in seen_index:
                continue
            seen_index.add(key)
            index_entries.append(
                {
                    "name": name,
                    "year": year,
                    "snippet": text[:220] + ("…" if len(text) > 220 else ""),
                }
            )

    index_entries.sort(key=lambda e: (e["year"] or 9999, e["name"].lower()))
    return sorted(direct_names, key=str.lower), index_entries, notes


def extract_references(paragraphs: list[str], notes: list[str]) -> list[dict]:
    refs: list[dict] = []
    seen: set[str] = set()

    def add(kind: str, title: str, detail: str) -> None:
        key = f"{kind}:{title[:80]}"
        if key in seen:
            return
        seen.add(key)
        refs.append({"kind": kind, "title": title, "detail": detail})

    add(
        "source",
        "Family Tree Maker",
        "Individual birth, marriage, and death sources are kept in the Family Tree Maker database — not as footnotes in the narrative.",
    )
    add(
        "source",
        "Historical references",
        "A list of important historical references appears at the end of the original document. Cross-document notes below point to related family papers.",
    )

    for note in notes:
        if "Long Road to the Constitution" in note:
            add("related-document", "Long Road to the Constitution", note)
        elif "Morris Rankin Batie" in note:
            add("related-document", "Story of Morris Rankin Batie\u2019s Family", note)
        elif "Carolee" in note or "McCance" in note:
            add("related-document", "Story of Carolee Afton McCance\u2019s Family", note)
        elif "Jessie Maud Paff" in note:
            add("related-document", "Story of Jessie Maud Paff branch", note)
        elif "Massachusetts Archives" in note:
            add("archive", "Massachusetts Archives", note)
        elif "witch" in note.lower() or "Salem" in note:
            add("topic", "Salem Witch Trials", note)

    for text in paragraphs:
        if "Massachusetts Archives" in text:
            add("archive", "Massachusetts Archives", text[:280])
        if "Family Tree Maker" in text and "Footnotes" in text:
            add("source", "Family Tree Maker (format note)", text[:280])

    return refs


def main() -> int:
    docx_path = DEFAULT_DOCX
    if not docx_path.exists():
        print(f"Missing docx: {docx_path}", file=sys.stderr)
        return 1

    paragraphs = load_paragraphs(docx_path)
    format_rules = extract_format_rules(paragraphs)
    direct_names, index_entries, notes = extract_family_data(paragraphs)
    references = extract_references(paragraphs, notes)

    # Tree seed names
    tree_path = DATA / "family-tree.seed.json"
    if tree_path.exists():
        tree = json.loads(tree_path.read_text(encoding="utf-8"))
        for person in tree.get("people", []):
            name = person.get("name", "")
            if name:
                direct_names = sorted(set(direct_names) | {name}, key=str.lower)

    payload_format = {
        "title": "Format of the Story",
        "rules": format_rules,
        "conventions": [
            {
                "id": "branches",
                "label": "Two branches",
                "detail": "Edith Powers (England) and Mary Ann Goodwater (Québec/France) converge when Joseph Warren Coss marries Mary Ann Goodwater in 1853.",
            },
            {
                "id": "bold-names",
                "label": "Bold direct family",
                "detail": "Names of direct family members appear in bold in the narrative. Purple names can be clicked for more detail.",
            },
            {
                "id": "maiden-names",
                "label": "Maiden names",
                "detail": "Women are listed by maiden name until marriage; after marriage the maiden name appears in parentheses.",
            },
            {
                "id": "locations",
                "label": "Modern place names",
                "detail": "Locations use current names so they can be found on Internet map applications.",
            },
            {
                "id": "date-estimates",
                "label": "Estimated dates",
                "detail": "When records are missing, dates are listed as about, before, after, or late.",
            },
            {
                "id": "famous-vs-family",
                "label": "Famous vs. family",
                "detail": "Some figures are world-famous; most ancestors are known by a single fact. Both appear in the story where history touches the family.",
            },
            {
                "id": "sources",
                "label": "Sources",
                "detail": "Footnotes are omitted to keep the story readable. Source detail lives in Family Tree Maker; historical references are listed separately.",
            },
        ],
    }

    payload_names = {
        "count": len(direct_names),
        "names": direct_names,
        "famousPeople": sorted(FAMOUS_PEOPLE, key=len, reverse=True),
    }

    payload_index = {
        "count": len(index_entries),
        "entries": index_entries,
    }

    payload_refs = {
        "count": len(references),
        "entries": references,
        "notes": notes,
    }

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "story-format.json").write_text(json.dumps(payload_format, indent=2), encoding="utf-8")
    (DATA / "direct-family-names.json").write_text(json.dumps(payload_names, indent=2), encoding="utf-8")
    (DATA / "family-index.json").write_text(json.dumps(payload_index, indent=2), encoding="utf-8")
    (DATA / "story-references.json").write_text(json.dumps(payload_refs, indent=2), encoding="utf-8")

    print(f"format rules: {len(format_rules)}")
    print(f"direct names: {len(direct_names)}")
    print(f"index entries: {len(index_entries)}")
    print(f"references: {len(references)}")
    print(f"notes: {len(notes)}")
    return 0


if __name__ == "__main__":
    import sys

    raise SystemExit(main())