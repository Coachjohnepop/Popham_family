"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import AskEventPanel from "@/components/AskEventPanel";
import EventSearch from "@/components/EventSearch";
import StoryChapterView from "@/components/StoryChapterView";
import StoryIndexView from "@/components/StoryIndexView";
import MapTimelineView from "@/components/MapTimelineView";
import FamilyTreeView from "@/components/FamilyTreeView";
import { APP_TABS, type TabId } from "@/lib/tabs";
import SiteFooter from "@/components/SiteFooter";

function StoryRouter() {
  const pathname = usePathname();
  const match = pathname.match(/^\/story\/([^/]+)$/);
  if (match?.[1]) {
    return <StoryChapterView sectionId={match[1]} />;
  }
  return <StoryIndexView />;
}

type AppTabsProps = {
  initialTab: TabId;
};

export default function AppTabs({ initialTab }: AppTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tab = initialTab;

  function selectTab(id: TabId) {
    const next = APP_TABS.find((item) => item.id === id);
    if (next && pathname !== next.href) {
      router.push(next.href);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <header className="border-b border-[#d9cbb6] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#8b5e34] hover:text-[#6f4a28]"
            >
              Home
            </Link>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              <Link href="/" className="hover:text-[#6f4a28]">
                The Story of Winifred Coss
              </Link>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6f5c49]">
              Where the Coss family fits into history
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {APP_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === item.id
                    ? "bg-[#8b5e34] text-white"
                    : "bg-[#efe4d2] text-[#5c4a38] hover:bg-[#e4d4bc]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mx-auto max-w-6xl space-y-3 px-4 pb-4">
          <Suspense fallback={null}>
            <EventSearch />
          </Suspense>
          <AskEventPanel />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {tab === "story" && <StoryRouter />}
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