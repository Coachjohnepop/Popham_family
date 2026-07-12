/** Primary app destinations — My Path is last by design. */
export const APP_TABS = [
  {
    id: "story",
    label: "Interactive Storybook",
    href: "/story",
    tagline: "Read the chapters",
    description:
      "Chronological chapters and story topics — key family moments, every photo, optional slideshows.",
    accent: "border-[#3b82f6] bg-[#eff6ff] text-[#1e3a8a]",
    badge: "Topics · chapters",
  },
  {
    id: "tree",
    label: "Family Tree",
    href: "/tree",
    tagline: "See how the branches meet",
    description:
      "Two ancestral lines from England and Québec converge in Iowa, 1853 — then descend to Winifred Eloise Coss.",
    accent: "border-[#7c3aed] bg-[#f5f3ff] text-[#4c1d95]",
    badge: "People charted",
  },
  {
    id: "map",
    label: "Map & Timeline",
    href: "/map",
    tagline: "Explore places through time",
    description:
      "Slide the timeline — story topics and events across the United States and the world, 1469–1950.",
    accent: "border-[#8b5e34] bg-[#fffaf2] text-[#5c4a38]",
    badge: "Topics · places",
  },
  {
    id: "favorites",
    label: "My Path",
    href: "/favorites",
    tagline: "Your progress & pins",
    description:
      "See how far you have read, pin favorite sections, and build a custom story path in your own order.",
    accent: "border-[#db2777] bg-[#fdf2f8] text-[#9d174d]",
    badge: "Progress · pins",
  },
] as const;

export type TabId = (typeof APP_TABS)[number]["id"];

export function getTabById(id: string) {
  return APP_TABS.find((tab) => tab.id === id);
}
