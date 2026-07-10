"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import TimelineBar from "@/components/TimelineBar";
import { getIndexMeta, getMapStoryTopics, getTimelineEvents, getYearBounds } from "@/lib/data";
import {
  buildTopicTimelineMarkers,
  getStoryTopic,
  getStoryTopicChapterHref,
  type StoryTopic,
} from "@/lib/story-topics";

const FamilyMap = dynamic(() => import("@/components/FamilyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-3xl border border-[#e2d4bf] bg-[#dce9f7] text-sm text-[#6f5c49]">
      Loading map…
    </div>
  ),
});

const events = getTimelineEvents();
const storyTopics = getMapStoryTopics();
const bounds = getYearBounds(events);
const meta = getIndexMeta();
const topicMarkers = buildTopicTimelineMarkers(storyTopics, bounds.min, bounds.max);

export default function MapTimelineView() {
  const searchParams = useSearchParams();
  const yearParam = searchParams.get("year");
  const eventParam = searchParams.get("event");
  const placeParam = searchParams.get("place");
  const topicParam = searchParams.get("topic");

  const [year, setYear] = useState(() => {
    const parsed = yearParam ? Number(yearParam) : bounds.min;
    return Number.isFinite(parsed) ? parsed : bounds.min;
  });
  const [scope, setScope] = useState<"us" | "world">("us");
  const [onlyHighlights, setOnlyHighlights] = useState(false);
  const [showTopics, setShowTopics] = useState(true);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(topicParam);

  useEffect(() => {
    if (yearParam) {
      const parsed = Number(yearParam);
      if (Number.isFinite(parsed)) {
        setYear(parsed);
      }
    }
  }, [yearParam]);

  useEffect(() => {
    if (topicParam && getStoryTopic(topicParam)) {
      setActiveTopicId(topicParam);
      setShowTopics(true);
      const topic = getStoryTopic(topicParam);
      if (topic && !yearParam) {
        setYear(topic.yearStart);
        if (topic.location.scope === "world") setScope("world");
      }
    }
  }, [topicParam, yearParam]);

  useEffect(() => {
    if (!placeParam) return;
    const match = events.find(
      (event) =>
        event.location.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ===
        placeParam,
    );
    if (match) {
      setYear(match.year);
      setScope(match.location.scope);
    }
  }, [placeParam]);

  const scopedEvents = useMemo(() => {
    return events.filter((event) => {
      if (onlyHighlights && !(event.famousPeople.length > 0 || event.mentionsFamily)) {
        return false;
      }
      return scope === "world" || event.location.scope === "us";
    });
  }, [scope, onlyHighlights]);

  const visible = useMemo(
    () => scopedEvents.filter((event) => event.year <= year),
    [scopedEvents, year],
  );

  const active = useMemo(() => {
    if (eventParam) {
      const match = events.find((event) => event.id === eventParam);
      if (match) return match;
    }
    return [...visible].reverse().find((e) => e.year <= year) ?? visible[0];
  }, [visible, year, eventParam]);

  const activeTopic = activeTopicId ? getStoryTopic(activeTopicId) : null;

  function handleTopicSelect(topicId: string, topicYear: number) {
    setActiveTopicId(topicId);
    setYear(topicYear);
    const topic = getStoryTopic(topicId);
    if (topic?.location.scope === "world") setScope("world");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Interactive map
          </p>
          <p className="text-sm text-[#6f5c49]">
            Slide the timeline — dots show events; green squares show the sixteen story topics.
          </p>
          <p className="mt-1 text-xs text-[#6f5c49]">
            {meta.storyTopicCount} story topics · {meta.timelineElementsMapped} timeline events ·{" "}
            {meta.indexedLocations} places · {visible.length} events visible at {year}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["us", "world"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setScope(mode)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                scope === mode ? "bg-[#8b5e34] text-white" : "bg-[#efe4d2] text-[#5c4a38]"
              }`}
            >
              {mode === "us" ? "United States" : "World"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowTopics((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              showTopics ? "bg-[#059669] text-white" : "bg-[#efe4d2] text-[#5c4a38]"
            }`}
          >
            Story topics
          </button>
          <button
            type="button"
            onClick={() => setOnlyHighlights((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              onlyHighlights ? "bg-[#7c3aed] text-white" : "bg-[#efe4d2] text-[#5c4a38]"
            }`}
          >
            Famous × Family
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#e2d4bf] shadow-sm">
        <FamilyMap
          events={scopedEvents}
          topics={storyTopics}
          showTopics={showTopics}
          activeTopicId={activeTopicId ?? undefined}
          year={year}
          scope={scope}
          activeId={active?.id}
        />
      </div>

      <TimelineBar
        events={scopedEvents}
        topicMarkers={topicMarkers}
        showTopics={showTopics}
        activeTopicId={activeTopicId ?? undefined}
        min={bounds.min}
        max={bounds.max}
        year={year}
        onYearChange={setYear}
        onTopicSelect={handleTopicSelect}
      />

      <div className="flex flex-wrap gap-3 text-[11px] text-[#6f5c49]">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8b5e34]" /> Map event
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7c3aed]" /> Famous or family
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#b45309]" /> Active on map
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#059669]" /> Story topic
        </span>
      </div>

      {activeTopic && (
        <TopicDetailCard topic={activeTopic} onDismiss={() => setActiveTopicId(null)} />
      )}

      {!activeTopic && active && (
        <div className="rounded-2xl border border-[#e2d4bf] bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            {active.year} · {active.location.name}
          </div>
          <h3 className="mt-1 font-serif text-2xl font-semibold">{active.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#5c4a38]">{active.summary}</p>
          {(active.famousPeople.length > 0 || active.familyNames.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {active.famousPeople.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-[#efe4d2] px-2.5 py-1 text-[11px] font-medium text-[#5c4a38]"
                >
                  {name}
                </span>
              ))}
              {active.familyNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[11px] font-medium text-[#5b3c88]"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopicDetailCard({
  topic,
  onDismiss,
}: {
  topic: StoryTopic;
  onDismiss: () => void;
}) {
  const nextTopic = topic.nextTopicId ? getStoryTopic(topic.nextTopicId) : null;

  return (
    <div className="rounded-2xl border border-[#86efac] bg-[#f0fdf4] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#059669]">
            Story topic · {topic.yearStart}
            {topic.yearEnd !== topic.yearStart ? `–${topic.yearEnd}` : ""} · {topic.location.name}
          </div>
          <h3 className="mt-1 font-serif text-2xl font-semibold text-[#14532d]">{topic.shortTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#166534]">{topic.teaser}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#166534] ring-1 ring-[#86efac] hover:bg-[#dcfce7]"
        >
          Show events
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/story?topic=${topic.id}#story-topics`}
          className="rounded-full bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857]"
        >
          Read topic →
        </Link>
        <Link
          href={getStoryTopicChapterHref(topic)}
          className="rounded-full bg-[#8b5e34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6f4a28]"
        >
          Open chapter →
        </Link>
        {nextTopic && (
          <Link
            href={`/map?topic=${nextTopic.id}&year=${nextTopic.yearStart}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#166534] ring-1 ring-[#86efac] hover:bg-[#dcfce7]"
          >
            Up next: {nextTopic.shortTitle} →
          </Link>
        )}
      </div>
    </div>
  );
}