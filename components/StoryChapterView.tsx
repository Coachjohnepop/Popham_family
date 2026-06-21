import { notFound } from "next/navigation";
import StoryChapterReader from "@/components/StoryChapterReader";
import StorySidebar from "@/components/StorySidebar";
import { getStorySection, getStorySections } from "@/lib/storybook";

type StoryChapterViewProps = {
  sectionId: string;
};

export default function StoryChapterView({ sectionId }: StoryChapterViewProps) {
  const section = getStorySection(sectionId);
  if (!section) notFound();

  const sections = getStorySections();
  const index = sections.findIndex((s) => s.id === sectionId);
  const prev = index > 0 ? sections[index - 1] : null;
  const next = index < sections.length - 1 ? sections[index + 1] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <StorySidebar activeId={sectionId} />
      <StoryChapterReader key={section.id} section={section} prev={prev} next={next} />
    </div>
  );
}