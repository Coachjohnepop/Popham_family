"use client";

import { useState } from "react";
import EventBriefCard from "@/components/EventBriefCard";
import PromptChoicesPanel from "@/components/PromptChoicesPanel";
import VoicePickButton from "@/components/VoicePickButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import {
  getEventBrief,
  isAnswerDepth,
  type AnswerDepth,
  type EventBrief,
} from "@/lib/event-briefs";
import { getPromptById, type PromptChoice } from "@/lib/prompt-index";
import { getStorySections } from "@/lib/storybook";
import { matchVoiceNavigation } from "@/lib/voice-navigation";

type AskEventPanelProps = {
  chapterBriefs: EventBrief[];
};

export default function AskEventPanel({ chapterBriefs }: AskEventPanelProps) {
  const reader = useOptionalReader();
  const prompt = getPromptById("ask-event");
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);

  const activeBrief =
    (activeBriefId ? getEventBrief(activeBriefId) : undefined) ??
    chapterBriefs.find((b) => b.id === activeBriefId);

  function revealBrief(eventId: string) {
    setActiveBriefId(eventId);
    setVoiceMessage(null);
  }

  function handleDepth(depth: AnswerDepth) {
    reader?.setAnswerDepth(depth);
    setVoiceMessage(`Showing ${depth === "deep" ? "more detail" : depth} answer.`);
  }

  function handleChoice(choice: PromptChoice) {
    if (choice.action === "event-brief" && choice.target) {
      revealBrief(choice.target);
      return;
    }
    if (choice.action === "answer-depth" && choice.target && isAnswerDepth(choice.target)) {
      handleDepth(choice.target);
      if (!activeBriefId && chapterBriefs[0]) {
        revealBrief(chapterBriefs[0].id);
      }
      return;
    }
    if (choice.action === "ask-ai" && chapterBriefs[0]) {
      revealBrief(chapterBriefs[0].id);
      reader?.setAnswerDepth("deep");
    }
  }

  function handleVoiceTranscript(transcript: string) {
    const sections = getStorySections();
    const result = matchVoiceNavigation(transcript, sections, "chapter");
    if (!result) {
      setVoiceMessage(`Heard “${transcript}” — try one of the choices below.`);
      return;
    }

    if (result.action === "event-brief") {
      revealBrief(result.eventId);
      setVoiceMessage(`Showing: ${result.label}`);
      return;
    }

    if (result.action === "answer-depth") {
      handleDepth(result.depth);
      if (!activeBriefId && chapterBriefs[0]) {
        revealBrief(chapterBriefs[0].id);
      }
      return;
    }

    setVoiceMessage(`Heard “${transcript}” — pick an event or depth below.`);
  }

  if (!prompt) return null;

  return (
    <div className="space-y-4">
      <PromptChoicesPanel
        promptId="ask-event"
        onPick={handleChoice}
        compact
        interactiveActions={["event-brief", "answer-depth", "ask-ai"]}
      />

      <VoicePickButton
        label="Ask about this event"
        activeLabel="Listening…"
        onTranscript={handleVoiceTranscript}
        onError={(msg) => setVoiceMessage(msg)}
      />

      {voiceMessage && (
        <p className="text-sm text-[#6f5c49]" role="status">
          {voiceMessage}
        </p>
      )}

      {activeBrief && (
        <EventBriefCard
          brief={activeBrief}
          question={prompt.question}
          depth={reader?.answerDepth}
        />
      )}
    </div>
  );
}