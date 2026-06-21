#!/usr/bin/env python3
"""Build a searchable index of key events, chapters, people, and places."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def slug_terms(*parts: str) -> list[str]:
    terms: set[str] = set()
    for part in parts:
        if not part:
            continue
        cleaned = re.sub(r"[^\w\s'-]", " ", part.lower())
        for token in cleaned.split():
            if len(token) > 1:
                terms.add(token)
    return sorted(terms)


def shorten(text: str, limit: int = 72) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def main() -> int:
    timeline = json.loads((DATA / "timeline.index.json").read_text(encoding="utf-8"))
    storybook = json.loads((DATA / "storybook.json").read_text(encoding="utf-8"))
    locations = json.loads((DATA / "locations.index.json").read_text(encoding="utf-8"))
    family_tree = json.loads((DATA / "family-tree.seed.json").read_text(encoding="utf-8"))

    entries: list[dict] = []

    for event in timeline:
        if not (event.get("famousPeople") or event.get("mentionsFamily") or event.get("familyNames")):
            continue
        label = shorten(event["title"])
        location = event["location"]["name"]
        year = event["year"]
        entries.append(
            {
                "id": f"event-{event['id']}",
                "kind": "event",
                "label": label,
                "subtitle": f"{year} · {location}",
                "year": year,
                "href": f"/map?year={year}&event={event['id']}",
                "terms": slug_terms(
                    label,
                    event.get("summary", ""),
                    location,
                    str(year),
                    *event.get("famousPeople", []),
                    *event.get("familyNames", []),
                ),
            }
        )

    for section in storybook["sections"]:
        entries.append(
            {
                "id": f"chapter-{section['id']}",
                "kind": "chapter",
                "label": section["title"],
                "subtitle": f"{section['yearStart']} · {section['branch']} branch",
                "year": section["yearStart"],
                "href": f"/story/{section['id']}",
                "terms": slug_terms(
                    section["title"],
                    section.get("teaser", ""),
                    section["branch"],
                    str(section["yearStart"]),
                    *(str(y) for y in [section.get("yearEnd")] if y),
                    *section.get("famousPeople", []),
                    *section.get("familyNames", []),
                ),
            }
        )

    for person in family_tree["people"]:
        subtitle_parts = []
        if person.get("born"):
            subtitle_parts.append(str(person["born"]))
        if person.get("place"):
            subtitle_parts.append(person["place"])
        subtitle_parts.append(f"{person['branch']} branch")
        entries.append(
            {
                "id": f"person-{person['id']}",
                "kind": "person",
                "label": person["name"],
                "subtitle": " · ".join(subtitle_parts),
                "year": person.get("born"),
                "href": f"/tree?person={person['id']}",
                "terms": slug_terms(
                    person["name"],
                    person.get("place", ""),
                    person.get("note", ""),
                    person["branch"],
                    *(str(person["born"]) if person.get("born") else ""),
                ),
            }
        )

    for location in locations:
        entries.append(
            {
                "id": f"place-{location['id']}",
                "kind": "place",
                "label": location["name"],
                "subtitle": f"Mapped location · {location['scope']}",
                "href": f"/map?place={location['id']}",
                "terms": slug_terms(location["name"], location["scope"]),
            }
        )

    entries.sort(key=lambda item: (item.get("year") or 9999, item["label"].lower()))

    payload = {
        "entryCount": len(entries),
        "kinds": {
            "event": sum(1 for e in entries if e["kind"] == "event"),
            "chapter": sum(1 for e in entries if e["kind"] == "chapter"),
            "person": sum(1 for e in entries if e["kind"] == "person"),
            "place": sum(1 for e in entries if e["kind"] == "place"),
        },
        "entries": entries,
    }

    out_path = DATA / "search.index.json"
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"entries: {payload['entryCount']}")
    print(f"kinds: {payload['kinds']}")
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())