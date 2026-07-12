import HomeLink from "@/components/HomeLink";
import Link from "next/link";
import NarratorVoiceDial from "@/components/NarratorVoiceDial";
import PinSectionButton from "@/components/PinSectionButton";
import ReadingProgressCard from "@/components/ReadingProgressCard";
import StoryFormatGuide from "@/components/StoryFormatGuide";
import StoryAskSection from "@/components/StoryAskSection";
import StoryTopicsHubLoader from "@/components/StoryTopicsHubLoader";
import { getStorybook } from "@/lib/storybook";
import { getStoryTopicCount } from "@/lib/story-topics";
import StorySidebar from "@/components/StorySidebar";

export default function StoryIndexView() {
  const book = getStorybook();
  const topicCount = getStoryTopicCount();

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <StorySidebar />

      <div className="space-y-6">
        {/* Voice selection first on Interactive Storybook */}
        <NarratorVoiceDial variant="story" />

        <ReadingProgressCard />

        <StoryTopicsHubLoader />

        {/* Ask anything only on storybook (not landing) */}
        <StoryAskSection />

        <div className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Interactive Storybook
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
            The full family story
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6f5c49]">
            {topicCount} story topics above, then {book.sectionCount} chronological chapters
            (1485–1950) with {book.imageCountMapped} photographs. For a spoken overview, start from{" "}
            <HomeLink className="font-semibold text-[#8b5e34] hover:underline">Home</HomeLink>.
          </p>
        </div>

        <div id="format">
          <StoryFormatGuide compact />
        </div>

        <div>
          <h3 className="font-serif text-xl font-semibold text-[#2b2118]">All chapters</h3>
          <p className="mt-1 text-sm text-[#6f5c49]">
            Read straight through — or use the topics above as your guide. Pin stars for My Path.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {book.sections.map((section) => (
              <div
                key={section.id}
                className="relative rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-5 transition hover:border-[#c8b08d] hover:shadow-sm"
              >
                <div className="absolute right-3 top-3">
                  <PinSectionButton sectionId={section.id} compact />
                </div>
                <Link href={`/story/${section.id}`} className="block pr-10">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
                    {section.yearStart}
                    {section.yearEnd ? `–${section.yearEnd}` : ""} · {section.branch}
                    {section.imageCount > 0 ? ` · ${section.imageCount} photos` : ""}
                  </div>
                  <h4 className="mt-2 font-serif text-xl font-semibold leading-snug">
                    {section.title}
                  </h4>
                  <p className="mt-2 line-clamp-3 text-sm text-[#6f5c49]">{section.teaser}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-[#8b5e34]">
                    Read section →
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
