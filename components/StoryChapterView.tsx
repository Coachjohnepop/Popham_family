import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorySidebar from "@/components/StorySidebar";
import StorySlideshow from "@/components/StorySlideshow";
import { getStorySection, getStorySections } from "@/lib/storybook";
import type { StoryBlock } from "@/lib/types";

type StoryChapterViewProps = {
  sectionId: string;
};

function renderBlock(block: StoryBlock, key: string) {
  if (block.type === "paragraph") {
    return (
      <p key={key} className="text-[17px] leading-8 text-[#3f342c]">
        {block.text}
      </p>
    );
  }

  if (block.type === "slideshow") {
    return (
      <StorySlideshow
        key={key}
        images={block.images}
        title={`${block.images.length} photos from this section`}
      />
    );
  }

  return (
    <figure key={key} className="overflow-hidden rounded-2xl border border-[#e2d4bf] bg-[#fffaf2]">
      <div className="relative aspect-[4/3] bg-[#efe4d2] sm:aspect-[16/10]">
        <Image
          src={block.src}
          alt={block.caption}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-contain"
        />
      </div>
      <figcaption className="px-4 py-3 text-sm leading-relaxed text-[#5c4a38]">
        {block.caption}
      </figcaption>
    </figure>
  );
}

export default function StoryChapterView({ sectionId }: StoryChapterViewProps) {
  const section = getStorySection(sectionId);
  if (!section) notFound();

  const sections = getStorySections();
  const index = sections.findIndex((s) => s.id === sectionId);
  const prev = index > 0 ? sections[index - 1] : null;
  const next = index < sections.length - 1 ? sections[index + 1] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <StorySidebar activeId={sectionId} />

      <article className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          {section.yearStart}
          {section.yearEnd ? `–${section.yearEnd}` : ""} · {section.branch}
          {section.imageCount > 0 ? ` · ${section.imageCount} photos` : ""}
        </div>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{section.title}</h2>

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
          {section.blocks.map((block, i) => renderBlock(block, `${section.id}-${i}`))}
        </div>

        <nav className="mt-10 flex flex-col gap-3 border-t border-[#e2d4bf] pt-6 sm:flex-row sm:justify-between">
          {prev ? (
            <Link
              href={`/story/${prev.id}`}
              className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3 text-sm hover:border-[#c8b08d]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                Previous
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
                Next
              </span>
              <div className="mt-1 font-serif font-semibold">{next.title}</div>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  );
}