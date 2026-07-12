"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Document utilities — real sub-pages under /story/* */
export const STORY_DOC_LINKS = [
  {
    id: "topics",
    href: "/story/topics",
    label: "16 story topics",
    blurb: "Jelly-bean entry points — short narratives that open a chapter and the map.",
    accent: "text-[#8b5e34] font-semibold",
  },
  {
    id: "favorites",
    href: "/favorites",
    label: "My Path & progress",
    blurb: "Pins, custom reading order, and how many chapters you have opened.",
    accent: "text-[#db2777] font-semibold",
  },
  {
    id: "format",
    href: "/story/format",
    label: "Format of the Story",
    blurb: "Bold names, maiden names, estimated dates, and other writing conventions.",
    accent: "text-[#5c4a38] font-medium",
  },
  {
    id: "family-index",
    href: "/story/family-index",
    label: "Family index",
    blurb: "Searchable list of people — births, marriages, and life notes from the paper.",
    accent: "text-[#5c4a38] font-medium",
  },
  {
    id: "references",
    href: "/story/references",
    label: "References",
    blurb: "Sources, archives, and related family documents (not in the narrative).",
    accent: "text-[#5c4a38] font-medium",
  },
] as const;

export function isStoryDocPath(pathname: string): boolean {
  return (
    pathname === "/story/topics" ||
    pathname === "/story/format" ||
    pathname === "/story/family-index" ||
    pathname === "/story/references"
  );
}

type StoryDocPanelProps = {
  /** denser list for the left sidebar */
  compact?: boolean;
};

export default function StoryDocPanel({ compact = true }: StoryDocPanelProps) {
  const pathname = usePathname();

  return (
    <div
      className={
        compact
          ? "space-y-1 rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-3"
          : "space-y-2 rounded-3xl border border-[#e2d4bf] bg-white p-5 shadow-sm"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
        Document tools
      </p>
      {!compact && (
        <p className="text-sm text-[#6f5c49]">
          Jump to topics, format rules, the name index, or sources — each opens its own page.
        </p>
      )}
      <nav className="space-y-1" aria-label="Document tools">
        {STORY_DOC_LINKS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`block rounded-xl px-3 py-2 transition ${
                active
                  ? "bg-white shadow-sm ring-1 ring-[#c8b08d]"
                  : "hover:bg-white"
              }`}
            >
              <span className={`block text-sm ${item.accent}`}>{item.label}</span>
              <span
                className={`mt-0.5 block leading-snug text-[#6f5c49] ${
                  compact ? "text-[11px] line-clamp-2" : "text-xs"
                }`}
              >
                {item.blurb}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
