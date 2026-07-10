import {
  applyNarrativeOverride,
  getNarrativeStorySections,
  isChronologicalNarrative,
  resolveLegacyChapterId,
} from "@/lib/narrative-storybook";
import type { StorybookData, StorySection } from "@/lib/types";
import storybookData from "@/data/storybook.json";

const book = storybookData as StorybookData;

const legacyById = new Map(book.sections.map((section) => [section.id, section]));

function withNarrative(section: StorySection): StorySection {
  return applyNarrativeOverride(section);
}

function getLegacySections(): StorySection[] {
  return book.sections.map(withNarrative);
}

function getActiveSections(): StorySection[] {
  if (isChronologicalNarrative()) {
    return getNarrativeStorySections(legacyById);
  }
  return getLegacySections();
}

export function getStorybook(): StorybookData {
  const sections = getActiveSections();
  const imageCountMapped = sections.reduce((total, section) => total + section.imageCount, 0);

  return {
    sectionCount: sections.length,
    imageCountInDocument: book.imageCountInDocument,
    imageCountMapped,
    sections,
  };
}

export function getStorySections(): StorySection[] {
  return getActiveSections();
}

export function getStorySection(id: string): StorySection | undefined {
  const resolvedId = isChronologicalNarrative()
    ? resolveLegacyChapterId(id, book.sections)
    : id;

  return getActiveSections().find((section) => section.id === resolvedId);
}

export function getStorySectionIds(): string[] {
  return getActiveSections().map((section) => section.id);
}