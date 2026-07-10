#!/usr/bin/env python3
"""Build a searchable index with summaries and document cross-references."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
MAX_SUMMARY_PARAGRAPHS = 2
MAX_SUMMARY_CHARS = 520
REF_LABEL_WORDS = 6


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


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def shorten(text: str, limit: int = 72) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def make_summary(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    sentences = split_sentences(text)
    if not sentences:
        return [shorten(text, MAX_SUMMARY_CHARS)]

    paragraphs: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        if len(paragraphs) >= MAX_SUMMARY_PARAGRAPHS:
            break
        next_len = current_len + len(sentence) + (1 if current else 0)
        if current and next_len > MAX_SUMMARY_CHARS // MAX_SUMMARY_PARAGRAPHS:
            paragraphs.append(" ".join(current))
            current = [sentence]
            current_len = len(sentence)
        else:
            current.append(sentence)
            current_len = next_len

    if current and len(paragraphs) < MAX_SUMMARY_PARAGRAPHS:
        paragraphs.append(" ".join(current))

    if not paragraphs:
        return [shorten(text, MAX_SUMMARY_CHARS)]

    return [shorten(p, MAX_SUMMARY_CHARS // MAX_SUMMARY_PARAGRAPHS + 80) for p in paragraphs[:MAX_SUMMARY_PARAGRAPHS]]


def ref_label(text: str) -> str:
    words = re.sub(r"\s+", " ", text).strip().split()
    if len(words) <= REF_LABEL_WORDS:
        return " ".join(words)
    return " ".join(words[:REF_LABEL_WORDS])


def section_text(section: dict) -> str:
    return " ".join(block["text"] for block in section.get("blocks", []) if block.get("type") == "paragraph")


def chapter_refs_for_year(year: int, sections: list[dict], limit: int = 3) -> list[dict]:
    refs: list[dict] = []
    for section in sections:
        start = section["yearStart"]
        end = section.get("yearEnd", start)
        if start - 5 <= year <= end + 25:
            title = section["title"]
            if " (+1 more)" in title:
                title = title.split(" (+")[0]
            refs.append(
                {
                    "label": ref_label(f"Story · {title}"),
                    "href": f"/story/{section['id']}",
                    "kind": "story",
                }
            )
    deduped: list[dict] = []
    seen: set[str] = set()
    for ref in refs:
        if ref["href"] in seen:
            continue
        seen.add(ref["href"])
        deduped.append(ref)
        if len(deduped) >= limit:
            break
    return deduped


def chapter_refs_for_terms(blob: str, sections: list[dict], limit: int = 3) -> list[dict]:
    refs: list[dict] = []
    lower = blob.lower()
    for section in sections:
        title = section["title"]
        teaser = section.get("teaser", "")
        if title.lower() in lower or teaser.lower()[:40] in lower:
            short = title.split(" (+")[0]
            refs.append(
                {
                    "label": ref_label(f"Story · {short}"),
                    "href": f"/story/{section['id']}",
                    "kind": "story",
                }
            )
        else:
            text = section_text(section).lower()
            if any(token in text for token in blob.lower().split() if len(token) > 4):
                short = title.split(" (+")[0]
                refs.append(
                    {
                        "label": ref_label(f"Story · {short}"),
                        "href": f"/story/{section['id']}",
                        "kind": "story",
                    }
                )
    deduped: list[dict] = []
    seen: set[str] = set()
    for ref in refs:
        if ref["href"] in seen:
            continue
        seen.add(ref["href"])
        deduped.append(ref)
        if len(deduped) >= limit:
            break
    return deduped


def merge_refs(*groups: list[dict]) -> list[dict]:
    merged: list[dict] = []
    seen: set[str] = set()
    for group in groups:
        for ref in group:
            key = ref["href"]
            if key in seen:
                continue
            seen.add(key)
            merged.append(ref)
    return merged


def count_images(blocks: list[dict]) -> int:
    total = 0
    for block in blocks:
        if block.get("type") == "image":
            total += 1
        elif block.get("type") == "slideshow":
            total += len(block.get("images") or [])
    return total


def load_story_sections() -> list[dict]:
    legacy = json.loads((DATA / "storybook.json").read_text(encoding="utf-8"))
    legacy_by_id = {section["id"]: section for section in legacy["sections"]}
    narrative = json.loads((DATA / "narrative-storybook.json").read_text(encoding="utf-8"))
    if narrative.get("mode") != "chronological":
        return legacy["sections"]

    plan = json.loads((DATA / "narrative-plan.json").read_text(encoding="utf-8"))
    plan_by_id = {segment["id"]: segment for segment in plan["segments"]}
    sections: list[dict] = []

    for segment in sorted(narrative["segments"], key=lambda item: item["order"]):
        if segment.get("status") == "pending":
            continue

        legacy_ids = []
        if segment.get("storybookChapterId"):
            legacy_ids.append(segment["storybookChapterId"])
        legacy_ids.extend(segment.get("relatedChapterIds") or [])
        legacy_ids.extend(plan_by_id.get(segment["id"], {}).get("storybookChapterIds") or [])

        famous_people: set[str] = set()
        family_names: set[str] = set()
        for legacy_id in legacy_ids:
            legacy_section = legacy_by_id.get(legacy_id)
            if not legacy_section:
                continue
            famous_people.update(legacy_section.get("famousPeople") or [])
            family_names.update(legacy_section.get("familyNames") or [])

        blocks = segment.get("blocks") or []
        teaser = next(
            (block["text"][:160] for block in blocks if block.get("type") == "paragraph" and block.get("text")),
            "",
        )
        sections.append(
            {
                "id": segment["id"],
                "title": segment["title"],
                "branch": segment["branch"],
                "yearStart": segment["yearStart"],
                "yearEnd": segment.get("yearEnd"),
                "teaser": teaser,
                "famousPeople": sorted(famous_people),
                "familyNames": sorted(family_names),
                "imageCount": count_images(blocks),
                "blocks": blocks,
            }
        )

    return sections


def main() -> int:
    timeline = json.loads((DATA / "timeline.index.json").read_text(encoding="utf-8"))
    locations = json.loads((DATA / "locations.index.json").read_text(encoding="utf-8"))
    family_tree = json.loads((DATA / "family-tree.seed.json").read_text(encoding="utf-8"))
    sections = load_story_sections()

    entries: list[dict] = []

    for event in timeline:
        if not (event.get("famousPeople") or event.get("mentionsFamily") or event.get("familyNames")):
            continue
        label = shorten(event["title"])
        location = event["location"]["name"]
        year = event["year"]
        summary = make_summary(event.get("summary") or label)
        refs = merge_refs(
            [
                {
                    "label": ref_label(f"Map · {year} {location}"),
                    "href": f"/map?year={year}&event={event['id']}",
                    "kind": "map",
                }
            ],
            chapter_refs_for_year(year, sections),
        )
        for name in event.get("familyNames", []):
            person = next((p for p in family_tree["people"] if name.lower() in p["name"].lower()), None)
            if person:
                refs = merge_refs(
                    refs,
                    [
                        {
                            "label": ref_label(f"Tree · {person['name']}"),
                            "href": f"/tree?person={person['id']}",
                            "kind": "tree",
                        }
                    ],
                )
        entries.append(
            {
                "id": f"event-{event['id']}",
                "kind": "event",
                "label": label,
                "subtitle": f"{year} · {location}",
                "year": year,
                "summary": summary,
                "references": refs,
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

    for section in sections:
        text_blob = section_text(section)
        summary_source = " ".join(
            [section.get("teaser", ""), text_blob[:900]],
        )
        summary = make_summary(summary_source or section["title"])
        year = section["yearStart"]
        refs = merge_refs(
            [
                {
                    "label": ref_label(f"Story · {section['title'].split(' (+')[0]}"),
                    "href": f"/story/{section['id']}",
                    "kind": "story",
                },
                {
                    "label": ref_label(f"Map · {year} timeline"),
                    "href": f"/map?year={year}",
                    "kind": "map",
                },
            ],
        )
        entries.append(
            {
                "id": f"chapter-{section['id']}",
                "kind": "chapter",
                "label": section["title"],
                "subtitle": f"{section['yearStart']} · {section['branch']} branch",
                "year": section["yearStart"],
                "summary": summary,
                "references": refs,
                "terms": slug_terms(
                    section["title"],
                    section.get("teaser", ""),
                    text_blob[:500],
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
        summary_bits = [
            f"{person['name']} appears on the {person['branch']} branch of Winifred Coss's family tree.",
        ]
        if person.get("born"):
            summary_bits.append(f"Born in {person['born']}.")
        if person.get("place"):
            summary_bits.append(f"Associated with {person['place']}.")
        if person.get("note"):
            summary_bits.append(person["note"])
        summary = make_summary(" ".join(summary_bits))

        refs = merge_refs(
            [
                {
                    "label": ref_label(f"Tree · {person['name']}"),
                    "href": f"/tree?person={person['id']}",
                    "kind": "tree",
                }
            ],
            chapter_refs_for_terms(person["name"], sections, limit=2),
        )
        if person.get("born"):
            refs = merge_refs(
                refs,
                [
                    {
                        "label": ref_label(f"Map · {person['born']} era"),
                        "href": f"/map?year={person['born']}",
                        "kind": "map",
                    }
                ],
            )

        entries.append(
            {
                "id": f"person-{person['id']}",
                "kind": "person",
                "label": person["name"],
                "subtitle": " · ".join(subtitle_parts),
                "year": person.get("born"),
                "summary": summary,
                "references": refs,
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
        summary = make_summary(
            f"{location['name']} is indexed on the family map as a place where story events occurred."
        )
        refs = merge_refs(
            [
                {
                    "label": ref_label(f"Map · {location['name']}"),
                    "href": f"/map?place={location['id']}",
                    "kind": "map",
                }
            ],
            chapter_refs_for_terms(location["name"], sections, limit=2),
        )
        entries.append(
            {
                "id": f"place-{location['id']}",
                "kind": "place",
                "label": location["name"],
                "subtitle": f"Mapped location · {location['scope']}",
                "summary": summary,
                "references": refs,
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