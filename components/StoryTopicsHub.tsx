"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReadAloudButton from "@/components/ReadAloudButton";
import {
  getStoryTopic,
  getStoryTopicChapterHref,
  getStoryTopicMapHref,
  getStoryTopics,
  getTopicButtonStyles,
  type StoryTopic,
} from "@/lib/story-topics";

type StoryTopicsHubProps = {
  variant?: "story-index" | "landing-compact";
  initialTopicId?: string | null;
};

export default function StoryTopicsHub({
  variant = "story-index",
  initialTopicId = null,
}: StoryTopicsHubProps) {
  const topics = getStoryTopics();
  const [activeId, setActiveId] = useState<string | null>(initialTopicId);
  const [speakGeneration, setSpeakGeneration] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const requestNarration = useCallback(() => {
    setSpeakGeneration((n) => n + 1);
  }, []);

  const scrollToHub = useCallback(() => {
    const el = document.getElementById("story-topics");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToPanel = useCallback(() => {
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const activateTopic = useCallback(
    (id: string | null, options?: { narrate?: boolean }) => {
      const shouldNarrate = options?.narrate ?? false;
      setActiveId((current) => {
        const next = current === id ? null : id;
        if (next && variant === "story-index") {
          window.history.replaceState(null, "", `/story?topic=${next}#story-topics`);
          scrollToPanel();
        } else if (!next && variant === "story-index") {
          window.history.replaceState(null, "", "/story#story-topics");
        }
        if (shouldNarrate && next) {
          requestAnimationFrame(() => requestNarration());
        }
        return next;
      });
    },
    [variant, scrollToPanel, requestNarration],
  );

  useEffect(() => {
    if (initialTopicId) {
      setActiveId(initialTopicId);
    }
  }, [initialTopicId]);

  useEffect(() => {
    if (variant !== "story-index") return;

    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    if (topic && getStoryTopic(topic)) {
      setActiveId(topic);
      if (window.location.hash === "#story-topics") {
        scrollToHub();
        scrollToPanel();
      }
    } else if (window.location.hash === "#story-topics") {
      scrollToHub();
    }
  }, [variant, scrollToHub, scrollToPanel]);

  const activeTopic = activeId ? getStoryTopic(activeId) : null;
  const activeIndex = activeTopic ? topics.findIndex((t) => t.id === activeTopic.id) : -1;
  const isCompact = variant === "landing-compact";

  if (isCompact) {
    return (
      <div className="w-full text-center">
        <Link
          href="/story#story-topics"
          className="inline-flex rounded-full bg-[#8b5e34] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f4a28]"
        >
          Explore all {topics.length} story topics →
        </Link>
      </div>
    );
  }

  return (
    <section
      id="story-topics"
      className="scroll-mt-6 rounded-3xl border-2 border-[#c8b08d] bg-gradient-to-b from-white to-[#fffaf2] p-5 shadow-md sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Start here
          </p>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-[#2b2118] sm:text-3xl">
            Sixteen angles into the paper
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6f5c49]">
            Pick a jelly bean — each opens a short narrative and reads it aloud, then points you to
            the chapter and the map. Follow <strong className="font-semibold text-[#5c4a38]">Up next</strong>{" "}
            for a guided path through Dad&apos;s story.
          </p>
        </div>
        {!activeTopic && (
          <button
            type="button"
            onClick={() => activateTopic(topics[0]?.id ?? null, { narrate: true })}
            className="shrink-0 rounded-full bg-[#8b5e34] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f4a28]"
          >
            Start with topic 1 →
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 overflow-visible">
        {topics.map((topic) => (
          <TopicBean
            key={topic.id}
            topic={topic}
            isActive={activeId === topic.id}
            onActivate={() => activateTopic(topic.id, { narrate: true })}
          />
        ))}
      </div>

      {activeTopic && (
        <div ref={panelRef}>
          <TopicPanel
            topic={activeTopic}
            index={activeIndex}
            total={topics.length}
            topics={topics}
            onSelect={(id) => activateTopic(id, { narrate: true })}
            speakGeneration={speakGeneration}
            onNext={() => {
              if (activeTopic.nextTopicId) activateTopic(activeTopic.nextTopicId, { narrate: true });
            }}
            onPrev={() => {
              if (activeIndex > 0) activateTopic(topics[activeIndex - 1].id, { narrate: true });
            }}
            onClose={() => activateTopic(null)}
          />
        </div>
      )}

      {!activeTopic && (
        <p className="mt-4 text-center text-xs text-[#8b5e34]">
          Or scroll down for all {topics.length} chronological chapters
        </p>
      )}
    </section>
  );
}

type TopicBeanProps = {
  topic: StoryTopic;
  isActive: boolean;
  onActivate: () => void;
};

function TopicBean({ topic, isActive, onActivate }: TopicBeanProps) {
  const styles = getTopicButtonStyles(topic.style);

  return (
    <div className="group relative z-0 hover:z-20 focus-within:z-20">
      <button
        type="button"
        onClick={onActivate}
        className={`inline-flex origin-center items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition duration-200 ease-out hover:scale-[1.2] focus-visible:scale-[1.2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5e34] focus-visible:ring-offset-2 ${
          isActive ? styles.active : styles.idle
        }`}
        aria-expanded={isActive}
        aria-controls={`story-topic-panel-${topic.id}`}
        aria-label={`${topic.order}. ${topic.buttonLabel}. ${topic.teaser}`}
      >
        <span
          className={`shrink-0 text-[10px] font-bold tabular-nums ${
            isActive ? "opacity-90" : "opacity-70"
          }`}
        >
          {topic.order}
        </span>
        <span className="max-w-[9rem] truncate group-hover:max-w-none group-hover:whitespace-normal sm:max-w-[11rem]">
          {isActive ? (
            <>
              <span className="group-hover:hidden">{topic.shortTitle}</span>
              <span className="hidden group-hover:inline">{topic.buttonLabel}</span>
            </>
          ) : (
            topic.buttonLabel
          )}
        </span>
      </button>

      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-[#e8dcc8] bg-white px-3 py-2 text-left text-xs leading-relaxed text-[#3f342c] opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <p className="font-semibold text-[#2b2118]">{topic.buttonLabel}</p>
        <p className="mt-1 text-[#6f5c49]">{topic.teaser}</p>
      </div>
    </div>
  );
}

type TopicPanelProps = {
  topic: StoryTopic;
  index: number;
  total: number;
  topics: StoryTopic[];
  speakGeneration: number;
  onSelect: (id: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

function TopicPanel({
  topic,
  index,
  total,
  topics,
  speakGeneration,
  onSelect,
  onNext,
  onPrev,
  onClose,
}: TopicPanelProps) {
  const nextTopic = topic.nextTopicId ? getStoryTopic(topic.nextTopicId) : null;
  const prevTopic = index > 0 ? topics[index - 1] : null;

  return (
    <div
      id={`story-topic-panel-${topic.id}`}
      className="mt-5 space-y-4 rounded-2xl border border-[#e8dcc8] bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efe4d2] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!prevTopic}
            onClick={onPrev}
            className="rounded-full bg-[#efe4d2] px-3 py-1.5 text-xs font-semibold text-[#5c4a38] transition hover:bg-[#e4d4bc] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-xs font-semibold tabular-nums text-[#8b5e34]">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            disabled={!nextTopic}
            onClick={onNext}
            className="rounded-full bg-[#efe4d2] px-3 py-1.5 text-xs font-semibold text-[#5c4a38] transition hover:bg-[#e4d4bc] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReadAloudButton
            text={topic.narrative.spoken}
            autoPlayKey={
              speakGeneration > 0 ? `${topic.id}:${speakGeneration}` : undefined
            }
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#efe4d2] px-3 py-1.5 text-xs font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
          >
            Close
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
          {topic.yearStart}
          {topic.yearEnd !== topic.yearStart ? `–${topic.yearEnd}` : ""} · {topic.branch} ·{" "}
          {topic.location.name}
        </p>
        <h3 className="mt-1 font-serif text-xl font-semibold text-[#2b2118] sm:text-2xl">
          {topic.narrative.label}
        </h3>
        <p className="mt-1 text-sm text-[#6f5c49]">{topic.teaser}</p>
      </div>

      <div className="space-y-3">
        {topic.narrative.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="text-sm leading-relaxed text-[#3f342c]">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="space-y-3 border-t border-[#e8dcc8] pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
          Where to go from here
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={getStoryTopicChapterHref(topic)}
            className="rounded-full bg-[#8b5e34] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f4a28]"
          >
            Read chapter →
          </Link>
          <Link
            href={getStoryTopicMapHref(topic)}
            className="rounded-full bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#047857]"
          >
            See on map →
          </Link>
        </div>

        {nextTopic ? (
          <button
            type="button"
            onClick={() => onSelect(nextTopic.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-[#ddd6fe] bg-[#f5f3ff] px-4 py-3 text-left transition hover:border-[#c4b5fd] hover:shadow-sm"
          >
            <span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7c3aed]">
                Up next
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-[#4c1d95]">
                {nextTopic.buttonLabel}
              </span>
            </span>
            <span className="text-lg text-[#7c3aed]" aria-hidden>
              →
            </span>
          </button>
        ) : (
          <div className="rounded-2xl border border-[#e8dcc8] bg-[#fffaf2] px-4 py-3 text-sm text-[#6f5c49]">
            You&apos;ve finished all sixteen topics.{" "}
            <button
              type="button"
              onClick={() => onSelect(topics[0].id)}
              className="font-semibold text-[#8b5e34] hover:underline"
            >
              Start again
            </button>{" "}
            or pick any chapter below.
          </div>
        )}
      </div>
    </div>
  );
}