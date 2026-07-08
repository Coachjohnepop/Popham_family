import { buildSearchAnswer, type AskSearchResult } from "@/lib/ask-search";
import { matchEventBriefByKeywords, type AnswerDepth } from "@/lib/event-briefs";
import { matchVoiceNavigation } from "@/lib/voice-navigation";
import { getStorySections } from "@/lib/storybook";

export type AskEventResult =
  | { type: "reveal"; eventId: string; message: string; depth?: AnswerDepth }
  | { type: "depth"; depth: AnswerDepth; message: string }
  | { type: "search-answer"; answer: AskSearchResult; message: string }
  | { type: "message"; message: string };

function detectFollowUpDepth(heard: string): AnswerDepth | null {
  const t = heard
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    /\b(short version|keep it short|brief answer|quick answer|shorter|less detail|summarize|too long)\b/.test(
      t,
    )
  ) {
    return "brief";
  }

  if (/\b(standard detail|normal detail|thats enough|that is enough|medium detail)\b/.test(t)) {
    return "standard";
  }

  if (
    /\b(tell me more|more detail|more details|even more|go deeper|full story|hear more|longer version|expand on|fascinating|keep going|what else)\b/.test(
      t,
    )
  ) {
    return "deep";
  }

  return null;
}

export function processAskEventTranscript(transcript: string): AskEventResult {
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

  const followUpDepth = detectFollowUpDepth(heard);
  if (followUpDepth) {
    return {
      type: "depth",
      depth: followUpDepth,
      message: `Showing ${followUpDepth === "deep" ? "more detail" : followUpDepth} answer.`,
    };
  }

  const keywordMatch = matchEventBriefByKeywords(heard);
  if (keywordMatch) {
    return {
      type: "reveal",
      eventId: keywordMatch.id,
      message: `Showing: ${keywordMatch.title}`,
    };
  }

  const searchAnswer = buildSearchAnswer(heard);
  if (searchAnswer) {
    return {
      type: "search-answer",
      answer: searchAnswer,
      message: searchAnswer.directMatch
        ? `Found family records about ${searchAnswer.topicLabel}.`
        : `No direct mention of ${searchAnswer.topicLabel} — showing closest ties in the tree.`,
    };
  }

  return {
    type: "message",
    message: `I couldn't find “${heard}” in the indexed family narrative. Try names, places, years, or events from the story.`,
  };
}