import Link from "next/link";
import { getStorybook } from "@/lib/storybook";
import StorySidebar from "@/components/StorySidebar";

export default function StoryIndexView() {
  const book = getStorybook();

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <StorySidebar />

      <div className="space-y-6">
        <div className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Storybook
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            The full family story
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6f5c49]">
            {book.sectionCount} tightened chapters drawn from the original document, with{" "}
            {book.imageCountInDocument} photographs and illustrations — open slideshows when you
            want them.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {book.sections.map((section) => (
            <Link
              key={section.id}
              href={`/story/${section.id}`}
              className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-5 transition hover:border-[#c8b08d] hover:shadow-sm"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                {section.yearStart}
                {section.yearEnd ? `–${section.yearEnd}` : ""} · {section.branch}
                {section.imageCount > 0 ? ` · ${section.imageCount} photos` : ""}
              </div>
              <h3 className="mt-2 font-serif text-xl font-semibold leading-snug">
                {section.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm text-[#6f5c49]">{section.teaser}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-[#8b5e34]">
                Read section →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}