#!/usr/bin/env python3
"""Phase 0: build a structured fact manifest from Dad's docx (no prose stored).

The manifest is the contract for a future narrative rewrite: every person and
dated event must appear as a structured row. Coverage is measured against the
current app (storybook, enriched sections, family index, timeline).
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DEFAULT_DOCX = Path.home() / "Library/CloudStorage/Dropbox/THE STORY OF WINIDRED COSS FAMILY TREE.docx"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

FAMILY_SURNAMES = {
    "coss",
    "powers",
    "goodwater",
    "bonneau",
    "alcock",
    "cloutier",
    "guyon",
    "giffard",
    "batie",
    "barrett",
    "sparks",
    "farnham",
    "hebert",
    "hébert",
    "carrier",
    "carriere",
    "carriére",
}

FAMOUS_PEOPLE = [
    "Henry VIII",
    "Henry VII",
    "Martin Luther",
    "Jacques Cartier",
    "Samuel de Champlain",
    "John Winthrop",
    "George Washington",
    "Thomas Jefferson",
    "Benjamin Franklin",
    "Abraham Lincoln",
    "Robert Giffard",
    "King Philip",
    "King James I",
    "King James VI",
    "Sir William Phips",
    "Queen Elizabeth I",
    "Queen Anne",
    "Napoleon Bonaparte",
    "Christopher Columbus",
]

EVENT_VERBS = re.compile(
    r"\b(was born|were married|married|died|sailed|arrived|enlisted|became|"
    r"baptized|accused|imprisoned|executed|hanged|petitioned|released|"
    r"fought|granted|settled|moved|left|received|applied|filed)\b",
    re.I,
)

PLACE_HINTS = re.compile(
    r"\b(?:town of |city of |province of |colony of |settlement of )?"
    r"([A-Z][A-Za-z' .-]{2,40}?)(?:\s+in\s+the\s+|\s+in\s+|\s*,|\s+and\s+|$)",
)

SKIP_HEADINGS = {
    "table of contents",
    "index",
    "references",
    "winifred eloise coss",
    "format of the story",
}

SKIP_NAME_FRAGMENTS = {
    "was born to",
    "were married",
    "and his wife",
    "his wife",
    "wife",
    "husband",
    "perche",
    "france",
    "england",
    "canada",
    "marie",
    "anne",
    "mary",
    "jean",
    "pierre",
    "joseph",
    "william",
    "elizabeth",
    "note",
    "see the",
    "bold type",
}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:96]


def normalize_token(text: str) -> str:
    text = text.lower().replace("\u2019", "'")
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def surname_from_person(name: str) -> str:
    name = re.sub(r"\([^)]*\)", "", name).strip()
    parts = [p for p in name.split() if p and p[0].isupper()]
    return normalize_token(parts[-1]) if parts else normalize_token(name)


def para_text_and_bold(p: ET.Element) -> tuple[str, bool, list[str]]:
    parts: list[str] = []
    bold_parts: list[str] = []
    has_bold = False
    for r in p.findall(f"{W}r"):
        run_bold = r.find(f"{W}rPr/{W}b") is not None
        if run_bold:
            has_bold = True
        run_text = "".join(t.text or "" for t in r.findall(f"{W}t"))
        parts.append(run_text)
        if run_bold and run_text.strip():
            bold_parts.append(run_text.strip())
    text = re.sub(r"\s+", " ", "".join(parts)).strip()
    return text, has_bold, bold_parts


def is_doc_chapter_heading(text: str, bold: bool) -> bool:
    if not bold or not text or len(text) > 90:
        return False
    if text.lower().strip() in SKIP_HEADINGS:
        return False
    if re.match(r"^(in|on|about|between|sometime|note:|see )", text, re.I):
        return False
    markers = (
        "colony",
        "war",
        "revolution",
        "history",
        "family tree",
        "reformation",
        "depression",
        "filles",
        "trials",
        "fleet",
        "settlement",
        "territory",
        "regiment",
        "dictionary",
        "voyage",
        "island",
        "québec",
        "quebec",
        "canada",
        "vermont",
        "dakota",
        "puritan",
        "branch members",
        "beaver",
        "hudson",
        "seigneurial",
        "praying indian",
        "restoration",
        "pequot",
        "salem",
    )
    return any(m in text.lower() for m in markers) or "Family Tree" in text


def clean_heading(text: str) -> str:
    return re.sub(r"\s+\d{1,3}$", "", text).strip()


def infer_branch(text: str) -> str:
    blob = text.lower()
    if any(
        k in blob
        for k in ("canada", "québec", "quebec", "perche", "goodwater", "filles", "iroquois", "beauport")
    ):
        return "goodwater"
    if any(k in blob for k in ("powers", "plymouth", "massachusetts", "salem", "winthrop", "puritan", "england")):
        return "powers"
    return "both"


def looks_like_name(raw: str) -> bool:
    raw = re.sub(r"\s+", " ", raw).strip(" ,.")
    if len(raw) < 5 or len(raw) > 72:
        return False
    lower = raw.lower()
    if lower in SKIP_NAME_FRAGMENTS:
        return False
    if re.search(r"\b(was|were|born|married|died|sailed|arrived|became|town|colony|province)\b", lower):
        return False
    if not re.search(r"[A-Z]", raw):
        return False
    # Require at least a surname-like final capitalized token.
    tokens = [t for t in re.split(r"\s+", raw) if t and t[0].isupper()]
    return len(tokens) >= 2 or ("(" in raw and ")" in raw)


def extract_people(text: str, bold_parts: list[str]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()

    def add(raw: str) -> None:
        raw = re.sub(r"\s+", " ", raw).strip(" ,.")
        if not looks_like_name(raw):
            return
        key = raw.lower()
        if key in seen:
            return
        seen.add(key)
        names.append(raw)

    for part in bold_parts:
        part = re.sub(r"\s+\d{1,3}$", "", part)
        if part and not part.lower().startswith("note"):
            add(part)

    m = re.search(
        r"(?:On|Sometime|About|In)\s+[^,]+,\s+(.+?)\s+(?:was born|were married|married|died|"
        r"left|sailed|arrived|became|enlisted|received|applied|filed|baptized)",
        text,
        re.I,
    )
    if m:
        chunk = m.group(1)
        if " and " in chunk.lower():
            for piece in re.split(r"\s+and\s+", chunk, flags=re.I):
                add(piece)
        else:
            add(chunk)

    born_to = re.search(
        r"(?:was born|were born)\s+to\s+(.+?)\s+in\s+",
        text,
        re.I,
    )
    if born_to:
        chunk = born_to.group(1)
        for piece in re.split(r"\s+and\s+", chunk, flags=re.I):
            add(piece)

    for famous in FAMOUS_PEOPLE:
        if famous.lower() in text.lower():
            add(famous)

    return names


def extract_places(text: str) -> list[str]:
    places: list[str] = []
    seen: set[str] = set()
    patterns = [
        r"town of ([A-Z][A-Za-z .'-]+)",
        r"city of ([A-Z][A-Za-z .'-]+)",
        r"Province of ([A-Z][A-Za-z .'-]+)",
        r"Colony of ([A-Z][A-Za-z .'-]+)",
        r"settlement of ([A-Z][A-Za-z .'-]+)",
        r"\b(Salem|Boston|Québec|Quebec|Chelmsford|Andover|Littleton|Iowa|Vermont|Dakota)\b",
    ]
    for pat in patterns:
        for match in re.finditer(pat, text):
            place = match.group(1).strip(" .")
            key = place.lower()
            if key not in seen and len(place) > 2:
                seen.add(key)
                places.append(place)
    return places[:8]


def classify_paragraph(text: str, bold: bool) -> str:
    if bold and is_doc_chapter_heading(text, bold):
        return "heading"
    if text.lower().startswith("note:"):
        return "note"
    years = re.findall(r"\b(1[0-9]{3}|20[0-9]{2})\b", text)
    if not years:
        return "narrative" if len(text) > 40 else "skip"
    if EVENT_VERBS.search(text):
        return "person_event"
    return "historical_event"


def fingerprint(year: int | None, people: list[str], places: list[str]) -> str:
    bits = []
    if year:
        bits.append(str(year))
    for person in people[:3]:
        bits.append(surname_from_person(person))
    for place in places[:2]:
        bits.append(normalize_token(place.split()[-1]))
    return "|".join(bits) if bits else hashlib.sha1("".encode()).hexdigest()[:12]


def load_doc_paragraphs(docx: Path) -> list[dict]:
    with zipfile.ZipFile(docx) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    rows: list[dict] = []
    chapter_title = "Introduction"
    chapter_id = slug(chapter_title)

    for index, p in enumerate(root.iter(f"{W}p")):
        text, bold, bold_parts = para_text_and_bold(p)
        if not text:
            continue
        if bold and is_doc_chapter_heading(text, bold):
            chapter_title = clean_heading(text)
            chapter_id = slug(chapter_title)
            continue

        years = [int(y) for y in re.findall(r"\b(1[0-9]{3}|20[0-9]{2})\b", text)]
        people = extract_people(text, bold_parts)
        places = extract_places(text)
        kind = classify_paragraph(text, bold)
        famous = [n for n in FAMOUS_PEOPLE if n.lower() in text.lower()]
        family_hits = [
            s
            for s in FAMILY_SURNAMES
            if re.search(rf"\b{re.escape(s)}\b", text, re.I)
        ]

        rows.append(
            {
                "id": f"p-{index:05d}",
                "paragraphIndex": index,
                "docChapterId": chapter_id,
                "docChapterTitle": chapter_title,
                "kind": kind,
                "primaryYear": years[0] if years else None,
                "years": years,
                "people": people,
                "places": places,
                "famousPeople": famous,
                "familySurnames": family_hits,
                "isDirectFamily": bool(people) or bool(family_hits),
                "branch": infer_branch(f"{chapter_title} {text}"),
                "wordCount": len(re.findall(r"\w+", text)),
                "fingerprints": fingerprint(years[0] if years else None, people, places),
                "sourceHash": hashlib.sha256(text.encode("utf-8")).hexdigest()[:16],
            }
        )
    return rows


def load_storybook_corpus() -> dict[str, str]:
    path = DATA / "storybook.json"
    if not path.exists():
        return {}
    book = json.loads(path.read_text(encoding="utf-8"))
    by_chapter: dict[str, str] = {}
    all_text: list[str] = []
    for section in book.get("sections", []):
        paras = [b["text"] for b in section.get("blocks", []) if b.get("type") == "paragraph"]
        blob = normalize_token(" ".join(paras))
        by_chapter[section["id"]] = blob
        all_text.append(blob)
    by_chapter["__all__"] = " ".join(all_text)
    return by_chapter


def load_enriched_corpus() -> dict[str, str]:
    path = DATA / "enriched-sections.json"
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for section_id, section in payload.get("sections", {}).items():
        paras = [b["text"] for b in section.get("blocks", []) if b.get("type") == "paragraph"]
        out[section_id] = normalize_token(" ".join(paras))
    return out


def load_family_index_keys() -> set[str]:
    path = DATA / "family-index.json"
    if not path.exists():
        return set()
    payload = json.loads(path.read_text(encoding="utf-8"))
    keys: set[str] = set()
    for entry in payload.get("entries", []):
        year = entry.get("year")
        name = entry.get("name", "")
        keys.add(f"{year}|{surname_from_person(name)}")
        keys.add(f"{year}|{normalize_token(name)}")
    return keys


def load_timeline_keys() -> set[str]:
    path = DATA / "timeline.index.json"
    if not path.exists():
        return set()
    payload = json.loads(path.read_text(encoding="utf-8"))
    events = payload if isinstance(payload, list) else payload.get("events", [])
    keys: set[str] = set()
    for event in events:
        year = event.get("year")
        summary = normalize_token(event.get("summary", ""))
        keys.add(f"{year}|{summary[:48]}")
    return keys


def map_doc_to_storybook_chapters() -> dict[str, str]:
    """Best-effort map doc chapter slug -> storybook section id."""
    path = DATA / "storybook.json"
    if not path.exists():
        return {}
    book = json.loads(path.read_text(encoding="utf-8"))
    story_ids = {s["id"]: s["title"] for s in book.get("sections", [])}
    mapping: dict[str, str] = {}
    for sid, title in story_ids.items():
        mapping[slug(title)] = sid
    return mapping


def match_fact_in_corpus(fact: dict, corpus: str) -> bool:
    if not corpus:
        return False
    if fact.get("primaryYear") and str(fact["primaryYear"]) not in corpus:
        return False
    if fact.get("people"):
        return any(surname_from_person(p) in corpus for p in fact["people"] if surname_from_person(p))
    if fact.get("places"):
        return any(normalize_token(p) in corpus for p in fact["places"])
    if fact.get("famousPeople"):
        return any(normalize_token(p) in corpus for p in fact["famousPeople"])
    return fact.get("primaryYear") is not None and str(fact["primaryYear"]) in corpus


def compute_coverage(facts: list[dict]) -> list[dict]:
    storybook = load_storybook_corpus()
    enriched = load_enriched_corpus()
    family_keys = load_family_index_keys()
    timeline_keys = load_timeline_keys()
    chapter_map = map_doc_to_storybook_chapters()

    for fact in facts:
        if fact["kind"] in {"heading", "skip"}:
            fact["coverage"] = {"status": "n/a"}
            fact["storybookChapterId"] = None
            continue

        story_chapter = chapter_map.get(fact["docChapterId"])
        fact["storybookChapterId"] = story_chapter

        corp_chapter = storybook.get(story_chapter or "", "")
        corp_all = storybook.get("__all__", "")
        corp_enriched = enriched.get(story_chapter or "", "")

        in_storybook = match_fact_in_corpus(fact, corp_chapter) or match_fact_in_corpus(fact, corp_all)
        in_enriched = match_fact_in_corpus(fact, corp_enriched)

        in_family = False
        if fact.get("primaryYear") and fact.get("people"):
            for person in fact["people"]:
                key = f"{fact['primaryYear']}|{surname_from_person(person)}"
                if key in family_keys:
                    in_family = True
                    break

        in_timeline = False
        if fact.get("primaryYear"):
            year = fact["primaryYear"]
            for person in fact.get("people", [])[:2]:
                sn = surname_from_person(person)
                if sn and any(k.startswith(f"{year}|") and sn in k for k in timeline_keys):
                    in_timeline = True
                    break

        if in_enriched:
            status = "enriched"
        elif in_storybook:
            status = "storybook"
        elif in_family or in_timeline:
            status = "indexed_only"
        else:
            status = "uncovered"

        fact["coverage"] = {
            "status": status,
            "inStorybook": in_storybook,
            "inEnriched": in_enriched,
            "inFamilyIndex": in_family,
            "inTimeline": in_timeline,
        }

    return facts


def build_summary(facts: list[dict]) -> dict:
    substantive = [f for f in facts if f["kind"] not in {"heading", "skip"}]
    person_events = [f for f in substantive if f["kind"] == "person_event"]
    direct_family = [f for f in substantive if f["isDirectFamily"]]

    by_status: dict[str, int] = defaultdict(int)
    by_chapter: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for fact in substantive:
        status = fact.get("coverage", {}).get("status", "uncovered")
        by_status[status] += 1
        ch = fact["docChapterTitle"]
        by_chapter[ch][status] += 1
        by_chapter[ch]["total"] += 1

    chapter_gaps = []
    for title, counts in sorted(by_chapter.items(), key=lambda x: -x[1].get("uncovered", 0)):
        total = counts["total"]
        uncovered = counts.get("uncovered", 0)
        if uncovered:
            chapter_gaps.append(
                {
                    "docChapterTitle": title,
                    "totalFacts": total,
                    "uncovered": uncovered,
                    "coveragePct": round(100 * (1 - uncovered / total), 1) if total else 0,
                }
            )

    total_words = sum(f["wordCount"] for f in substantive)
    family_index_path = DATA / "family-index.json"
    family_index_count = 0
    if family_index_path.exists():
        family_index_count = json.loads(family_index_path.read_text(encoding="utf-8")).get("count", 0)

    return {
        "substantiveFacts": len(substantive),
        "personEvents": len(person_events),
        "directFamilyFacts": len(direct_family),
        "sourceWordsInSubstantiveParagraphs": total_words,
        "coverageByStatus": dict(by_status),
        "coveragePct": {
            "storybookOrBetter": round(
                100
                * (
                    by_status.get("storybook", 0)
                    + by_status.get("enriched", 0)
                )
                / len(substantive),
                1,
            )
            if substantive
            else 0,
            "anyIndex": round(
                100
                * (
                    len(substantive)
                    - by_status.get("uncovered", 0)
                )
                / len(substantive),
                1,
            )
            if substantive
            else 0,
            "fullyUncovered": round(100 * by_status.get("uncovered", 0) / len(substantive), 1)
            if substantive
            else 0,
        },
        "topGapsByChapter": chapter_gaps[:15],
        "uniquePeople": len({p.lower() for f in substantive for p in f.get("people", [])}),
        "familyIndexEntries": family_index_count,
        "yearRange": [
            min((f["primaryYear"] for f in substantive if f.get("primaryYear")), default=None),
            max((f["primaryYear"] for f in substantive if f.get("primaryYear")), default=None),
        ],
    }


def main() -> int:
    docx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DOCX
    if not docx.exists():
        print(f"Missing docx: {docx}", file=sys.stderr)
        return 1

    facts = load_doc_paragraphs(docx)
    facts = compute_coverage(facts)
    summary = build_summary(facts)

    now = datetime.now(timezone.utc).isoformat()
    manifest = {
        "version": 1,
        "phase": 0,
        "generatedAt": now,
        "sourceDocx": str(docx),
        "purpose": "Structured fact ledger for narrative rewrite. No source prose stored — only people, dates, places, and coverage.",
        "summary": summary,
        "facts": facts,
    }

    DATA.mkdir(parents=True, exist_ok=True)
    manifest_path = DATA / "fact-manifest.json"
    summary_path = DATA / "fact-manifest-summary.json"

    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    summary_path.write_text(
        json.dumps(
            {
                "generatedAt": now,
                "sourceDocx": str(docx),
                **summary,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print("Phase 0 fact manifest")
    print(f"  substantive facts: {summary['substantiveFacts']:,}")
    print(f"  person life events:  {summary['personEvents']:,}")
    print(f"  direct-family facts: {summary['directFamilyFacts']:,}")
    print(f"  unique people:       {summary['uniquePeople']:,}")
    print(f"  source words:        {summary['sourceWordsInSubstantiveParagraphs']:,}")
    print(f"  year range:          {summary['yearRange'][0]}–{summary['yearRange'][1]}")
    print("  coverage:")
    for status, count in sorted(summary["coverageByStatus"].items()):
        print(f"    {status}: {count:,}")
    print(f"  in storybook/enriched: {summary['coveragePct']['storybookOrBetter']}%")
    print(f"  in any index:          {summary['coveragePct']['anyIndex']}%")
    print(f"  fully uncovered:       {summary['coveragePct']['fullyUncovered']}%")
    print(f"wrote {manifest_path} ({manifest_path.stat().st_size / 1024 / 1024:.2f} MB)")
    print(f"wrote {summary_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())