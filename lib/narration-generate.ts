import type { AnswerDepth } from "@/lib/event-briefs";
import { extractiveSpokenSummary } from "@/lib/narration-extractive";
import { getOpenAiApiKey, parseOpenAiError } from "@/lib/openai-server";

const DEPTH_GUIDANCE: Record<AnswerDepth, string> = {
  brief: "about 45–70 words (under 30 seconds spoken)",
  standard: "about 120–180 words (under one minute spoken)",
  deep: "about 250–400 words (up to two minutes spoken)",
};

export type GenerateSpokenSummaryResult = {
  spoken: string;
  method: "ai" | "extractive";
};

export async function generateSpokenSummary(
  sourceText: string,
  depth: AnswerDepth,
  context?: { label?: string; question?: string },
): Promise<GenerateSpokenSummaryResult> {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    return { spoken: "", method: "extractive" };
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return {
      spoken: extractiveSpokenSummary(trimmed, depth),
      method: "extractive",
    };
  }

  const label = context?.label ? `Topic: ${context.label}.` : "";
  const question = context?.question ? `The listener asked: ${context.question}` : "";

  const system = [
    "You write scripts for a warm British documentary narrator reading family history aloud.",
    "Use plain prose only — no bullet lists, markdown, or parenthetical stage directions.",
    "Focus on how this connects to the Winifred Coss family tree when the source mentions it.",
    "Never invent facts not present in the source text.",
  ].join(" ");

  const user = [
    label,
    question,
    `Depth: ${depth} (${DEPTH_GUIDANCE[depth]}).`,
    "Summarize the SOURCE below for spoken delivery.",
    "",
    "SOURCE:",
    trimmed.slice(0, 14_000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
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
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      console.error("narration-generate:", res.status, await res.text());
      return {
        spoken: extractiveSpokenSummary(trimmed, depth),
        method: "extractive",
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const spoken = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!spoken) {
      return {
        spoken: extractiveSpokenSummary(trimmed, depth),
        method: "extractive",
      };
    }
    return { spoken, method: "ai" };
  } catch (err) {
    console.error("narration-generate:", err instanceof Error ? err.message : err);
    return {
      spoken: extractiveSpokenSummary(trimmed, depth),
      method: "extractive",
    };
  }
}

export function parseGenerateError(body: string): string {
  return parseOpenAiError(body);
}