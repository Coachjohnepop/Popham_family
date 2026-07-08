"use client";

import { useEffect, useRef, useState } from "react";
import EventBriefCard from "@/components/EventBriefCard";
import PromptChoicesPanel from "@/components/PromptChoicesPanel";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoicePickButton from "@/components/VoicePickButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import { processAskEventTranscript } from "@/lib/ask-event";
import {
  getEventBrief,
  getEventBriefBody,
  isAnswerDepth,
  type AnswerDepth,
  type EventBrief,
} from "@/lib/event-briefs";
import { getPromptById, type PromptChoice } from "@/lib/prompt-index";
import { speakText } from "@/lib/speak-text";

type AskEventPanelProps = {
  chapterBriefs: EventBrief[];
};

const DEFAULT_QUESTION =
  "How is our family tied to the Salem Witch Trials?";

export default function AskEventPanel({ chapterBriefs }: AskEventPanelProps) {
  const reader = useOptionalReader();
  const prompt = getPromptById("ask-event");
  const answerRef = useRef<HTMLDivElement>(null);
  const speakStopRef = useRef<(() => void) | null>(null);
  const spokenKeyRef = useRef<string | null>(null);

  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [confirmedQuestion, setConfirmedQuestion] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoSpeaking, setAutoSpeaking] = useState(false);
  const [voiceHealthHint, setVoiceHealthHint] = useState<string | null>(null);
  const [inDialogue, setInDialogue] = useState(false);

  const activeBrief =
    (activeBriefId ? getEventBrief(activeBriefId) : undefined) ??
    chapterBriefs.find((b) => b.id === activeBriefId);

  const answerDepth = reader?.answerDepth ?? "standard";
  const answerBody = activeBrief ? getEventBriefBody(activeBrief, answerDepth) : "";
  const answerScript = activeBrief && confirmedQuestion
    ? `You asked: ${confirmedQuestion}. Here is the answer. ${answerBody}`
    : "";

  function revealBrief(eventId: string) {
    setActiveBriefId(eventId);
    setInDialogue(true);
  }

  function handleDepth(depth: AnswerDepth) {
    reader?.setAnswerDepth(depth);
    setVoiceMessage(`Showing ${depth === "deep" ? "more detail" : depth} answer.`);
    setVoiceError(null);
    setInDialogue(true);
  }

  function applyAskResult(transcript: string) {
    const heard = transcript.trim() || DEFAULT_QUESTION;
    setConfirmedQuestion(heard);
    setQuestionInput(heard);
    setVoiceError(null);

    const outcome = processAskEventTranscript(heard, chapterBriefs);

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

    if (chapterBriefs[0]) {
      revealBrief(chapterBriefs[0].id);
      setVoiceMessage(`Showing answer for: “${heard}”`);
      return;
    }

    setVoiceMessage(outcome.message);
  }

  function showFallbackAnswer(errorMessage: string) {
    const fallbackQuestion = questionInput.trim() || DEFAULT_QUESTION;
    spokenKeyRef.current = null;
    setConfirmedQuestion(fallbackQuestion);
    if (chapterBriefs[0]) {
      revealBrief(chapterBriefs[0].id);
    }
    const billing = /billing|quota|payment/i.test(errorMessage);
    setVoiceMessage(
      billing
        ? "Couldn't transcribe (OpenAI billing) — showing the Salem answer anyway. Browser voice will read it."
        : "Couldn't catch every word — showing an answer below. Type or tap the mic to try again.",
    );
  }

  function handleChoice(choice: PromptChoice) {
    setVoiceError(null);
    if (choice.action === "event-brief" && choice.target) {
      setConfirmedQuestion(choice.label);
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
    applyAskResult(questionInput.trim() || DEFAULT_QUESTION);
  }

  function handleAskAnother() {
    setQuestionInput("");
    setConfirmedQuestion(null);
    setVoiceMessage(null);
    setVoiceError(null);
    spokenKeyRef.current = null;
    speakStopRef.current?.();
    setAutoSpeaking(false);
  }

  useEffect(() => {
    void fetch("/api/voice-health")
      .then((r) => r.json())
      .then((data: { ok?: boolean; hint?: string }) => {
        if (!data.ok && data.hint) setVoiceHealthHint(data.hint);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeBrief || !confirmedQuestion || !answerScript) return;

    const speakKey = `${activeBrief.id}:${confirmedQuestion}:${answerDepth}`;
    if (spokenKeyRef.current === speakKey) return;
    spokenKeyRef.current = speakKey;

    answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    speakStopRef.current?.();
    setAutoSpeaking(true);

    void speakText(answerScript, {
      onLoading: () => setAutoSpeaking(true),
      onSpeaking: () => setAutoSpeaking(true),
      onIdle: () => setAutoSpeaking(false),
    }).then((controller) => {
      speakStopRef.current = controller.stop;
    });

    return () => {
      speakStopRef.current?.();
      setAutoSpeaking(false);
    };
  }, [activeBrief, confirmedQuestion, answerScript, answerDepth]);

  if (!prompt) return null;

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmitQuestion}
        className="rounded-2xl border border-[#c4b5fd] bg-[#f5f3ff] p-4"
      >
        <label htmlFor="ask-event-input" className="text-sm font-semibold text-[#5b21b6]">
          {inDialogue ? "Ask a follow-up" : "Ask your question"}
        </label>
        <p className="mt-1 text-xs text-[#6f5c49]">
          Type and Ask, or tap 🎤 → speak → Done — we show and read the answer aloud.
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

      {!inDialogue && (
        <PromptChoicesPanel
          promptId="ask-event"
          onPick={handleChoice}
          compact
          interactiveActions={["event-brief", "answer-depth", "ask-ai"]}
        />
      )}

      {voiceHealthHint && (
        <p className="rounded-xl border border-[#fdba74] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
          Voice server: {voiceHealthHint}{" "}
          <a
            href="/api/voice-health"
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Check status
          </a>
        </p>
      )}

      <VoicePickButton
        label={inDialogue ? "Or say your follow-up" : "Or say your question"}
        activeLabel="Listening…"
        transcriptHint="Speak your question, then tap Done."
        onTranscriptChange={setQuestionInput}
        onTranscript={(text) => {
          applyAskResult(text);
        }}
        onError={(msg) => {
          setVoiceError(msg);
          showFallbackAnswer(msg);
        }}
      />

      {voiceError && (
        <p className="rounded-xl border border-[#fdba74] bg-[#fff7ed] px-4 py-3 text-sm font-medium text-[#b45309]" role="alert">
          {voiceError}
        </p>
      )}

      {confirmedQuestion && (
        <div className="rounded-2xl border-2 border-[#86efac] bg-[#f0fdf4] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#15803d]">
            We heard you ask
          </p>
          <p className="mt-2 font-serif text-lg font-semibold text-[#14532d]">
            &ldquo;{confirmedQuestion}&rdquo;
          </p>
          {autoSpeaking && (
            <p className="mt-2 text-sm text-[#166534]">Reading the answer aloud…</p>
          )}
        </div>
      )}

      {voiceMessage && (
        <p className="text-sm font-medium text-[#5b21b6]" role="status">
          {voiceMessage}
        </p>
      )}

      {inDialogue && activeBrief && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDepth("deep")}
            className="rounded-full bg-[#ede9fe] px-4 py-2 text-sm font-semibold text-[#5b21b6] hover:bg-[#ddd6fe]"
          >
            Tell me more
          </button>
          <button
            type="button"
            onClick={() => handleDepth("brief")}
            className="rounded-full bg-[#ede9fe] px-4 py-2 text-sm font-semibold text-[#5b21b6] hover:bg-[#ddd6fe]"
          >
            Shorter version
          </button>
          <button
            type="button"
            onClick={handleAskAnother}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6f5c49] ring-1 ring-[#e2d4bf] hover:bg-[#fffaf2]"
          >
            Ask another question
          </button>
        </div>
      )}

      {activeBrief && (
        <div ref={answerRef} id="event-answer" className="scroll-mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-xl font-semibold text-[#2b2118]">
              Here&apos;s the answer
            </h3>
            {answerScript && (
              <ReadAloudButton text={answerScript} label="Hear answer again" />
            )}
          </div>
          <EventBriefCard
            brief={activeBrief}
            question={prompt.question}
            depth={answerDepth}
          />
        </div>
      )}
    </div>
  );
}