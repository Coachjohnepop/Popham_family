"use client";

import { useState } from "react";
import EventBriefCard from "@/components/EventBriefCard";
import PromptChoicesPanel from "@/components/PromptChoicesPanel";
import VoicePickButton from "@/components/VoicePickButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import { processAskEventTranscript } from "@/lib/ask-event";
import {
  getEventBrief,
  isAnswerDepth,
  type AnswerDepth,
  type EventBrief,
} from "@/lib/event-briefs";
import { getPromptById, type PromptChoice } from "@/lib/prompt-index";

type AskEventPanelProps = {
  chapterBriefs: EventBrief[];
};

const DEFAULT_QUESTION =
  "How is our family tied to the Salem Witch Trials?";

export default function AskEventPanel({ chapterBriefs }: AskEventPanelProps) {
  const reader = useOptionalReader();
  const prompt = getPromptById("ask-event");
  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const activeBrief =
    (activeBriefId ? getEventBrief(activeBriefId) : undefined) ??
    chapterBriefs.find((b) => b.id === activeBriefId);

  function revealBrief(eventId: string) {
    setActiveBriefId(eventId);
    setVoiceError(null);
  }

  function handleDepth(depth: AnswerDepth) {
    reader?.setAnswerDepth(depth);
    setVoiceMessage(`Showing ${depth === "deep" ? "more detail" : depth} answer.`);
    setVoiceError(null);
  }

  function applyAskResult(transcript: string) {
    const outcome = processAskEventTranscript(transcript, chapterBriefs);

    if (outcome.type === "reveal") {
      revealBrief(outcome.eventId);
      setVoiceMessage(outcome.message);
      return;
    }

    if (outcome.type === "depth") {
      handleDepth(outcome.depth);
      if (!activeBriefId && chapterBriefs[0]) {
        revealBrief(chapterBriefs[0].id);
      }
      return;
    }

    setVoiceMessage(outcome.message);
  }

  function handleChoice(choice: PromptChoice) {
    setVoiceError(null);
    if (choice.action === "event-brief" && choice.target) {
      revealBrief(choice.target);
      setVoiceMessage(`Showing: ${choice.label}`);
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
      setVoiceMessage("Showing why this matters to our family.");
    }
  }

  function handleSubmitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const text = questionInput.trim() || DEFAULT_QUESTION;
    setQuestionInput(text);
    applyAskResult(text);
  }

  if (!prompt) return null;

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmitQuestion}
        className="rounded-2xl border border-[#c4b5fd] bg-[#f5f3ff] p-4"
      >
        <label htmlFor="ask-event-input" className="text-sm font-semibold text-[#5b21b6]">
          Ask your question
        </label>
        <p className="mt-1 text-xs text-[#6f5c49]">
          Type works every time — best for demos. Voice is optional below.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="ask-event-input"
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder={DEFAULT_QUESTION}
            className="min-w-0 flex-1 rounded-xl border border-[#ddd6fe] bg-white px-4 py-3 text-sm text-[#2b2118] placeholder:text-[#a8a29e] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[#7c3aed] px-5 py-3 text-sm font-semibold text-white hover:bg-[#6d28d9]"
          >
            Ask
          </button>
        </div>
      </form>

      <PromptChoicesPanel
        promptId="ask-event"
        onPick={handleChoice}
        compact
        interactiveActions={["event-brief", "answer-depth", "ask-ai"]}
      />

      <VoicePickButton
        label="Or say your question"
        activeLabel="Listening…"
        transcriptHint="Speak your question, then tap Done when finished."
        onTranscriptChange={setQuestionInput}
        onTranscript={(text) => {
          setVoiceError(null);
          setQuestionInput(text);
          applyAskResult(text);
        }}
        onError={(msg) => {
          setVoiceError(msg);
          setVoiceMessage(null);
        }}
      />

      {voiceError && (
        <p className="text-sm font-medium text-[#b45309]" role="alert">
          {voiceError}
        </p>
      )}

      {voiceMessage && !voiceError && (
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