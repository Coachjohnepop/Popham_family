#!/usr/bin/env python3
"""Build chronological narrative plan from fact-manifest.json."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# Era boundaries for chronological narrative (not storybook chapter order).
ERA_BOUNDARIES = [
    (1485, 1574, "doors-opening", "Doors Opening: England, France, and the River"),
    (1575, 1590, "two-doorways", "Two Doorways: Hébert and Alcock"),
    (1591, 1625, "atlantic-crossings", "Atlantic Crossings"),
    (1626, 1655, "planting-towns", "Planting Towns"),
    (1656, 1675, "frontier-and-faith", "Frontier and Faith"),
    (1676, 1692, "wars-and-witch-panic", "Wars and Witch Panic"),
    (1693, 1750, "british-north-america", "British North America"),
    (1751, 1815, "empires-at-war", "Empires at War"),
    (1816, 1853, "west-to-iowa", "West to Iowa"),
    (1854, 1928, "dakota-years", "Dakota Years"),
    (1929, 1950, "depression-and-dust", "Depression and Dust"),
]


def main() -> int:
    manifest_path = DATA / "fact-manifest.json"
    if not manifest_path.exists():
        print("Run build:manifest first.", file=__import__("sys").stderr)
        return 1

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    facts = [
        f
        for f in manifest["facts"]
        if f["kind"] not in {"heading", "skip"} and f.get("primaryYear")
    ]

    segments = []
    for order, (year_start, year_end, seg_id, title) in enumerate(ERA_BOUNDARIES, start=1):
        seg_facts = [f for f in facts if year_start <= f["primaryYear"] <= year_end]
        uncovered = sum(
            1 for f in seg_facts if f.get("coverage", {}).get("status") == "uncovered"
        )
        person_events = sum(1 for f in seg_facts if f["kind"] == "person_event")
        direct = sum(1 for f in seg_facts if f.get("isDirectFamily"))

        segments.append(
            {
                "id": f"seg-{order:02d}-{seg_id}",
                "order": order,
                "yearStart": year_start,
                "yearEnd": year_end,
                "title": title,
                "status": "pending",
                "factCount": len(seg_facts),
                "personEventCount": person_events,
                "directFamilyFactCount": direct,
                "uncoveredAtPhase0": uncovered,
                "storybookChapterIds": sorted(
                    {f["storybookChapterId"] for f in seg_facts if f.get("storybookChapterId")}
                ),
            }
        )

    plan = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "approach": "chronological",
        "sourcePolicy": {
            "primary": "Family fact manifest (structured from Dad's document — prose never reused)",
            "supplementalAllowed": True,
            "supplementalUse": "Scene-setting, sensory detail, and well-established historical context only",
            "supplementalExamples": [
                "National Archives (UK)",
                "Library and Archives Canada",
                "Smithsonian, Parks Canada, Massachusetts Historical Society",
                "Stanford Encyclopedia of Philosophy (Reformation context)",
                "Established published histories (e.g. Bailyn, Eccles, Demos on Salem context)",
            ],
            "neverInvent": [
                "Family dialogue, motives, or relationships not in records",
                "Birth, marriage, death, or migration dates for named relatives",
                "Ancestors not in the manifest or family index",
            ],
        },
        "voice": {
            "style": "Literary nonfiction — spare, concrete, Steinbeck-influenced rhythm",
            "tone": "Understated emotion; let facts carry weight",
        },
        "segmentCount": len(segments),
        "segments": segments,
    }

    out = DATA / "narrative-plan.json"
    out.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(f"Chronological narrative plan: {len(segments)} segments")
    for seg in segments:
        print(
            f"  {seg['order']:2d}. {seg['yearStart']}–{seg['yearEnd']}  "
            f"{seg['factCount']:4d} facts  {seg['title']}"
        )
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())