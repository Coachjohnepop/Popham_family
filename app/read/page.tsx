import GuidedWelcome from "@/components/GuidedWelcome";
import SiteBrandHeader from "@/components/SiteBrandHeader";
import SiteNavBoxes from "@/components/SiteNavBoxes";
import SiteFooter from "@/components/SiteFooter";

export default function GuidedReadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <header className="border-b border-[#d9cbb6] bg-[#fffaf2]">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:py-6">
          <SiteBrandHeader size="app" subtitle="Personalized welcome and guided table of contents" />
          <SiteNavBoxes density="compact" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <GuidedWelcome />
      </main>
      <SiteFooter />
    </div>
  );
}
