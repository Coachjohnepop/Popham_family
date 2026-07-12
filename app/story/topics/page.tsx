import AppTabs from "@/components/AppTabs";

export const metadata = {
  title: "Story topics — Winifred Coss Family Tree",
  description: "Sixteen narrative entry points into the Winifred Coss family story.",
};

export default function StoryTopicsPage() {
  return <AppTabs initialTab="story" />;
}
