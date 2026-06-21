import Link from "next/link";
import LandingPhotoCollage from "@/components/LandingPhotoCollage";
import { getLandingImages } from "@/lib/landing-images";
import { APP_TABS } from "@/lib/tabs";
import { SITE_URL } from "@/lib/site";

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
            Where the Coss family tree meets famous people and places in history. Choose how
            you&apos;d like to begin.
          </p>
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

      <footer className="border-t border-[#d9cbb6] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-sm text-[#6f5c49] sm:flex-row sm:items-center sm:justify-between">
          <p>The Story of Winifred Coss — family history for Dad</p>
          <a
            href={SITE_URL}
            className="font-medium text-[#8b5e34] hover:text-[#6f4a28]"
          >
            {SITE_URL.replace("https://", "")}
          </a>
        </div>
      </footer>
    </div>
  );
}