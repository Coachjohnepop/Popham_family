#!/usr/bin/env python3
"""Build full storybook sections with all docx images mapped to content blocks."""

from __future__ import annotations

import json
import re
import shutil
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

DEFAULT_DOCX = Path.home() / "Library/CloudStorage/Dropbox/THE STORY OF WINIDRED COSS FAMILY TREE.docx"
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
IMAGE_OUT = ROOT / "public" / "images" / "story"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"

SKIP_HEADINGS = {
    "table of contents",
    "index",
    "key references used in story of edith powers",
    "references",
    "winifred eloise coss",
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
    "Paul Le Jeune",
    "William Bradford",
    "Myles Standish",
    "Metacom",
    "King Philip",
    "Napoleon Bonaparte",
]

FAMILY_NAMES = [
    "Coss",
    "Powers",
    "Goodwater",
    "Alcock",
    "Cloutier",
    "Guyon",
    "Giffard",
    "Batie",
    "Bonneau",
    "Hébert",
    "Hebert",
]

HEADING_MARKERS = (
    "colony",
    "war",
    "revolution",
    "history",
    "family tree",
    "migration",
    "settlement",
    "reformation",
    "depression",
    "territory",
    "filles",
    "regiment",
    "company",
    "trials",
    "fleet",
    "people",
    "format",
    "branch members",
    "dictionary",
    "system",
    "voyage",
    "island",
    "québec",
    "quebec",
    "canada",
    "vermont",
    "dakota",
    "puritan",
    "native american",
    "civil war",
    "hudson",
    "beaver",
    "king ",
    "province",
    "state of",
    "dutch",
    "plymouth",
    "massachusetts",
    "connecticut",
    "rhode island",
    "new hampshire",
    "salem",
    "french and indian",
    "american revolution",
    "great depression",
    "dust bowl",
    "seigneurial",
    "perche",
    "immigration",
    "ocean voyage",
    "praying indian",
    "restoration",
    "pequot",
    "events leading",
    "early history",
    "life in",
    "return to",
    "cyprien",
)


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:96]


def clean_heading(text: str) -> str:
    text = re.sub(r"\s+\d{1,3}$", "", text)
    text = re.sub(r"\s{2,}\d{1,3}$", "", text)
    return re.sub(r"\s+", " ", text).strip()


def infer_branch(title: str, text: str) -> str:
    blob = f"{title} {text}".lower()
    if any(k in blob for k in ("canada", "québec", "quebec", "perche", "goodwater", "filles", "iroquois", "beauport", "new france", "champlain", "bonneau")):
        return "goodwater"
    if any(k in blob for k in ("powers", "plymouth", "massachusetts", "salem", "winthrop", "puritan", "england", "vermont", "connecticut")):
        return "powers"
    return "both"


def is_heading(text: str, bold: bool) -> bool:
    if not bold or not text:
        return False
    cleaned = clean_heading(text)
    if not cleaned or cleaned.lower() in SKIP_HEADINGS:
        return False
    if len(cleaned) > 95:
        return False
    if re.match(r"^(in |on |about |between |sometime |note:|see |back in |while |since |later |during |after |before |if the |no \d|the following)", cleaned, re.I):
        return False
    if re.match(r"^(in |on |about |between |sometime )\d{4}", cleaned, re.I):
        return False
    if re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", cleaned) and len(cleaned) > 45:
        return False
    lower = cleaned.lower()
    if any(m in lower for m in HEADING_MARKERS):
        return True
    if cleaned.endswith("Story") or "Family Tree" in cleaned:
        return True
    # Short title-case section labels from the table of contents.
    if len(cleaned) < 55 and cleaned[0].isupper() and cleaned.count(".") == 0:
        words = cleaned.split()
        if 2 <= len(words) <= 10:
            return True
    return False


def image_caption(recent: list[str]) -> str:
    for text in reversed(recent):
        if not text:
            continue
        caption = re.sub(r"\s+", " ", text).strip()
        if len(caption) > 120:
            caption = caption[:117].rstrip() + "…"
        return caption
    return "From the family document"


def compress_blocks(blocks: list[dict]) -> list[dict]:
    """Merge consecutive image blocks into slideshows."""
    out: list[dict] = []
    image_run: list[dict] = []

    def flush_images() -> None:
        nonlocal image_run
        if not image_run:
            return
        if len(image_run) == 1:
            out.append({"type": "image", **image_run[0]})
        else:
            out.append({"type": "slideshow", "images": image_run})
        image_run = []

    for block in blocks:
        if block["type"] == "image":
            image_run.append({"src": block["src"], "caption": block["caption"], "media": block["media"]})
        else:
            flush_images()
            out.append(block)
    flush_images()
    return out


def parse_docx(docx: Path) -> list[dict]:
    with zipfile.ZipFile(docx) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
        rels = ET.fromstring(zf.read("word/_rels/document.xml.rels"))
        relmap = {r.attrib["Id"]: r.attrib["Target"] for r in rels if "Target" in r.attrib}

    def para_text(p: ET.Element) -> tuple[str, bool]:
        parts: list[str] = []
        bold = False
        for r in p.findall(f"{W}r"):
            if r.find(f"{W}rPr/{W}b") is not None:
                bold = True
            parts.extend(t.text or "" for t in r.findall(f"{W}t"))
        return "".join(parts).strip(), bold

    def para_images(p: ET.Element) -> list[str]:
        imgs: list[str] = []
        for blip in p.findall(f".//{A}blip"):
            rid = blip.attrib.get(f"{R}embed")
            if rid and rid in relmap and "media/" in relmap[rid]:
                imgs.append(Path(relmap[rid]).name)
        return imgs

    sections: list[dict] = []
    current: dict | None = None
    recent: list[str] = []
    seen_ids: dict[str, int] = {}

    def start_section(title: str) -> None:
        nonlocal current, recent
        if current:
            current["blocks"] = compress_blocks(current["blocks"])
            if current["blocks"] or current.get("_image_count", 0) > 0:
                del current["_image_count"]
                sections.append(current)
        base_id = slug(clean_heading(title))
        count = seen_ids.get(base_id, 0)
        seen_ids[base_id] = count + 1
        section_id = base_id if count == 0 else f"{base_id}-{count + 1}"
        current = {
            "id": section_id,
            "title": clean_heading(title),
            "branch": "both",
            "blocks": [],
            "_image_count": 0,
        }
        recent = []

    start_section("Introduction")

    for p in root.iter(f"{W}p"):
        text, bold = para_text(p)
        imgs = para_images(p)

        if text and bold and is_heading(text, bold):
            start_section(text)
            continue

        if text:
            if current is None:
                start_section("Introduction")
            current["blocks"].append({"type": "paragraph", "text": text})
            recent.append(text)
            if len(recent) > 6:
                recent = recent[-6:]

        for media in imgs:
            if current is None:
                start_section("Introduction")
            src = f"/images/story/{media}"
            current["blocks"].append(
                {
                    "type": "image",
                    "src": src,
                    "caption": image_caption(recent),
                    "media": media,
                }
            )
            current["_image_count"] = current.get("_image_count", 0) + 1

    if current:
        current["blocks"] = compress_blocks(current["blocks"])
        if current["blocks"] or current.get("_image_count", 0) > 0:
            del current["_image_count"]
            sections.append(current)

    return sections


def enrich_section(section: dict) -> dict:
    text_blob = " ".join(b["text"] for b in section["blocks"] if b["type"] == "paragraph")
    years = [int(y) for y in re.findall(r"\b(1[0-9]{3}|20[0-9]{2})\b", text_blob)]
    year_start = min(years) if years else 1500
    year_end = max(years) if years and max(years) != year_start else None

    famous = [name for name in FAMOUS_PEOPLE if name.lower() in text_blob.lower()]
    family = [name for name in FAMILY_NAMES if re.search(rf"\b{re.escape(name)}\b", text_blob, re.I)]

    teaser = ""
    for block in section["blocks"]:
        if block["type"] == "paragraph":
            teaser = block["text"]
            break
    if len(teaser) > 160:
        teaser = teaser[:157].rstrip() + "…"

    image_count = 0
    for block in section["blocks"]:
        if block["type"] == "image":
            image_count += 1
        elif block["type"] == "slideshow":
            image_count += len(block["images"])

    return {
        "id": section["id"],
        "title": section["title"],
        "branch": infer_branch(section["title"], text_blob),
        "yearStart": year_start,
        **({"yearEnd": year_end} if year_end else {}),
        "teaser": teaser or section["title"],
        "famousPeople": famous,
        "familyNames": family,
        "imageCount": image_count,
        "blocks": section["blocks"],
    }


def extract_images(docx: Path) -> int:
    IMAGE_OUT.mkdir(parents=True, exist_ok=True)
    count = 0
    with zipfile.ZipFile(docx) as zf:
        for name in zf.namelist():
            if not name.startswith("word/media/"):
                continue
            media = Path(name).name
            dest = IMAGE_OUT / media
            if dest.exists() and dest.stat().st_size == zf.getinfo(name).file_size:
                count += 1
                continue
            with zf.open(name) as src, dest.open("wb") as out:
                shutil.copyfileobj(src, out)
            count += 1
    return count


def main() -> int:
    docx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DOCX
    if not docx.exists():
        print(f"Missing docx: {docx}", file=sys.stderr)
        return 1

    image_count = extract_images(docx)
    raw_sections = parse_docx(docx)
    sections = [enrich_section(s) for s in raw_sections if s["blocks"]]

    total_images_mapped = sum(s["imageCount"] for s in sections)
    payload = {
        "sectionCount": len(sections),
        "imageCountInDocument": image_count,
        "imageCountMapped": total_images_mapped,
        "sections": sections,
    }

    DATA.mkdir(parents=True, exist_ok=True)
    out_path = DATA / "storybook.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"sections: {len(sections)}")
    print(f"images extracted: {image_count}")
    print(f"images mapped to sections: {total_images_mapped}")
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())