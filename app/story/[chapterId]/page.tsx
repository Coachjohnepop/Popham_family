import type { Metadata } from "next";
import AppTabs from "@/components/AppTabs";
import { getStorySection, getStorySectionIds } from "@/lib/storybook";

type PageProps = {
  params: Promise<{ chapterId: string }>;
};

export async function generateStaticParams() {
  return getStorySectionIds().map((chapterId) => ({ chapterId }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chapterId } = await params;
  const section = getStorySection(chapterId);
  if (!section) {
    return { title: "Story section" };
  }
  return {
    title: `${section.title} · Storybook`,
    description: section.teaser,
  };
}

export default async function StoryChapterPage() {
  return <AppTabs initialTab="story" />;
}