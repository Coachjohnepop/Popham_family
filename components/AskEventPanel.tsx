"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import EventBriefCard from "@/components/EventBriefCard";
import PromptChoicesPanel from "@/components/PromptChoicesPanel";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoicePickButton from "@/components/VoicePickButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import { processAskEventTranscript } from "@/lib/ask-event";
import {
  getChapterParagraphs,
  getNextChapterNarration,
} from "@/lib/chapter-narration";
import {
  getEventBrief,
  getEventBriefBody,
  getEventBriefDelta,
  isAnswerDepth,
  isDeeperDepth,
  type AnswerDepth,
  type EventBrief,
} from "@/lib/event-briefs";
import { getPromptById, type PromptChoice } from "@/lib/prompt-index";
import { speakText, type SpeakController, type SpeakState } from "@/lib/speak-text";
import type { StorySection } from "@/lib/types";

type AskEventPanelProps = {
  chapterBriefs: EventBrief[];
  section: StorySection;
  nextSection?: StorySection | null;
};

type ResponseKind = "brief" | "addendum" | "chapter";

const DEFAULT_QUESTION =
  "How is our family tied to the Salem Witch Trials?";

export default function AskEventPanel({
  chapterBriefs,
  section,
  nextSection,
}: AskEventPanelProps) {
  const reader = useOptionalReader();
  const prompt = getPromptById("ask-event");
  const answerRef = useRef<HTMLDivElement>(null);
  const speakControllerRef = useRef<SpeakController | null>(null);
  const spokenKeyRef = useRef<string | null>(null);
  const spokenCorpusRef = useRef("");

  const chapterParagraphs = useMemo(
    () => getChapterParagraphs(section.blocks),
    [section.blocks],
  );

  const [activeBriefId, setActiveBriefId] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [confirmedQuestion, setConfirmedQuestion] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoSpeaking, setAutoSpeaking] = useState(false);
  const [voiceHealthHint, setVoiceHealthHint] = useState<string | null>(null);
  const [inDialogue, setInDialogue] = useState(false);
  const [addendumFromDepth, setAddendumFromDepth] = useState<AnswerDepth | null>(null);
  const [speechState, setSpeechState] = useState<SpeakState>("idle");
  const [panelDepth, setPanelDepth] = useState<AnswerDepth | null>(null);
  const [responseKind, setResponseKind] = useState<ResponseKind>("brief");
  const [chapterNarrationText, setChapterNarrationText] = useState<string | null>(null);
  const [chapterCursor, setChapterCursor] = useState(0);
  const [briefAddendumUsed, setBriefAddendumUsed] = useState(false);
  const [narrationEpoch, setNarrationEpoch] = useState(0);

  const activeBrief =
    (activeBriefId ? getEventBrief(activeBriefId) : undefined) ??
    chapterBriefs.find((b) => b.id === activeBriefId);

  const answerDepth = panelDepth ?? reader?.answerDepth ?? "standard";

  const isAddendum =
    responseKind === "addendum" &&
    Boolean(activeBrief && addendumFromDepth && isDeeperDepth(addendumFromDepth, answerDepth));

  const answerBody =
    activeBrief && responseKind !== "chapter"
      ? isAddendum
        ? getEventBriefDelta(activeBrief, addendumFromDepth!, answerDepth)
        : getEventBriefBody(activeBrief, answerDepth)
      : "";

  const readAloudScript =
    responseKind === "chapter" && chapterNarrationText
      ? `Continuing the story. ${chapterNarrationText}`
      : activeBrief && confirmedQuestion && answerBody
        ? isAddendum
          ? `Here is more detail. ${answerBody}`
          : `You asked: ${confirmedQuestion}. Here is the answer. ${answerBody}`
        : "";

  function resetNarrationState() {
    setPanelDepth(null);
    setAddendumFromDepth(null);
    setResponseKind("brief");
    setChapterNarrationText(null);
    setChapterCursor(0);
    setBriefAddendumUsed(false);
    spokenCorpusRef.current = "";
    spokenKeyRef.current = null;
  }

  function revealBrief(eventId: string) {
    setActiveBriefId(eventId);
    setInDialogue(true);
  }

  function handleDepth(depth: AnswerDepth, opts?: { fromDepth?: AnswerDepth; label?: string }) {
    const fromDepth = opts?.fromDepth ?? answerDepth;
    if (opts?.label) setConfirmedQuestion(opts.label);

    setPanelDepth(depth);
    reader?.setAnswerDepth(depth);
    setResponseKind(isDeeperDepth(fromDepth, depth) ? "addendum" : "brief");
    setChapterNarrationText(null);

    if (activeBriefId && isDeeperDepth(fromDepth, depth)) {
      setAddendumFromDepth(fromDepth);
      setBriefAddendumUsed(true);
    } else if (!isDeeperDepth(fromDepth, depth)) {
      setAddendumFromDepth(null);
    }

    spokenKeyRef.current = null;
    setNarrationEpoch((n) => n + 1);
    setVoiceMessage(
      isDeeperDepth(fromDepth, depth)
        ? "Reading only the new detail you haven't heard yet."
        : `Showing ${depth === "deep" ? "more detail" : depth} answer.`,
    );
    setVoiceError(null);
    setInDialogue(true);
  }

  function advanceNarration(label = "Tell me more") {
    if (!activeBrief) return;

    setConfirmedQuestion(label);
    setQuestionInput(label);
    setVoiceError(null);
    spokenKeyRef.current = null;

    const depth = answerDepth;

    if (!briefAddendumUsed && depth !== "deep") {
      const delta = getEventBriefDelta(activeBrief, depth, "deep");
      if (delta.trim()) {
        handleDepth("deep", { fromDepth: depth, label });
        return;
      }
      setBriefAddendumUsed(true);
    }

    const chunk = getNextChapterNarration(
      chapterParagraphs,
      chapterCursor,
      spokenCorpusRef.current,
    );

    if (!chunk) {
      setVoiceMessage(
        nextSection
          ? `End of this chapter. Next chronologically: ${nextSection.title}.`
          : "You've reached the end of this chapter.",
      );
      return;
    }

    setPanelDepth("deep");
    setResponseKind("chapter");
    setAddendumFromDepth(null);
    setChapterNarrationText(chunk.text);
    setChapterCursor(chunk.nextCursor);
    setNarrationEpoch((n) => n + 1);
    setVoiceMessage(
      chunk.done
        ? "Last passage in this chapter."
        : "Continuing the story — next passage from the family narrative.",
    );
    setInDialogue(true);
  }

  function applyAskResult(transcript: string) {
    const heard = transcript.trim() || DEFAULT_QUESTION;
    setConfirmedQuestion(heard);
    setQuestionInput(heard);
    setVoiceError(null);

    const outcome = processAskEventTranscript(heard, chapterBriefs);
    const depthBeforeAsk = answerDepth;

    if (outcome.type === "reveal") {
      resetNarrationState();
      setPanelDepth("standard");
      reader?.setAnswerDepth("standard");
      revealBrief(outcome.eventId);
      setNarrationEpoch((n) => n + 1);
      setVoiceMessage(outcome.message);
      return;
    }

    if (outcome.type === "depth") {
      if (outcome.depth === "deep" && activeBriefId) {
        advanceNarration(heard);
        return;
      }
      handleDepth(outcome.depth, { fromDepth: depthBeforeAsk, label: heard });
      if (!activeBriefId && chapterBriefs[0]) {
        revealBrief(chapterBriefs[0].id);
      }
      return;
    }

    if (chapterBriefs[0]) {
      resetNarrationState();
      setPanelDepth("standard");
      reader?.setAnswerDepth("standard");
      revealBrief(chapterBriefs[0].id);
      setNarrationEpoch((n) => n + 1);
      setVoiceMessage(`Showing answer for: “${heard}”`);
      return;
    }

    setVoiceMessage(outcome.message);
  }

  function showFallbackAnswer(_errorMessage: string) {
    const fallbackQuestion = questionInput.trim() || DEFAULT_QUESTION;
    spokenKeyRef.current = null;
    setConfirmedQuestion(fallbackQuestion);
    if (chapterBriefs[0]) {
      revealBrief(chapterBriefs[0].id);
    }
    setVoiceMessage(
      "Couldn't catch every word — showing an answer below. Type or tap the mic to try again.",
    );
  }

  function handleChoice(choice: PromptChoice) {
    setVoiceError(null);
    if (choice.action === "event-brief" && choice.target) {
      resetNarrationState();
      setPanelDepth("standard");
      reader?.setAnswerDepth("standard");
      setConfirmedQuestion(choice.label);
      revealBrief(choice.target);
      setNarrationEpoch((n) => n + 1);
      setVoiceMessage(`Showing: ${choice.label}`);
      return;
    }
    if (choice.action === "answer-depth" && choice.target && isAnswerDepth(choice.target)) {
      handleDepth(choice.target, { label: choice.label });
      if (!activeBriefId && chapterBriefs[0]) {
        revealBrief(chapterBriefs[0].id);
      }
      return;
    }
    if (choice.action === "ask-ai" && chapterBriefs[0]) {
      resetNarrationState();
      revealBrief(chapterBriefs[0].id);
      setPanelDepth("deep");
      reader?.setAnswerDepth("deep");
      setBriefAddendumUsed(true);
      setNarrationEpoch((n) => n + 1);
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
    resetNarrationState();
    speakControllerRef.current?.stop();
    speakControllerRef.current = null;
    setAutoSpeaking(false);
    setSpeechState("idle");
  }

  function handlePauseResume() {
    const controller = speakControllerRef.current;
    if (!controller) return;
    if (controller.getState() === "paused") {
      controller.resume();
      setSpeechState("speaking");
      setAutoSpeaking(true);
    } else {
      controller.pause();
      setSpeechState("paused");
      setAutoSpeaking(false);
    }
  }

  function handleStopReading() {
    speakControllerRef.current?.stop();
    speakControllerRef.current = null;
    setAutoSpeaking(false);
    setSpeechState("idle");
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
    if (!confirmedQuestion || !readAloudScript) return;

    const speakKey = `${activeBrief?.id ?? "none"}:${confirmedQuestion}:${responseKind}:${answerDepth}:${addendumFromDepth ?? "full"}:${chapterCursor}:${narrationEpoch}`;
    if (spokenKeyRef.current === speakKey) return;
    spokenKeyRef.current = speakKey;

    spokenCorpusRef.current = `${spokenCorpusRef.current} ${readAloudScript}`.trim();

    answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    speakControllerRef.current?.stop();
    setAutoSpeaking(true);
    setSpeechState("loading");

    void speakText(readAloudScript, {
      onLoading: () => {
        setAutoSpeaking(true);
        setSpeechState("loading");
      },
      onSpeaking: () => {
        setAutoSpeaking(true);
        setSpeechState("speaking");
      },
      onPaused: () => {
        setAutoSpeaking(false);
        setSpeechState("paused");
      },
      onIdle: () => {
        setAutoSpeaking(false);
        setSpeechState("idle");
      },
    }).then((controller) => {
      speakControllerRef.current = controller;
    });

    return () => {
      speakControllerRef.current?.stop();
      speakControllerRef.current = null;
      setAutoSpeaking(false);
      setSpeechState("idle");
    };
  }, [confirmedQuestion, readAloudScript, responseKind, answerDepth, addendumFromDepth, chapterCursor, narrationEpoch, activeBrief?.id]);

  if (!prompt) return null;

  return (
    <div className="space-y-3">
      <form
        onSubmit={handleSubmitQuestion}
        className="rounded-2xl border border-[#c4b5fd] bg-[#f5f3ff] p-4"
      >
        <label htmlFor="ask-event-input" className="text-sm font-semibold text-[#5b21b6]">
          {inDialogue ? "Ask a follow-up" : "Ask your question"}
        </label>
        <p className="mt-0.5 text-xs text-[#6f5c49]">
          Type and Ask, or use the mic — words appear as you speak, then tap Done.
        </p>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="ask-event-input"
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder={DEFAULT_QUESTION}
            className="min-w-0 flex-1 rounded-xl border border-[#ddd6fe] bg-white px-4 py-2.5 text-sm text-[#2b2118] placeholder:text-[#a8a29e] focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#c4b5fd]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[#7c3aed] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6d28d9]"
          >
            Ask
          </button>
        </div>

        <div className="mt-3 border-t border-[#ddd6fe] pt-3">
          <VoicePickButton
            embedded
            label={inDialogue ? "Speak follow-up" : "Speak question"}
            activeLabel="Listening…"
            transcriptHint="Tap Done when finished."
            onTranscriptChange={setQuestionInput}
            onTranscript={(text) => {
              applyAskResult(text);
            }}
            onError={(msg) => {
              setVoiceError(msg);
              showFallbackAnswer(msg);
            }}
          />
        </div>

        {voiceError && (
          <p
            className="mt-3 rounded-xl border border-[#fdba74] bg-[#fff7ed] px-3 py-2 text-sm font-medium text-[#b45309]"
            role="alert"
          >
            {voiceError}
          </p>
        )}
      </form>

      {!inDialogue && (
        <PromptChoicesPanel
          promptId="ask-event"
          onPick={handleChoice}
          compact
          hiddenGroupIds={["answer-depth"]}
          interactiveActions={["event-brief", "answer-depth", "ask-ai"]}
        />
      )}

      {voiceHealthHint && (
        <p className="rounded-xl border border-[#fdba74] bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]">
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

      {confirmedQuestion && (
        <div className="rounded-2xl border-2 border-[#86efac] bg-[#f0fdf4] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#15803d]">
            We heard you ask
          </p>
          <p className="mt-2 font-serif text-lg font-semibold text-[#14532d]">
            &ldquo;{confirmedQuestion}&rdquo;
          </p>
          {(autoSpeaking || speechState === "paused") && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm text-[#166534]">
                {speechState === "paused" ? "Paused" : "Reading aloud…"}
              </p>
              <button
                type="button"
                onClick={handlePauseResume}
                className="rounded-full bg-[#166534] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#14532d]"
              >
                {speechState === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={handleStopReading}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#166534] ring-1 ring-[#86efac] hover:bg-[#ecfdf5]"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      {voiceMessage && (
        <p className="text-sm font-medium text-[#5b21b6]" role="status">
          {voiceMessage}
        </p>
      )}

      {inDialogue && activeBrief && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#c4b5fd] bg-[#faf5ff] px-3 py-2">
          <span className="text-xs font-semibold text-[#5b21b6]">Follow-up:</span>
          <button
            type="button"
            onClick={() => advanceNarration("Tell me more")}
            className="rounded-full bg-[#ede9fe] px-3 py-1.5 text-xs font-semibold text-[#5b21b6] hover:bg-[#ddd6fe]"
          >
            Tell me more
          </button>
          <button
            type="button"
            onClick={() => handleDepth("brief", { label: "Shorter version" })}
            className="rounded-full bg-[#ede9fe] px-3 py-1.5 text-xs font-semibold text-[#5b21b6] hover:bg-[#ddd6fe]"
          >
            Shorter
          </button>
          <button
            type="button"
            onClick={handleAskAnother}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#6f5c49] ring-1 ring-[#e2d4bf] hover:bg-[#fffaf2]"
          >
            New question
          </button>
        </div>
      )}

      {activeBrief && (
        <div ref={answerRef} id="event-answer" className="scroll-mt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-xl font-semibold text-[#2b2118]">
              {responseKind === "chapter" ? "Continuing the story" : "Here's the answer"}
            </h3>
            {readAloudScript && (
              <ReadAloudButton text={readAloudScript} label="Hear again" />
            )}
          </div>

          {responseKind === "chapter" && chapterNarrationText ? (
            <aside className="rounded-2xl border-2 border-[#e2d4bf] bg-[#fffaf2] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
                From the family narrative · {section.yearStart}
                {section.yearEnd ? `–${section.yearEnd}` : ""}
              </p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#3f342c]">
                {chapterNarrationText.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </aside>
          ) : (
            <EventBriefCard
              brief={activeBrief}
              question={isAddendum ? undefined : prompt.question}
              depth={answerDepth}
              bodyOverride={isAddendum ? answerBody : undefined}
              bodyHeading={isAddendum ? "Additional detail" : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}