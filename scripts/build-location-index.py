#!/usr/bin/env python3
"""Build geocoded location + timeline indexes from extracted docx events."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# Specific places first so "Massachusetts Bay Colony" wins over "Massachusetts".
PLACE_GEO: list[tuple[str, float, float, str]] = [
    ("Massachusetts Bay Colony", 42.36, -71.05, "us"),
    ("Plymouth Colony", 41.96, -70.67, "us"),
    ("Rhode Island Colony", 41.82, -71.41, "us"),
    ("New Hampshire Colony", 43.2, -71.5, "us"),
    ("Connecticut Colony", 41.76, -72.67, "us"),
    ("Massachusetts Bay", 42.36, -71.05, "us"),
    ("Trois-Rivières", 46.34, -72.55, "world"),
    ("Ville-Marie", 45.5, -73.57, "world"),
    ("Beauport", 46.86, -71.19, "world"),
    ("New England", 42.5, -71.5, "us"),
    ("New France", 46.8, -71.2, "world"),
    ("St. Lawrence", 48.0, -68.0, "world"),
    ("Hudson Bay", 59.0, -86.0, "world"),
    ("Leicestershire", 52.63, -1.13, "world"),
    ("Wittenberg", 51.87, 12.65, "world"),
    ("Massachusetts", 42.4, -71.5, "us"),
    ("Boston", 42.36, -71.06, "us"),
    ("Salem", 42.52, -70.89, "us"),
    ("Plymouth", 41.96, -70.67, "us"),
    ("Cambridge", 42.37, -71.11, "us"),
    ("Lexington", 42.45, -71.23, "us"),
    ("Concord", 42.46, -71.35, "us"),
    ("Ipswich", 42.68, -70.84, "us"),
    ("Andover", 42.66, -71.14, "us"),
    ("Haverhill", 42.78, -71.08, "us"),
    ("Newbury", 42.8, -70.87, "us"),
    ("Mystic", 41.35, -72.01, "us"),
    ("Hartford", 41.76, -72.68, "us"),
    ("New Haven", 41.31, -72.92, "us"),
    ("Connecticut", 41.6, -72.7, "us"),
    ("Rhode Island", 41.58, -71.48, "us"),
    ("Providence", 41.82, -71.41, "us"),
    ("New Hampshire", 43.2, -71.5, "us"),
    ("Portsmouth", 43.07, -70.76, "us"),
    ("Vermont", 44.0, -72.7, "us"),
    ("Virginia", 37.5, -78.5, "us"),
    ("Jamestown", 37.22, -76.78, "us"),
    ("New York", 42.65, -73.75, "us"),
    ("Albany", 42.65, -73.75, "us"),
    ("Pennsylvania", 40.9, -77.8, "us"),
    ("Ohio", 40.4, -82.8, "us"),
    ("Illinois", 40.0, -89.0, "us"),
    ("Missouri", 38.5, -92.5, "us"),
    ("Iowa", 42.0, -93.5, "us"),
    ("Minnesota", 46.0, -94.0, "us"),
    ("Wisconsin", 44.5, -89.5, "us"),
    ("Nebraska", 41.5, -99.5, "us"),
    ("Kansas", 38.5, -98.5, "us"),
    ("Dakota", 44.5, -100.0, "us"),
    ("Texas", 31.0, -99.0, "us"),
    ("California", 36.8, -119.4, "us"),
    ("Québec", 46.81, -71.21, "world"),
    ("Quebec", 46.81, -71.21, "world"),
    ("Montreal", 45.5, -73.57, "world"),
    ("Canada", 56.0, -96.0, "world"),
    ("Paris", 48.86, 2.35, "world"),
    ("Perche", 48.59, 0.69, "world"),
    ("Normandy", 49.0, -0.5, "world"),
    ("France", 46.5, 2.5, "world"),
    ("London", 51.51, -0.13, "world"),
    ("England", 52.5, -1.5, "world"),
    ("Scotland", 56.5, -4.0, "world"),
    ("Ireland", 53.4, -7.7, "world"),
    ("Wales", 52.3, -3.7, "world"),
    ("Germany", 51.0, 10.0, "world"),
    ("Spain", 40.0, -3.7, "world"),
    ("Italy", 42.5, 12.5, "world"),
    ("Newfoundland", 48.5, -56.0, "world"),
]


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:96]


def match_location(summary: str) -> dict | None:
    for name, lat, lng, scope in PLACE_GEO:
        if re.search(r"\b" + re.escape(name) + r"\b", summary, re.I):
            return {"name": name, "lat": lat, "lng": lng, "scope": scope}
    return None


def infer_branch(summary: str, famous: list[str]) -> str:
    lower = summary.lower()
    if any(k in lower for k in ("québec", "quebec", "canada", "perche", "beauport", "new france", "filles")):
        return "goodwater"
    if any(k in lower for k in ("massachusetts", "plymouth", "salem", "winthrop", "puritan", "powers")):
        return "powers"
    return "both"


def title_from_summary(summary: str, year: int) -> str:
    text = re.sub(r"\s+", " ", summary).strip()
    text = re.sub(rf"^{year}[,:]?\s*", "", text)
    if len(text) > 72:
        text = text[:69].rstrip() + "…"
    return text or f"Event in {year}"


def main() -> None:
    events_raw = json.loads((DATA / "events.raw.json").read_text(encoding="utf-8"))

    locations_index = [
        {
            "id": slug(name),
            "name": name,
            "lat": lat,
            "lng": lng,
            "scope": scope,
        }
        for name, lat, lng, scope in PLACE_GEO
    ]

    timeline: list[dict] = []
    seen: set[str] = set()
    for i, raw in enumerate(events_raw):
        summary = raw.get("summary", "")
        loc = match_location(summary)
        if not loc:
            continue
        year = int(raw["year"])
        dedupe = f"{year}|{loc['name']}|{summary[:48]}"
        if dedupe in seen:
            continue
        seen.add(dedupe)

        famous = raw.get("famousPeople") or []
        family = bool(raw.get("mentionsFamily"))
        timeline.append(
            {
                "id": f"evt-{year}-{i}",
                "year": year,
                "title": title_from_summary(summary, year),
                "summary": summary,
                "branch": infer_branch(summary, famous),
                "famousPeople": famous,
                "familyNames": ["Coss", "Powers", "Goodwater"] if family else [],
                "mentionsFamily": family,
                "location": loc,
            }
        )

    timeline.sort(key=lambda e: (e["year"], e["location"]["name"]))

    meta = {
        "timelineElementsRaw": len(events_raw),
        "timelineElementsMapped": len(timeline),
        "indexedLocations": len(locations_index),
        "yearMin": min(e["year"] for e in timeline),
        "yearMax": max(e["year"] for e in timeline),
        "withFamousOrFamily": sum(
            1 for e in timeline if e["famousPeople"] or e["mentionsFamily"]
        ),
    }

    (DATA / "locations.index.json").write_text(
        json.dumps(locations_index, indent=2), encoding="utf-8"
    )
    (DATA / "timeline.index.json").write_text(json.dumps(timeline, indent=2), encoding="utf-8")
    (DATA / "index.meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()