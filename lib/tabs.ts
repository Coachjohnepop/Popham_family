export const APP_TABS = [
  {
    id: "story",
    label: "Storybook",
    href: "/story",
    tagline: "Read the chapters",
    description:
      "28 tightened chapters from the original document — key family moments, every photo, optional slideshows.",
    accent: "border-[#3b82f6] bg-[#eff6ff] text-[#1e3a8a]",
    badge: "28 chapters · 134 photos",
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
      "Slide the timeline under the map to watch events appear across the United States and the world, 1469–1950.",
    accent: "border-[#8b5e34] bg-[#fffaf2] text-[#5c4a38]",
    badge: "68 indexed places",
  },
] as const;

export type TabId = (typeof APP_TABS)[number]["id"];

export function getTabById(id: string) {
  return APP_TABS.find((tab) => tab.id === id);
}