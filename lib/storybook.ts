import { applyNarrativeOverride } from "@/lib/narrative-storybook";
import type { StorybookData, StorySection } from "@/lib/types";
import storybookData from "@/data/storybook.json";

const book = storybookData as StorybookData;

function withNarrative(section: StorySection): StorySection {
  return applyNarrativeOverride(section);
}

export function getStorybook(): StorybookData {
  return {
    ...book,
    sections: book.sections.map(withNarrative),
  };
}

export function getStorySections(): StorySection[] {
  return book.sections.map(withNarrative);
}

export function getStorySection(id: string): StorySection | undefined {
  const section = book.sections.find((s) => s.id === id);
  return section ? withNarrative(section) : undefined;
}

export function getStorySectionIds(): string[] {
  return book.sections.map((section) => section.id);
}