"use client";

import Link from "next/link";
import FlowerBouquet from "@/components/FlowerBouquet";
import HomeLink from "@/components/HomeLink";

type SiteBrandHeaderProps = {
  /** Page subtitle under the title */
  subtitle?: string;
  /** larger title on landing */
  size?: "landing" | "app";
  className?: string;
};

/**
 * Shared brand block: bouquet above the title, easter-egg link top-right to Subjects Covered.
 * Mobile: stacks cleanly; bouquet stays ≤ title type size.
 */
export default function SiteBrandHeader({
  subtitle,
  size = "app",
  className = "",
}: SiteBrandHeaderProps) {
  const titleClass =
    size === "landing"
      ? "font-serif text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl"
      : "font-serif text-2xl font-semibold tracking-tight sm:text-3xl";

  return (
    <div className={`relative ${className}`}>
      {/* Home — always visible top-left */}
      <HomeLink
        className="absolute left-0 top-0 z-10 inline-flex items-center rounded-full bg-[#efe4d2] px-3 py-1.5 text-xs font-semibold text-[#5c4a38] shadow-sm transition hover:bg-[#e4d4bc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5e34] sm:px-4 sm:text-sm"
      >
        ← Home
      </HomeLink>

      {/* Easter-egg entry — top right, discrete */}
      <Link
        href="/subjects"
        className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-full border border-transparent p-1.5 text-[#8b5e34] opacity-70 transition hover:border-[#e2d4bf] hover:bg-white/80 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5e34]"
        title="A quiet path… subjects covered"
        aria-label="Open subjects covered checklist (secret garden)"
      >
        <FlowerBouquet size="sm" title="Open subjects covered" />
        <span className="sr-only">Subjects covered</span>
      </Link>

      <div className="flex flex-col items-center px-10 text-center sm:px-14">
        <div
          className={`flex items-center justify-center text-[#2b2118] ${
            size === "landing" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"
          }`}
          aria-hidden
        >
          <FlowerBouquet size="title" className="drop-shadow-sm" />
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#8b5e34]">
          Family history
        </p>
        <h1 className={`mt-2 ${titleClass}`}>
          <HomeLink className="hover:text-[#6f4a28]">The Story of Winifred Coss</HomeLink>
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-[#6f5c49] sm:text-base">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
