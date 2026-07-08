"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ClickableStoryText from "@/components/ClickableStoryText";
import AskEventPanel from "@/components/AskEventPanel";
import EventBriefCard from "@/components/EventBriefCard";
import PersonSidePanel from "@/components/PersonSidePanel";
import ReadAloudButton from "@/components/ReadAloudButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import StoryPhotoGallery from "@/components/StoryPhotoGallery";
import StorySlideshowModal from "@/components/StorySlideshowModal";
import {
  getAskBriefsForChapter,
  getAutoShowBriefsForChapter,
} from "@/lib/event-briefs";
import { paginateChapterBlocks } from "@/lib/storybook-pages";
import type { StoryBlock, StoryImage, StorySection } from "@/lib/types";

type StoryChapterReaderProps = {
  section: StorySection;
  prev: StorySection | null;
  next: StorySection | null;
};

function renderBlock(block: StoryBlock, key: string) {
  if (block.type === "paragraph") {
    return (
      <ClickableStoryText
        key={key}
        text={block.text}
        className="text-[17px] leading-8 text-[#3f342c]"
      />
    );
  }

  if (block.type === "slideshow") {
    return (
      <StoryPhotoGallery
        key={key}
        images={block.images}
        label={`${block.images.length} photos from this section`}
      />
    );
  }

  return <StoryInlineImage key={key} image={block} />;
}

function StoryInlineImage({ image }: { image: StoryImage }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full overflow-hidden rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] text-left transition hover:border-[#c8b08d] hover:shadow-sm"
      >
        <div className="relative aspect-[16/9] max-h-48 bg-[#efe4d2] sm:max-h-56">
          <Image
            src={image.src}
            alt={image.caption}
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-contain"
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="line-clamp-2 text-sm leading-relaxed text-[#5c4a38]">{image.caption}</p>
          <span className="shrink-0 text-xs font-semibold text-[#8b5e34] group-hover:underline">
            Enlarge
          </span>
        </div>
      </button>

      <StorySlideshowModal
        images={[image]}
        title="Photo"
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default function StoryChapterReader({ section, prev, next }: StoryChapterReaderProps) {
  const reader = useOptionalReader();
  const pages = paginateChapterBlocks(section.blocks);
  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[pageIndex] ?? [];
  const autoBriefs = useMemo(() => getAutoShowBriefsForChapter(section.id), [section.id]);
  const askBriefs = useMemo(() => getAskBriefsForChapter(section.id), [section.id]);

  const pageText = useMemo(
    () =>
      currentPage
        .filter((b): b is Extract<StoryBlock, { type: "paragraph" }> => b.type === "paragraph")
        .map((b) => b.text)
        .join(" "),
    [currentPage],
  );

  useEffect(() => {
    reader?.saveProgress(section.id);
  }, [reader, section.id]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
    <article className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
        {section.yearStart}
        {section.yearEnd ? `–${section.yearEnd}` : ""} · {section.branch}
        {section.imageCount > 0 ? ` · ${section.imageCount} photos` : ""}
        {pages.length > 1 ? ` · page ${pageIndex + 1} of ${pages.length}` : ""}
      </div>
      <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{section.title}</h2>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {reader?.readerName && (
          <span className="text-sm text-[#6f5c49]">
            Reading as <strong>{reader.readerName}</strong>
          </span>
        )}
        {pageText && <ReadAloudButton text={pageText} />}
        <Link
          href="/read"
          className="text-sm font-semibold text-[#8b5e34] hover:underline"
        >
          Guided TOC
        </Link>
      </div>

      {autoBriefs.length > 0 && (
        <div className="mt-4 space-y-3">
          {autoBriefs.map((brief) => (
            <EventBriefCard key={brief.id} brief={brief} />
          ))}
        </div>
      )}

      {askBriefs.length > 0 && (
        <div className="mt-4">
          <AskEventPanel
            chapterBriefs={askBriefs}
            section={section}
            nextSection={next}
          />
        </div>
      )}

      {(section.famousPeople.length > 0 || section.familyNames.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {section.famousPeople.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#efe4d2] px-3 py-1 text-xs font-medium text-[#5c4a38]"
            >
              Famous: {name}
            </span>
          ))}
          {section.familyNames.map((name) => (
            <span
              key={name}
              className="rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-medium text-[#5b3c88]"
            >
              Family: {name}
            </span>
          ))}
        </div>
      )}

      <div className="prose-story mt-6 space-y-5">
        {currentPage.map((block, i) => renderBlock(block, `${section.id}-p${pageIndex}-${i}`))}
      </div>

      {pages.length > 1 && (
        <div className="mt-8 rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-4">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#8b5e34]">
            <span>Chapter pages</span>
            <span>
              {pageIndex + 1} / {pages.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPageIndex(i)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  i === pageIndex
                    ? "bg-[#8b5e34] text-white"
                    : "bg-[#efe4d2] text-[#5c4a38] hover:bg-[#e4d4bc]"
                }`}
              >
                Page {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-between gap-3">
            <button
              type="button"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((p) => p - 1)}
              className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] disabled:opacity-40"
            >
              ← Previous page
            </button>
            <button
              type="button"
              disabled={pageIndex >= pages.length - 1}
              onClick={() => setPageIndex((p) => p + 1)}
              className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] disabled:opacity-40"
            >
              Next page →
            </button>
          </div>
        </div>
      )}

      <nav className="mt-10 flex flex-col gap-3 border-t border-[#e2d4bf] pt-6 sm:flex-row sm:justify-between">
        {prev ? (
          <Link
            href={`/story/${prev.id}`}
            className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-sm hover:border-[#c8b08d]"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              Previous section
            </span>
            <div className="mt-1 font-serif font-semibold">{prev.title}</div>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/story/${next.id}`}
            className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-right text-sm hover:border-[#c8b08d] sm:ml-auto"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              Next section
            </span>
            <div className="mt-1 font-serif font-semibold">{next.title}</div>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>

    {reader?.pinnedPerson && (
      <PersonSidePanel
        person={reader.pinnedPerson}
        onClose={() => reader.setPinnedPerson(null)}
      />
    )}
    </div>
  );
}