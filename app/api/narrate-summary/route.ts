import { NextResponse } from "next/server";
import type { AnswerDepth } from "@/lib/event-briefs";
import { generateSpokenSummary } from "@/lib/narration-generate";
import {
  chapterFullText,
  sourceTextForEventBrief,
  sourceTextForSearchEntry,
} from "@/lib/narration-sources";
import {
  narrationCacheKey,
  type NarrationSourceKind,
  type NarrationSummaryEntry,
} from "@/lib/narration-types";
import { getNarrationStore } from "@/lib/narration-summaries";
import { getSearchEntries } from "@/lib/search";

function isDepth(value: string): value is AnswerDepth {
  return value === "brief" || value === "standard" || value === "deep";
}

function isSourceKind(value: string): value is NarrationSourceKind {
  return (
    value === "event-brief" ||
    value === "chapter" ||
    value === "search" ||
    value === "event"
  );
}

function resolveSourceText(
  sourceKind: NarrationSourceKind,
  sourceId: string,
  depth: AnswerDepth,
): { text: string; label?: string } {
  if (sourceKind === "event-brief") {
    return { text: sourceTextForEventBrief(sourceId, depth), label: sourceId };
  }

  if (sourceKind === "chapter") {
    return { text: chapterFullText(sourceId), label: sourceId };
  }

  const entries = getSearchEntries();
  const entryId = sourceKind === "event" ? `event-${sourceId}` : sourceId;
  const entry = entries.find((e) => e.id === entryId);
  if (entry) {
    return { text: sourceTextForSearchEntry(entry), label: entry.label };
  }

  return { text: "" };
}

export async function POST(request: Request) {
  let body: {
    sourceKind?: string;
    sourceId?: string;
    depth?: string;
    question?: string;
    label?: string;
    refresh?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceKind = body.sourceKind ?? "";
  const sourceId = body.sourceId?.trim() ?? "";
  const depth = body.depth ?? "";

  if (!isSourceKind(sourceKind) || !sourceId || !isDepth(depth)) {
    return NextResponse.json({ error: "Invalid sourceKind, sourceId, or depth" }, { status: 400 });
  }

  const key = narrationCacheKey(sourceKind, sourceId, depth);
  const store = getNarrationStore();

  if (!body.refresh) {
    const hit = store.entries[key];
    if (hit?.spoken) {
      return NextResponse.json({ key, entry: hit, cached: true });
    }
  }

  const resolved = resolveSourceText(sourceKind, sourceId, depth);
  if (!resolved.text.trim()) {
    return NextResponse.json({ error: "No source text for this id" }, { status: 404 });
  }

  const generated = await generateSpokenSummary(resolved.text, depth, {
    label: body.label ?? resolved.label,
    question: body.question,
  });

  const entry: NarrationSummaryEntry = {
    spoken: generated.spoken,
    sourceKind,
    sourceId,
    depth,
    method: generated.method,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({
    key,
    entry,
    cached: false,
    hint:
      generated.method === "extractive"
        ? "Run npm run index:narration with OPENAI_API_KEY to precompute AI summaries into data/narration-summaries.json."
        : undefined,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const store = getNarrationStore();

  if (!key) {
    return NextResponse.json({
      version: store.version,
      generatedAt: store.generatedAt,
      entryCount: Object.keys(store.entries).length,
    });
  }

  const entry = store.entries[key];
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ key, entry, cached: true });
}