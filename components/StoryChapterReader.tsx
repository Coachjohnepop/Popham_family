"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClickableStoryText from "@/components/ClickableStoryText";
import PersonSidePanel from "@/components/PersonSidePanel";
import PinSectionButton from "@/components/PinSectionButton";
import ReadAloudButton from "@/components/ReadAloudButton";
import { useOptionalReader } from "@/components/ReaderProvider";
import StoryPhotoGallery from "@/components/StoryPhotoGallery";
import StorySlideshowModal from "@/components/StorySlideshowModal";
import {
  CHAPTER_FADE_MS,
  consumeAutoNarrate,
  setAutoNarrate,
} from "@/lib/chapter-transition";
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
  const router = useRouter();
  const reader = useOptionalReader();
  const pages = paginateChapterBlocks(section.blocks);
  const [pageIndex, setPageIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [autoPlayKey, setAutoPlayKey] = useState<string | undefined>(undefined);
  const [isNarrating, setIsNarrating] = useState(false);

  const currentPage = pages[pageIndex] ?? [];
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

  useEffect(() => {
    reader?.setStoryChapterContext(section, next);
    return () => reader?.setStoryChapterContext(null, null);
  }, [reader, section, next]);

  // Fade in on mount; resume narrator if we arrived via Next/Prev section
  useEffect(() => {
    setVisible(false);
    setPageIndex(0);
    setPageVisible(true);
    const shouldAuto = consumeAutoNarrate();
    const fadeIn = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    if (shouldAuto) {
      // After fade-in, kick off narration for page 0
      setAutoPlayKey(`${section.id}:0:${Date.now()}`);
    } else {
      setAutoPlayKey(undefined);
    }
    return () => window.cancelAnimationFrame(fadeIn);
  }, [section.id]);

  const goToChapter = useCallback(
    (chapterId: string, continueNarration: boolean) => {
      setVisible(false);
      // Always continue narrator when using section prev/next (storytelling flow)
      setAutoNarrate(continueNarration || isNarrating);
      window.setTimeout(() => {
        router.push(`/story/${chapterId}`);
      }, CHAPTER_FADE_MS);
    },
    [router, isNarrating],
  );

  const goToPage = useCallback(
    (nextIndex: number, continueNarration: boolean) => {
      if (nextIndex < 0 || nextIndex >= pages.length) return;
      setPageVisible(false);
      window.setTimeout(() => {
        setPageIndex(nextIndex);
        setPageVisible(true);
        if (continueNarration || isNarrating) {
          setAutoPlayKey(`${section.id}:${nextIndex}:${Date.now()}`);
        }
      }, CHAPTER_FADE_MS / 2);
    },
    [pages.length, section.id, isNarrating],
  );

  const handleNextSection = useCallback(() => {
    if (!next) return;
    goToChapter(next.id, true);
  }, [next, goToChapter]);

  const handlePrevSection = useCallback(() => {
    if (!prev) return;
    goToChapter(prev.id, true);
  }, [prev, goToChapter]);

  const handleNextPage = useCallback(() => {
    if (pageIndex < pages.length - 1) {
      goToPage(pageIndex + 1, true);
    } else if (next) {
      goToChapter(next.id, true);
    }
  }, [pageIndex, pages.length, next, goToPage, goToChapter]);

  const handlePrevPage = useCallback(() => {
    if (pageIndex > 0) {
      goToPage(pageIndex - 1, true);
    } else if (prev) {
      goToChapter(prev.id, true);
    }
  }, [pageIndex, prev, goToPage, goToChapter]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <article
        className={`rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm transition-opacity ease-in-out sm:p-8 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${CHAPTER_FADE_MS}ms` }}
      >
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
          {pageText && (
            <ReadAloudButton
              text={pageText}
              autoPlayKey={autoPlayKey}
              autoPlayDelayMs={CHAPTER_FADE_MS + 80}
              onSpeakingChange={setIsNarrating}
            />
          )}
          <PinSectionButton sectionId={section.id} />
          <Link
            href="/favorites"
            className="text-sm font-semibold text-[#db2777] hover:underline"
          >
            My Path
          </Link>
          <Link href="/read" className="text-sm font-semibold text-[#8b5e34] hover:underline">
            Guided TOC
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#6f5c49]">
          <span>
            <strong className="text-[#2b2118]">Bold</strong> = direct family
          </span>
          <span>
            <strong className="text-[#7c3aed]">Purple</strong> = clickable
          </span>
          <span>
            <em>(Parentheses)</em> = maiden name
          </span>
          {section.famousPeople.length > 0 && (
            <span className="rounded-full bg-[#efe4d2] px-3 py-1 font-medium text-[#5c4a38]">
              Famous in chapter: {section.famousPeople.join(", ")}
            </span>
          )}
        </div>

        <div
          className={`prose-story mt-6 space-y-5 transition-opacity ease-in-out ${
            pageVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDuration: `${CHAPTER_FADE_MS / 2}ms` }}
        >
          {currentPage.map((block, i) =>
            renderBlock(block, `${section.id}-p${pageIndex}-${i}`),
          )}
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
                  onClick={() => goToPage(i, isNarrating)}
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
                disabled={pageIndex === 0 && !prev}
                onClick={handlePrevPage}
                className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] disabled:opacity-40"
              >
                ← Previous page
              </button>
              <button
                type="button"
                disabled={pageIndex >= pages.length - 1 && !next}
                onClick={handleNextPage}
                className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] disabled:opacity-40"
              >
                Next page →
              </button>
            </div>
          </div>
        )}

        {reader?.isFavorite(section.id) && (
          <div className="mt-8 rounded-2xl border border-[#f9a8d4] bg-[#fdf2f8] p-4 text-sm">
            <p className="font-semibold text-[#9d174d]">On your path</p>
            <p className="mt-1 text-[#6f5c49]">
              This chapter is pinned.{" "}
              <Link href="/favorites" className="font-semibold text-[#db2777] hover:underline">
                Rearrange My Path
              </Link>
              {(() => {
                const favs = reader.favoriteChapterIds;
                const idx = favs.indexOf(section.id);
                const pathNext = idx >= 0 && idx < favs.length - 1 ? favs[idx + 1] : null;
                if (!pathNext) return null;
                return (
                  <>
                    {" "}
                    or{" "}
                    <button
                      type="button"
                      onClick={() => goToChapter(pathNext, true)}
                      className="font-semibold text-[#db2777] hover:underline"
                    >
                      next on your path →
                    </button>
                  </>
                );
              })()}
            </p>
          </div>
        )}

        <nav className="mt-10 flex flex-col gap-3 border-t border-[#e2d4bf] pt-6 sm:flex-row sm:justify-between">
          {prev ? (
            <button
              type="button"
              onClick={handlePrevSection}
              className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-left text-sm transition hover:border-[#c8b08d]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                Previous section
              </span>
              <div className="mt-1 font-serif font-semibold">{prev.title}</div>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button
              type="button"
              onClick={handleNextSection}
              className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-right text-sm transition hover:border-[#c8b08d] sm:ml-auto"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                Next section
              </span>
              <div className="mt-1 font-serif font-semibold">{next.title}</div>
            </button>
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
