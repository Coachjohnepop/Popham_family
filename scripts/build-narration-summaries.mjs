#!/usr/bin/env node
/**
 * Precompute spoken narration summaries into data/narration-summaries.json.
 *
 * Uses hand-written event-brief tiers (no API). For chapters / search / events,
 * calls OpenAI when OPENAI_API_KEY is set; otherwise uses extractive summaries
 * from full source text (not truncated search snippets).
 *
 * Usage:
 *   node scripts/build-narration-summaries.mjs
 *   OPENAI_API_KEY=sk-... node scripts/build-narration-summaries.mjs --ai
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const DEPTHS = ["brief", "standard", "deep"];
const USE_AI = process.argv.includes("--ai");

const DEPTH_SENTENCES = { brief: 2, standard: 5, deep: 10 };
const DEPTH_MAX_CHARS = { brief: 420, standard: 1100, deep: 2400 };

function loadJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));
}

function narrationKey(sourceKind, sourceId, depth) {
  return `${sourceKind}:${sourceId}:${depth}`;
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function extractiveSummary(sourceText, depth) {
  const cleaned = sourceText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const sentences = splitSentences(cleaned);
  if (!sentences.length) return cleaned.slice(0, DEPTH_MAX_CHARS[depth]);
  const take = Math.min(DEPTH_SENTENCES[depth], sentences.length);
  let out = sentences.slice(0, take).join(" ");
  if (out.length > DEPTH_MAX_CHARS[depth]) {
    out = out.slice(0, DEPTH_MAX_CHARS[depth] - 1).replace(/\s+\S*$/, "") + "…";
  }
  return out;
}

function sectionParagraphs(section) {
  return (section.blocks || [])
    .filter((b) => b.type === "paragraph")
    .map((b) => b.text.trim())
    .filter(Boolean);
}

function chapterFullText(section) {
  return sectionParagraphs(section).join("\n\n");
}

function timelineEventText(eventId, timeline) {
  const row = timeline.find((e) => e.id === eventId);
  if (!row) return "";
  const title = row.title.replace(/…$/u, "").trim();
  return `${title}\n\n${row.summary}`.trim();
}

function sourceTextForSearchEntry(entry, storybook, timeline) {
  if (entry.kind === "chapter") {
    const id = entry.id.replace(/^chapter-/, "");
    const section = storybook.sections.find((s) => s.id === id);
    if (section) return chapterFullText(section);
  }
  if (entry.kind === "event") {
    const id = entry.id.replace(/^event-/, "");
    const fromTimeline = timelineEventText(id, timeline);
    if (fromTimeline) return fromTimeline;
    const storyRef = entry.references?.find((r) => r.href?.startsWith("/story/"));
    if (storyRef) {
      const chapterId = storyRef.href.replace("/story/", "").split("?")[0];
      const section = storybook.sections.find((s) => s.id === chapterId);
      if (section) return chapterFullText(section);
    }
  }
  return [entry.label, entry.subtitle, ...(entry.summary || [])].filter(Boolean).join(". ");
}

async function aiSummary(sourceText, depth, label, apiKey) {
  const guidance = {
    brief: "about 45–70 words",
    standard: "about 120–180 words",
    deep: "about 250–400 words",
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "You write scripts for a warm British documentary narrator reading family history aloud. Plain prose only. Never invent facts not in the source.",
        },
        {
          role: "user",
          content: `Topic: ${label}. Depth: ${depth} (${guidance[depth]}).\n\nSOURCE:\n${sourceText.slice(0, 14000)}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function main() {
  const briefs = loadJson("event-briefs.json");
  const storybook = loadJson("storybook.json");
  const searchIndex = loadJson("search.index.json");
  const timeline = loadJson("timeline.index.json");

  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^["']|["']$/g, "");
  const useAi = USE_AI && apiKey;

  const entries = {};
  const now = new Date().toISOString();

  for (const brief of briefs) {
    for (const depth of DEPTHS) {
      const spoken = (brief.tiers?.[depth] ?? brief.tiers?.standard ?? "")
        .replace(/\n+/g, " ")
        .trim();
      if (!spoken) continue;
      entries[narrationKey("event-brief", brief.id, depth)] = {
        spoken,
        sourceKind: "event-brief",
        sourceId: brief.id,
        depth,
        method: "hand",
        updatedAt: now,
      };
    }
  }

  for (const section of storybook.sections) {
    const source = chapterFullText(section);
    if (!source) continue;
    for (const depth of DEPTHS) {
      let spoken = "";
      let method = "extractive";
      if (useAi) {
        try {
          spoken = await aiSummary(source, depth, section.title, apiKey);
          method = "ai";
        } catch (e) {
          console.warn(`AI chapter ${section.id} ${depth}:`, e.message);
        }
      }
      if (!spoken) spoken = extractiveSummary(source, depth);
      entries[narrationKey("chapter", section.id, depth)] = {
        spoken,
        sourceKind: "chapter",
        sourceId: section.id,
        depth,
        method,
        updatedAt: now,
      };
    }
  }

  let aiCount = 0;
  let extractiveCount = 0;
  for (const entry of searchIndex.entries) {
    const source = sourceTextForSearchEntry(entry, storybook, timeline);
    for (const depth of DEPTHS) {
      let spoken = "";
      let method = "extractive";
      if (useAi && source.length > 80) {
        try {
          spoken = await aiSummary(source, depth, entry.label, apiKey);
          method = "ai";
          aiCount += 1;
        } catch (e) {
          console.warn(`AI search ${entry.id} ${depth}:`, e.message);
        }
      }
      if (!spoken) {
        spoken = extractiveSummary(source, depth);
        extractiveCount += 1;
      }

      const sourceKind = entry.kind === "chapter" ? "chapter" : entry.kind === "event" ? "event" : "search";
      const sourceId =
        entry.kind === "chapter"
          ? entry.id.replace(/^chapter-/, "")
          : entry.kind === "event"
            ? entry.id.replace(/^event-/, "")
            : entry.id;

      entries[narrationKey("search", entry.id, depth)] = {
        spoken,
        sourceKind: "search",
        sourceId: entry.id,
        depth,
        method,
        updatedAt: now,
      };

      if (sourceKind !== "search") {
        entries[narrationKey(sourceKind, sourceId, depth)] = {
          spoken,
          sourceKind,
          sourceId,
          depth,
          method,
          updatedAt: now,
        };
      }
    }
  }

  const out = {
    version: 1,
    generatedAt: now,
    contentVersion: "storybook+timeline+briefs",
    entries,
  };

  fs.writeFileSync(path.join(DATA, "narration-summaries.json"), JSON.stringify(out, null, 2));
  console.log(
    `Wrote ${Object.keys(entries).length} narration entries` +
      (useAi ? ` (${aiCount} AI, ${extractiveCount} extractive fallbacks)` : " (extractive + hand tiers)") +
      (USE_AI && !apiKey ? " — OPENAI_API_KEY missing, skipped --ai" : ""),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});