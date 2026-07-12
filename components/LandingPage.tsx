import LandingEntry from "@/components/LandingEntry";
import LandingPhotoCollage from "@/components/LandingPhotoCollage";
import SiteBrandHeader from "@/components/SiteBrandHeader";
import SiteNavBoxes from "@/components/SiteNavBoxes";
import SiteFooter from "@/components/SiteFooter";
import { getLandingImages } from "@/lib/landing-images";

export default function LandingPage() {
  const { images, totalInDocument } = getLandingImages();

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:py-12">
        <SiteBrandHeader
          size="landing"
          subtitle="England, France, and the Dutch — three kingdoms, three reasons to cross the Atlantic. Two branches of history meet in one family."
        />

        <div className="mt-8 sm:mt-10">
          <SiteNavBoxes density="comfortable" />
        </div>

        <LandingEntry />

        <LandingPhotoCollage images={images} totalInDocument={totalInDocument} />

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-[#6f5c49]">
          Use the boxes above anytime. Ask questions inside the Interactive Storybook. Pin chapters
          on My Path (last box) to build your own flow.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
