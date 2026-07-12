"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import FamilyIndexView from "@/components/FamilyIndexView";
import FavoritesView from "@/components/FavoritesView";
import ReadingProgressCard from "@/components/ReadingProgressCard";
import SiteBrandHeader from "@/components/SiteBrandHeader";
import SiteNavBoxes from "@/components/SiteNavBoxes";
import StoryChapterView from "@/components/StoryChapterView";
import StoryFormatGuide from "@/components/StoryFormatGuide";
import StoryIndexView from "@/components/StoryIndexView";
import StoryReferencesView from "@/components/StoryReferencesView";
import StorySidebar from "@/components/StorySidebar";
import StoryTopicsHubLoader from "@/components/StoryTopicsHubLoader";
import MapTimelineView from "@/components/MapTimelineView";
import FamilyTreeView from "@/components/FamilyTreeView";
import type { TabId } from "@/lib/tabs";
import SiteFooter from "@/components/SiteFooter";

function StoryDocShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <StorySidebar />
      {children}
    </div>
  );
}

function StoryRouter() {
  const pathname = usePathname();

  if (pathname === "/story/topics") {
    return (
      <StoryDocShell>
        <div className="space-y-4">
          <StoryTopicsHubLoader />
        </div>
      </StoryDocShell>
    );
  }
  if (pathname === "/story/format") {
    return (
      <StoryDocShell>
        <StoryFormatGuide />
      </StoryDocShell>
    );
  }
  if (pathname === "/story/family-index") {
    return (
      <StoryDocShell>
        <FamilyIndexView />
      </StoryDocShell>
    );
  }
  if (pathname === "/story/references") {
    return (
      <StoryDocShell>
        <StoryReferencesView />
      </StoryDocShell>
    );
  }

  const match = pathname.match(/^\/story\/([^/]+)$/);
  if (match?.[1]) {
    const reserved = new Set(["topics", "format", "family-index", "references"]);
    if (!reserved.has(match[1])) {
      return <StoryChapterView sectionId={match[1]} />;
    }
  }

  return <StoryIndexView />;
}

type AppTabsProps = {
  initialTab: TabId;
};

export default function AppTabs({ initialTab }: AppTabsProps) {
  const tab = initialTab;

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <header className="border-b border-[#d9cbb6] bg-[#fffaf2]">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:py-6">
          <SiteBrandHeader
            size="app"
            subtitle="Where the Coss family fits into history"
          />
          <SiteNavBoxes activeTab={tab} density="compact" />
          {tab !== "favorites" && <ReadingProgressCard variant="compact" />}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {tab === "story" && <StoryRouter />}
        {tab === "favorites" && <FavoritesView />}
        {tab === "tree" && (
          <Suspense fallback={<p className="text-sm text-[#6f5c49]">Loading family tree…</p>}>
            <FamilyTreeView />
          </Suspense>
        )}
        {tab === "map" && (
          <Suspense fallback={<p className="text-sm text-[#6f5c49]">Loading map…</p>}>
            <MapTimelineView />
          </Suspense>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
