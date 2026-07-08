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

TARGET_SECTION_COUNT = 28
MAX_PARAGRAPH_CHARS = 240
MAX_PARAGRAPH_SENTENCES = 2
MAX_PARAGRAPHS_PER_SECTION = 20

DROP_SECTION_TITLES = {
    "format of the story",
    "the old map on the next page that shows the major towns in the east coast of north america in the 1600s",
}

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
    if len(cleaned) > 72:
        return False
    if cleaned[0].islower():
        return False
    if re.match(r"^(in\d{4}|in |on |about |between |sometime |note:|see |back in |while |since |later |during |after |before |if the |no \d|the following)", cleaned, re.I):
        return False
    if cleaned.lower() in DROP_SECTION_TITLES:
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


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def paragraph_score(text: str) -> int:
    return sum(sentence_score(sentence) for sentence in split_sentences(text))


def sentence_score(sentence: str) -> int:
    score = 0
    if re.search(r"\b(1[0-9]{3}|20[0-9]{2})\b", sentence):
        score += 2
    if any(name.lower() in sentence.lower() for name in FAMOUS_PEOPLE):
        score += 2
    if any(re.search(rf"\b{re.escape(name)}\b", sentence, re.I) for name in FAMILY_NAMES):
        score += 3
    if re.search(r"\b(married|born|died|sailed|arrived|family|ancestor)\b", sentence, re.I):
        score += 1
    return score


def tighten_paragraph(text: str) -> str | None:
    text = re.sub(r"\s+", " ", text).strip()
    if not text or len(text) < 24:
        return None
    if re.fullmatch(r"\d{1,3}", text):
        return None

    sentences = split_sentences(text)
    if not sentences:
        return text[:MAX_PARAGRAPH_CHARS]

    ranked = sorted(
        sentences,
        key=lambda sentence: (sentence_score(sentence), -len(sentence)),
        reverse=True,
    )
    chosen: list[str] = []
    for sentence in ranked:
        if sentence in chosen:
            continue
        chosen.append(sentence)
        if len(chosen) >= MAX_PARAGRAPH_SENTENCES:
            break

    if not chosen:
        chosen = sentences[:MAX_PARAGRAPH_SENTENCES]

    ordered = [s for s in sentences if s in chosen]
    result = " ".join(ordered)
    if len(result) > MAX_PARAGRAPH_CHARS:
        result = result[: MAX_PARAGRAPH_CHARS - 1].rstrip() + "…"
    return result


def tighten_blocks(blocks: list[dict]) -> list[dict]:
    items: list[tuple[str, object]] = []
    paragraph_buffer: list[str] = []
    seen_paragraphs: set[str] = set()

    def flush_paragraphs() -> None:
        nonlocal paragraph_buffer
        if not paragraph_buffer:
            return
        merged = " ".join(paragraph_buffer)
        paragraph_buffer = []
        tightened = tighten_paragraph(merged)
        if not tightened:
            return
        key = tightened[:96].lower()
        if key in seen_paragraphs:
            return
        seen_paragraphs.add(key)
        items.append(("p", {"text": tightened, "score": paragraph_score(tightened)}))

    for block in blocks:
        if block["type"] == "paragraph":
            paragraph_buffer.append(block["text"])
            if len(" ".join(paragraph_buffer)) > 180:
                flush_paragraphs()
            continue
        flush_paragraphs()
        items.append(("m", block))
    flush_paragraphs()

    paragraph_indices = [index for index, (kind, _) in enumerate(items) if kind == "p"]
    if len(paragraph_indices) > MAX_PARAGRAPHS_PER_SECTION:
        ranked = sorted(
            ((items[index][1]["score"], index) for index in paragraph_indices),
            reverse=True,
        )
        keep = {paragraph_indices[0]}
        for _, index in ranked:
            if len(keep) >= MAX_PARAGRAPHS_PER_SECTION:
                break
            keep.add(index)
        items = [item for index, item in enumerate(items) if item[0] != "p" or index in keep]

    out: list[dict] = []
    for kind, payload in items:
        if kind == "p":
            out.append({"type": "paragraph", "text": payload["text"]})
        else:
            out.append(payload)
    return out


def clean_merged_title(title: str) -> str:
    lower = title.lower()
    if lower.startswith("the old map on the next page"):
        return "New England Towns & Colonies"
    if lower.startswith("must have either signed"):
        return "Marriage in New France"
    if " & " in title:
        parts = [part.strip() for part in title.split(" & ")]
        trimmed: list[str] = []
        for part in parts:
            if part.lower().startswith("the old map"):
                continue
            if part.lower().startswith("must have either signed"):
                continue
            if part not in trimmed:
                trimmed.append(part)
        if len(trimmed) == 1:
            return trimmed[0]
        if len(trimmed) == 2:
            return f"{trimmed[0]} & {trimmed[1]}"
        return f"{trimmed[0]} & {trimmed[1]} (+{len(trimmed) - 2} more)"
    return title


def merge_two_sections(left: dict, right: dict) -> dict:
    title = left["title"]
    right_title = right["title"]
    if right_title.lower() not in title.lower() and len(right["blocks"]) >= 4:
        if len(title) < 48 and len(right_title) < 42:
            title = f"{title} & {right_title}"
        elif len(right_title) > len(title):
            title = right_title

    title = clean_merged_title(title)

    return {
        "id": slug(title),
        "title": title,
        "branch": "both",
        "blocks": tighten_blocks(left["blocks"] + right["blocks"]),
    }


def absorb_fragments(sections: list[dict]) -> list[dict]:
    if not sections:
        return sections

    merged: list[dict] = []
    carry: dict | None = None

    for section in sections:
        blocks = section["blocks"]
        para_count = sum(1 for b in blocks if b["type"] == "paragraph")
        image_count = sum(
            1 if b["type"] == "image" else len(b.get("images", []))
            for b in blocks
            if b["type"] in {"image", "slideshow"}
        )
        is_fragment = para_count <= 2 and image_count == 0
        is_drop = section["title"].lower() in DROP_SECTION_TITLES

        if carry is None:
            carry = section
            continue

        if is_fragment or is_drop:
            carry = merge_two_sections(carry, section)
        else:
            merged.append(carry)
            carry = section

    if carry:
        merged.append(carry)
    return merged


def consolidate_sections(sections: list[dict], target: int = TARGET_SECTION_COUNT) -> list[dict]:
    sections = absorb_fragments(sections)
    if len(sections) <= target:
        return sections

    while len(sections) > target:
        best_index = 0
        best_score = float("inf")
        for i in range(len(sections) - 1):
            left_len = len(sections[i]["blocks"])
            right_len = len(sections[i + 1]["blocks"])
            score = left_len + right_len
            if score < best_score:
                best_score = score
                best_index = i
        merged = merge_two_sections(sections[best_index], sections[best_index + 1])
        sections = sections[:best_index] + [merged] + sections[best_index + 2 :]

    seen_ids: dict[str, int] = {}
    normalized: list[dict] = []
    for section in sections:
        base_id = slug(section["title"])
        count = seen_ids.get(base_id, 0)
        seen_ids[base_id] = count + 1
        section["id"] = base_id if count == 0 else f"{base_id}-{count + 1}"
        normalized.append(section)
    return normalized


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


ENRICHED_SECTIONS_PATH = DATA / "enriched-sections.json"


def load_enriched_overrides() -> dict[str, dict]:
    if not ENRICHED_SECTIONS_PATH.exists():
        return {}
    payload = json.loads(ENRICHED_SECTIONS_PATH.read_text(encoding="utf-8"))
    return payload.get("sections", {})


def apply_enriched_sections(sections: list[dict]) -> list[dict]:
    """Replace auto-built sections with hand-enriched content when preserve=true."""
    overrides = load_enriched_overrides()
    if not overrides:
        return sections

    out: list[dict] = []
    applied = 0
    for section in sections:
        override = overrides.get(section["id"])
        if override and override.get("preserve"):
            merged = {**section, **{k: v for k, v in override.items() if k != "preserve"}}
            image_count = 0
            for block in merged.get("blocks", []):
                if block.get("type") == "image":
                    image_count += 1
                elif block.get("type") == "slideshow":
                    image_count += len(block.get("images", []))
            merged["imageCount"] = image_count
            out.append(merged)
            applied += 1
        else:
            out.append(section)

    if applied:
        print(f"applied {applied} enriched section override(s)")
    return out


def main() -> int:
    docx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DOCX
    if not docx.exists():
        print(f"Missing docx: {docx}", file=sys.stderr)
        return 1

    image_count = extract_images(docx)
    raw_sections = parse_docx(docx)
    consolidated = consolidate_sections([s for s in raw_sections if s["blocks"]])
    for section in consolidated:
        section["blocks"] = tighten_blocks(section["blocks"])
    sections = [enrich_section(s) for s in consolidated]
    sections = apply_enriched_sections(sections)

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