import { matchEventBriefByKeywords, type AnswerDepth, type EventBrief } from "@/lib/event-briefs";
import { matchVoiceNavigation } from "@/lib/voice-navigation";
import { getStorySections } from "@/lib/storybook";

export type AskEventResult =
  | { type: "reveal"; eventId: string; message: string; depth?: AnswerDepth }
  | { type: "depth"; depth: AnswerDepth; message: string }
  | { type: "message"; message: string };

export function processAskEventTranscript(
  transcript: string,
  chapterBriefs: EventBrief[],
): AskEventResult {
  const heard = transcript.trim();
  if (!heard) {
    return { type: "message", message: "Type or say your question." };
  }

  const sections = getStorySections();
  const result = matchVoiceNavigation(heard, sections, "chapter");

  if (result?.action === "event-brief") {
    return {
      type: "reveal",
      eventId: result.eventId,
      message: `Showing: ${result.label}`,
    };
  }

  if (result?.action === "answer-depth") {
    return {
      type: "depth",
      depth: result.depth,
      message: `Showing ${result.depth === "deep" ? "more detail" : result.depth} answer.`,
    };
  }

  const keywordMatch = matchEventBriefByKeywords(heard);
  if (keywordMatch && chapterBriefs.some((b) => b.id === keywordMatch.id)) {
    return {
      type: "reveal",
      eventId: keywordMatch.id,
      message: `Showing: ${keywordMatch.title}`,
    };
  }

  if (chapterBriefs.length === 1 && heard.length >= 8) {
    const brief = chapterBriefs[0];
    return {
      type: "reveal",
      eventId: brief.id,
      message: `Answering: ${brief.title}`,
    };
  }

  if (result?.action === "unknown") {
    return {
      type: "message",
      message: `Heard “${heard}” — try the Salem button below or type the question.`,
    };
  }

  return {
    type: "message",
    message: `Heard “${heard}” — pick a choice below or tap Ask.`,
  };
}