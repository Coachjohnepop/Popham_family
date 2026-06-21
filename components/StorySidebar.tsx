import Link from "next/link";
import { getStorySections } from "@/lib/storybook";

type StorySidebarProps = {
  activeId?: string;
};

export default function StorySidebar({ activeId }: StorySidebarProps) {
  const sections = getStorySections();

  return (
    <aside className="space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          Sections
        </p>
        <Link href="/story" className="text-xs font-medium text-[#8b5e34] hover:underline">
          All
        </Link>
      </div>
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <Link
            key={section.id}
            href={`/story/${section.id}`}
            className={`block w-full rounded-2xl border px-4 py-3 transition ${
              active
                ? "border-[#8b5e34] bg-white shadow-sm"
                : "border-[#e2d4bf] bg-[#fffaf2] hover:border-[#c8b08d]"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              {section.yearStart}
              {section.yearEnd ? `–${section.yearEnd}` : ""} · {section.branch}
              {section.imageCount > 0 ? ` · ${section.imageCount} photos` : ""}
            </div>
            <div className="mt-1 font-serif text-base font-semibold leading-snug">
              {section.title}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-[#6f5c49]">{section.teaser}</p>
          </Link>
        );
      })}
    </aside>
  );
}