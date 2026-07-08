import Link from "next/link";
import { Suspense } from "react";
import EventSearch from "@/components/EventSearch";
import LandingPhotoCollage from "@/components/LandingPhotoCollage";
import { getLandingImages } from "@/lib/landing-images";
import { APP_TABS } from "@/lib/tabs";
import SiteFooter from "@/components/SiteFooter";

export default function LandingPage() {
  const { images, totalInDocument } = getLandingImages();

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#8b5e34]">
            Family history
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            The Story of Winifred Coss
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#6f5c49] sm:text-lg">
            Where the Coss family fits into history
          </p>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-2xl flex-col items-center gap-4">
          <Link
            href="/read"
            className="w-full rounded-full bg-[#8b5e34] px-8 py-4 text-center text-base font-semibold text-white shadow-md transition hover:bg-[#6f4a28] sm:w-auto"
          >
            Start guided reading →
          </Link>
          <p className="text-center text-sm text-[#6f5c49]">
            Personalized welcome, read-aloud, and clickable family names
          </p>
          <div className="w-full">
            <Suspense fallback={null}>
              <EventSearch placeholder="Search Winifred’s story — events, people, places…" />
            </Suspense>
          </div>
        </div>

        <LandingPhotoCollage images={images} totalInDocument={totalInDocument} />

        <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-3">
          {APP_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`group flex flex-col rounded-3xl border-2 p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${tab.accent}`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-80">
                {tab.tagline}
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">{tab.label}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed opacity-90">{tab.description}</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
                  {tab.badge}
                </span>
                <span className="text-sm font-semibold group-hover:underline">Open →</span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-[#6f5c49]">
          You can switch between Storybook, Family Tree, and Map &amp; Timeline anytime from the
          header once you&apos;re inside.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}