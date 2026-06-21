#!/usr/bin/env python3
"""Extract chapters and dated events from the Winifred Coss family tree docx."""

from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DEFAULT_DOCX = Path.home() / "Library/CloudStorage/Dropbox/THE STORY OF WINIDRED COSS FAMILY TREE.docx"
OUT_DIR = Path(__file__).resolve().parent.parent / "data"


def paragraph_text(p: ET.Element) -> tuple[str, bool]:
    parts: list[str] = []
    has_bold = False
    for r in p.findall(f"{W}r"):
        if r.find(f"{W}rPr/{W}b") is not None:
            has_bold = True
        parts.extend(t.text or "" for t in r.findall(f"{W}t"))
    return "".join(parts).strip(), has_bold


def load_paragraphs(docx_path: Path) -> list[tuple[str, bool]]:
    with zipfile.ZipFile(docx_path) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    return [paragraph_text(p) for p in root.iter(f"{W}p")]


def is_chapter_heading(text: str) -> bool:
    if not text or len(text) > 90:
        return False
    if re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", text):
        return False
    markers = (
        "Colony",
        "War",
        "Revolution",
        "History",
        "Family Tree",
        "Migration",
        "Settlement",
        "Reformation",
        "Depression",
        "Territory",
        "Filles",
        "Regiment",
        "Company",
        "Trials",
        "Fleet",
        "People",
        "References",
        "Index",
        "Format",
        "branch members",
        "Dictionary",
        "System",
        "Voyage",
        "Island",
        "Québec",
        "Canada",
        "Vermont",
        "Dakota",
    )
    return any(m.lower() in text.lower() for m in markers)


def clean_chapter_title(text: str) -> str:
    return re.sub(r"\s+\d{1,3}$", "", text).strip()


def extract_chapters(paragraphs: list[tuple[str, bool]]) -> list[dict]:
    chapters: list[dict] = []
    current: dict | None = None
    for text, bold in paragraphs:
        if not text:
            continue
        if bold and is_chapter_heading(text):
            title = clean_chapter_title(text)
            if title in {"Table of Contents", "Key References used in Story of Edith Powers", "References"}:
                continue
            if current:
                chapters.append(current)
            current = {
                "id": re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80],
                "title": title,
                "branch": infer_branch(title),
                "paragraphs": [],
            }
            continue
        if current and not bold:
            current["paragraphs"].append(text)
    if current:
        chapters.append(current)
    return chapters


def infer_branch(title: str) -> str:
    lower = title.lower()
    if any(k in lower for k in ("canada", "québec", "quebec", "perche", "goodwater", "filles", "iroquois", "beaver")):
        return "goodwater"
    if any(k in lower for k in ("powers", "plymouth", "massachusetts", "salem", "winthrop", "england", "puritan")):
        return "powers"
    return "both"


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
    "Paul Le Jeune",
    "William Bradford",
    "Myles Standish",
    "Metacom",
    "King Philip",
]


def extract_events(paragraphs: list[tuple[str, bool]]) -> list[dict]:
    events: list[dict] = []
    seen: set[str] = set()
    for text, _ in paragraphs:
        years = re.findall(r"\b(1[0-9]{3}|20[0-9]{2})\b", text)
        if not years:
            continue
        famous = [name for name in FAMOUS_PEOPLE if name.lower() in text.lower()]
        family = bool(re.search(r"\b(Coss|Powers|Goodwater|Alcock|Cloutier|Guyon|Giffard)\b", text, re.I))
        if not famous and not family and len(text) > 220:
            continue
        year = int(years[0])
        key = f"{year}:{text[:80]}"
        if key in seen:
            continue
        seen.add(key)
        events.append(
            {
                "year": year,
                "summary": text[:280] + ("…" if len(text) > 280 else ""),
                "famousPeople": famous,
                "mentionsFamily": family,
            }
        )
    events.sort(key=lambda e: e["year"])
    return events


def main() -> int:
    docx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DOCX
    if not docx.exists():
        print(f"Missing docx: {docx}", file=sys.stderr)
        return 1

    paragraphs = [(t, b) for t, b in load_paragraphs(docx) if t]
    chapters = extract_chapters(paragraphs)
    events = extract_events(paragraphs)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "chapters.raw.json").write_text(json.dumps(chapters, indent=2), encoding="utf-8")
    (OUT_DIR / "events.raw.json").write_text(json.dumps(events, indent=2), encoding="utf-8")

    print(f"chapters: {len(chapters)}")
    print(f"events: {len(events)}")
    print(f"wrote {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())