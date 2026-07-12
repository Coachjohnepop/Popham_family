"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_TABS, type TabId } from "@/lib/tabs";

type SiteNavBoxesProps = {
  /** Highlight this tab when path alone is ambiguous */
  activeTab?: TabId;
  /** denser for in-app chrome */
  density?: "comfortable" | "compact";
  className?: string;
};

function tabIsActive(href: string, pathname: string, activeTab?: TabId, tabId?: TabId): boolean {
  if (activeTab && tabId) return activeTab === tabId;
  if (href === "/story") {
    return pathname === "/story" || pathname.startsWith("/story/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteNavBoxes({
  activeTab,
  density = "comfortable",
  className = "",
}: SiteNavBoxesProps) {
  const pathname = usePathname();
  const compact = density === "compact";

  return (
    <nav
      aria-label="Main sections"
      className={`grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 ${className}`}
    >
      {APP_TABS.map((tab) => {
        const active = tabIsActive(tab.href, pathname, activeTab, tab.id);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`group flex min-h-[4.5rem] flex-col rounded-2xl border-2 transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-0 ${
              tab.accent
            } ${active ? "ring-2 ring-offset-2 ring-[#8b5e34] ring-offset-[#f6f1e8]" : ""} ${
              compact ? "p-3 sm:p-3.5" : "p-3.5 sm:p-5"
            }`}
          >
            <p
              className={`font-semibold uppercase tracking-[0.2em] opacity-80 ${
                compact ? "text-[9px]" : "text-[10px]"
              }`}
            >
              {tab.tagline}
            </p>
            <h2
              className={`mt-1 font-serif font-semibold leading-snug ${
                compact ? "text-sm sm:text-base" : "text-base sm:text-xl"
              }`}
            >
              {tab.label}
            </h2>
            {!compact && (
              <p className="mt-2 hidden flex-1 text-xs leading-relaxed opacity-90 sm:block sm:text-sm">
                {tab.description}
              </p>
            )}
            <div
              className={`mt-auto flex items-center justify-between gap-2 ${
                compact ? "mt-2" : "mt-3 sm:mt-4"
              }`}
            >
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider sm:text-[10px]">
                {tab.badge}
              </span>
              <span
                className={`font-semibold group-hover:underline ${
                  compact ? "text-[11px]" : "text-xs sm:text-sm"
                }`}
              >
                Open →
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
