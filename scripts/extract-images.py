#!/usr/bin/env python3
"""Extract curated images from the source docx for the web app."""

from __future__ import annotations

import json
import shutil
import sys
import zipfile
from pathlib import Path

DEFAULT_DOCX = Path.home() / "Library/CloudStorage/Dropbox/THE STORY OF WINIDRED COSS FAMILY TREE.docx"
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "images" / "landing"
INDEX_PATH = ROOT / "data" / "landing-images.json"

# Hand-picked from docx captions — family portraits, tree chart, and key history scenes.
CURATED = [
    {
        "src": "image47.png",
        "file": "morris-and-wini.png",
        "caption": "Morris and Winifred Coss",
        "category": "family",
    },
    {
        "src": "image78.png",
        "file": "wini-lake-mead.png",
        "caption": "Winifred at Lake Mead, Nevada",
        "category": "family",
    },
    {
        "src": "image74.png",
        "file": "charles-coss.png",
        "caption": "Charles Whitcomb Coss",
        "category": "family",
    },
    {
        "src": "image58.png",
        "file": "family-tree-chart.png",
        "caption": "Four generations of the Coss family",
        "category": "family",
    },
    {
        "src": "image48.jpg",
        "file": "cloutier-contract.jpg",
        "caption": "1634 — Cloutier & Guyon depart for Québec",
        "category": "history",
    },
    {
        "src": "image10.jpg",
        "file": "quebec-settlement.jpg",
        "caption": "Samuel de Champlain at Québec, 1608",
        "category": "history",
    },
    {
        "src": "image119.png",
        "file": "winthrop-era.png",
        "caption": "Massachusetts Bay Colony, 1630s",
        "category": "history",
    },
    {
        "src": "image61.png",
        "file": "quebec-cathedral.png",
        "caption": "Cathédrale de Québec",
        "category": "places",
    },
]


def count_docx_images(docx: Path) -> int:
    with zipfile.ZipFile(docx) as zf:
        return sum(1 for name in zf.namelist() if name.startswith("word/media/"))


def main() -> int:
    docx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DOCX
    if not docx.exists():
        print(f"Missing docx: {docx}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total_images = count_docx_images(docx)

    with zipfile.ZipFile(docx) as zf:
        names = set(zf.namelist())
        extracted: list[dict] = []

        for item in CURATED:
            src_path = f"word/media/{item['src']}"
            if src_path not in names:
                print(f"warning: missing {item['src']}", file=sys.stderr)
                continue

            dest = OUT_DIR / item["file"]
            with zf.open(src_path) as src, dest.open("wb") as out:
                shutil.copyfileobj(src, out)

            extracted.append(
                {
                    "id": Path(item["file"]).stem,
                    "src": f"/images/landing/{item['file']}",
                    "caption": item["caption"],
                    "category": item["category"],
                }
            )

    payload = {
        "totalInDocument": total_images,
        "curatedCount": len(extracted),
        "images": extracted,
    }
    INDEX_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"document images: {total_images}")
    print(f"extracted: {len(extracted)} -> {OUT_DIR}")
    print(f"wrote {INDEX_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())