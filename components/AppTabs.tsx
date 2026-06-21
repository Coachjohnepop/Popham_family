"use client";

import { useState } from "react";
import StoryView from "@/components/StoryView";
import MapTimelineView from "@/components/MapTimelineView";

const TABS = [
  { id: "story", label: "Storybook" },
  { id: "map", label: "Map & Timeline" },
] as const;

export default function AppTabs() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("story");

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f1e8] text-[#2b2118]">
      <header className="border-b border-[#d9cbb6] bg-[#fffaf2]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#8b5e34]">
              Preview
            </p>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
              The Story of Winifred Coss
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-[#6f5c49]">
              Where the Coss family tree meets famous people and places in history.
            </p>
          </div>
          <nav className="flex gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
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
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {tab === "story" ? <StoryView /> : <MapTimelineView />}
      </main>
    </div>
  );
}