"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PromptChoicesPanel from "@/components/PromptChoicesPanel";
import ReadAloudButton from "@/components/ReadAloudButton";
import VoicePickButton from "@/components/VoicePickButton";
import { useReader } from "@/components/ReaderProvider";
import { executePromptChoice, type PromptChoice } from "@/lib/prompt-index";
import { getStorySections } from "@/lib/storybook";
import { describeVoiceHints, matchVoiceNavigation } from "@/lib/voice-navigation";

type Step = "name" | "returning" | "intro" | "toc";

const INTRO_SCRIPT = `Welcome to the Winifred Coss Family Tree.

This story is organized into two large branches. The Edith Powers branch begins in England. The Mary Ann Goodwater branch begins in Québec and France.

In 1853, Joseph Warren Coss marries Mary Ann Goodwater — and the two branches join.

Throughout the story, direct family names appear in bold — purple names can be clicked for more detail. Maiden names appear in parentheses after marriage. Famous historical figures are highlighted where world history touches the family. Estimated dates are marked as about, before, after, or late when records are incomplete.

Where would you like to begin?`;

export default function GuidedWelcome() {
  const router = useRouter();
  const { session, readerName, setReaderName, completeOnboarding } = useReader();
  const sections = useMemo(() => getStorySections(), []);

  const [step, setStep] = useState<Step>("name");
  const [nameInput, setNameInput] = useState(readerName);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (!session.readerName) {
      setStep("name");
      return;
    }
    if (!session.onboardingComplete) {
      setStep(session.lastChapterId ? "returning" : "intro");
      return;
    }
    setStep("toc");
  }, [session]);

  function finishName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setReaderName(trimmed);
    setStep(session?.lastChapterId ? "returning" : "intro");
  }

  function startChapter(id: string) {
    completeOnboarding();
    router.push(`/story/${id}`);
  }

  function applyNavResult(
    result: ReturnType<typeof matchVoiceNavigation> | null,
    fallbackHeard?: string,
  ) {
    if (!result) {
      if (fallbackHeard) {
        setVoiceMessage(`Heard “${fallbackHeard}” — ${describeVoiceHints(voiceContext)}`);
      }
      return;
    }

    if (result.action === "resume") {
      if (session?.lastChapterId) {
        setVoiceMessage(`Continuing where you left off…`);
        startChapter(session.lastChapterId);
      } else {
        setVoiceMessage("No previous chapter yet — pick one from the list below.");
        setStep("toc");
      }
      return;
    }

    if (result.action === "open-toc") {
      setVoiceMessage("Opening the table of contents.");
      setStep("toc");
      return;
    }

    if (result.action === "chapter") {
      setVoiceMessage(`Starting: ${result.label}`);
      startChapter(result.sectionId);
      return;
    }

    if (result.action === "event-brief") {
      setVoiceMessage(`Open a story chapter to explore: ${result.label}`);
      return;
    }

    if (result.action === "answer-depth") {
      setVoiceMessage(`Detail preference set to ${result.label}. Open a chapter to use it.`);
      return;
    }

    if (result.action === "unknown") {
      setVoiceMessage(`Heard “${result.heard}” — ${describeVoiceHints(voiceContext)}`);
    }
  }

  const voiceContext =
    step === "returning" ? "returning" : step === "toc" ? "toc" : "intro";

  function handleVoiceTranscript(transcript: string) {
    setVoiceError(null);
    applyNavResult(matchVoiceNavigation(transcript, sections, voiceContext), transcript);
  }

  function handleChoicePick(choice: PromptChoice) {
    setVoiceError(null);
    applyNavResult(executePromptChoice(choice, sections));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {step === "name" && (
        <section className="rounded-3xl border border-[#e2d4bf] bg-white p-8 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#8b5e34]">
            WCFT Reader
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">Welcome</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6f5c49]">
            Enter your first name so the reader can greet you and remember where you left off.
          </p>
          <label className="mt-6 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
              Your name
            </span>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && finishName()}
              placeholder="e.g. John"
              className="mt-2 w-full rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-lg outline-none focus:border-[#8b5e34]"
              autoFocus
            />
          </label>
          <button
            type="button"
            onClick={finishName}
            disabled={!nameInput.trim()}
            className="mt-6 rounded-full bg-[#8b5e34] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Continue
          </button>
        </section>
      )}

      {step === "returning" && session?.lastChapterId && (
        <section className="rounded-3xl border border-[#e2d4bf] bg-white p-8 shadow-sm">
          <h2 className="font-serif text-3xl font-semibold">Welcome back, {readerName}</h2>
          <p className="mt-3 text-sm text-[#6f5c49]">
            Would you like to continue where you left off, or choose a new chapter?
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => startChapter(session.lastChapterId!)}
              className="rounded-full bg-[#8b5e34] px-6 py-3 text-sm font-semibold text-white"
            >
              Continue last chapter
            </button>
            <button
              type="button"
              onClick={() => setStep("intro")}
              className="rounded-full bg-[#efe4d2] px-6 py-3 text-sm font-semibold text-[#5c4a38]"
            >
              Choose a different section
            </button>
            <VoicePickButton
              label='Say "continue" or a chapter'
              onTranscript={handleVoiceTranscript}
              onError={setVoiceError}
            />
          </div>
          <div className="mt-6">
            <PromptChoicesPanel promptId="welcome-back" onPick={handleChoicePick} compact />
          </div>
          {voiceMessage && <p className="mt-4 text-sm text-[#5b21b6]">{voiceMessage}</p>}
          {voiceError && <p className="mt-4 text-sm text-[#b45309]">{voiceError}</p>}
        </section>
      )}

      {step === "intro" && (
        <section className="rounded-3xl border border-[#e2d4bf] bg-white p-8 shadow-sm">
          <h2 className="font-serif text-3xl font-semibold">Hello, {readerName}</h2>
          <p className="mt-2 text-sm text-[#6f5c49]">
            Here is how the Winifred Coss Family Tree is organized.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#eff6ff] p-4 ring-1 ring-[#93c5fd]">
              <h3 className="font-serif font-semibold text-[#1e3a8a]">Edith Powers branch</h3>
              <p className="mt-2 text-sm text-[#1e40af]">
                From England — George Alcock (1581) through the Powers line to Iowa.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f5f3ff] p-4 ring-1 ring-[#c4b5fd]">
              <h3 className="font-serif font-semibold text-[#4c1d95]">Mary Ann Goodwater branch</h3>
              <p className="mt-2 text-sm text-[#5b21b6]">
                From Québec and France — Louis Hébert (1575) and the Goodwater line.
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-[#fffaf2] p-4 text-sm leading-relaxed text-[#3f342c]">
            <strong>1853:</strong> Joseph Warren Coss marries Mary Ann Goodwater — the two branches
            merge.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ReadAloudButton text={INTRO_SCRIPT} />
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#6f5c49]">
            {INTRO_SCRIPT}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => setStep("toc")}
              className="rounded-full bg-[#8b5e34] px-6 py-3 text-sm font-semibold text-white"
            >
              Open table of contents
            </button>
            <VoicePickButton
              label="Say where to begin"
              onTranscript={handleVoiceTranscript}
              onError={setVoiceError}
            />
          </div>
          <p className="mt-3 text-xs text-[#6f5c49]">{describeVoiceHints("intro")}</p>
          <div className="mt-6">
            <PromptChoicesPanel promptId="where-to-begin" onPick={handleChoicePick} compact />
          </div>
          {voiceMessage && <p className="mt-2 text-sm text-[#5b21b6]">{voiceMessage}</p>}
          {voiceError && <p className="mt-2 text-sm text-[#b45309]">{voiceError}</p>}
        </section>
      )}

      {step === "toc" && (
        <section className="space-y-4">
          <div className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-serif text-3xl font-semibold">
              {readerName ? `${readerName}, pick a chapter` : "Table of contents"}
            </h2>
            <p className="mt-2 text-sm text-[#6f5c49]">
              Click a chapter or say one out loud. Family names in the text can be clicked for
              details.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <VoicePickButton
                label="Say a chapter name"
                onTranscript={handleVoiceTranscript}
                onError={setVoiceError}
              />
              <ReadAloudButton
                text={`${readerName}, where would you like to begin? ${describeVoiceHints()}`}
                label="Hear the question"
              />
            </div>
            <p className="mt-2 text-xs text-[#6f5c49]">{describeVoiceHints("toc")}</p>
            {voiceMessage && <p className="mt-2 text-sm font-medium text-[#5b21b6]">{voiceMessage}</p>}
            {voiceError && <p className="mt-2 text-sm text-[#b45309]">{voiceError}</p>}
          </div>
          <PromptChoicesPanel promptId="where-to-begin" onPick={handleChoicePick} />
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => startChapter(section.id)}
                className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-4 text-left transition hover:border-[#c8b08d] hover:shadow-sm"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                  {section.yearStart}
                  {section.yearEnd ? `–${section.yearEnd}` : ""} · {section.branch}
                </div>
                <h3 className="mt-1 font-serif text-lg font-semibold leading-snug">
                  {section.title}
                </h3>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-[#6f5c49]">
            Or browse{" "}
            <Link href="/story" className="font-semibold text-[#8b5e34] hover:underline">
              all tabs
            </Link>{" "}
            — interactive storybook, tree, and map.
          </p>
        </section>
      )}
    </div>
  );
}