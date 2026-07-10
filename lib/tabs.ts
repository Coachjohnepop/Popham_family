export const APP_TABS = [
  {
    id: "story",
    label: "Interactive Storybook",
    href: "/story",
    tagline: "Read the chapters",
    description:
      "11 chronological chapters and 16 story topics — key family moments, every photo, optional slideshows.",
    accent: "border-[#3b82f6] bg-[#eff6ff] text-[#1e3a8a]",
    badge: "16 topics · 11 chapters",
  },
  {
    id: "tree",
    label: "Family Tree",
    href: "/tree",
    tagline: "See how the branches meet",
    description:
      "Two ancestral lines from England and Québec converge in Iowa, 1853 — then descend to Winifred Eloise Coss.",
    accent: "border-[#7c3aed] bg-[#f5f3ff] text-[#4c1d95]",
    badge: "18 people charted",
  },
  {
    id: "map",
    label: "Map & Timeline",
    href: "/map",
    tagline: "Explore places through time",
    description:
      "Slide the timeline — 16 story topics and hundreds of events across the United States and the world, 1469–1950.",
    accent: "border-[#8b5e34] bg-[#fffaf2] text-[#5c4a38]",
    badge: "16 topics · 68 places",
  },
] as const;

export type TabId = (typeof APP_TABS)[number]["id"];

export function getTabById(id: string) {
  return APP_TABS.find((tab) => tab.id === id);
}