import type { AnswerDepth } from "@/lib/event-briefs";

const DEPTH_SENTENCES: Record<AnswerDepth, number> = {
  brief: 2,
  standard: 5,
  deep: 10,
};

const DEPTH_MAX_CHARS: Record<AnswerDepth, number> = {
  brief: 420,
  standard: 1100,
  deep: 2400,
};

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

/** Offline fallback when OpenAI is unavailable — uses full source, not index snippets. */
export function extractiveSpokenSummary(sourceText: string, depth: AnswerDepth): string {
  const cleaned = sourceText.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";

  const sentences = splitSentences(cleaned);
  if (!sentences.length) {
    return cleaned.slice(0, DEPTH_MAX_CHARS[depth]).trim();
  }

  const take = Math.min(DEPTH_SENTENCES[depth], sentences.length);
  let out = sentences.slice(0, take).join(" ");
  if (out.length > DEPTH_MAX_CHARS[depth]) {
    out = out.slice(0, DEPTH_MAX_CHARS[depth] - 1).replace(/\s+\S*$/, "") + "…";
  }
  return out;
}