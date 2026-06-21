import type { StorybookData, StorySection } from "@/lib/types";
import storybookData from "@/data/storybook.json";

const book = storybookData as StorybookData;

export function getStorybook(): StorybookData {
  return book;
}

export function getStorySections(): StorySection[] {
  return book.sections;
}

export function getStorySection(id: string): StorySection | undefined {
  return book.sections.find((section) => section.id === id);
}

export function getStorySectionIds(): string[] {
  return book.sections.map((section) => section.id);
}