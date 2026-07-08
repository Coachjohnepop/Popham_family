import { executePromptChoice, getPromptById } from "@/lib/prompt-index";
import { getStorySections } from "@/lib/storybook";

export type ExplorationPath = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const PATH_COPY: Record<
  string,
  { title: string; description: string }
> = {
  beginning: {
    title: "From the beginning",
    description:
      "Start at the opening chapters — how the Powers and Goodwater branches enter the story.",
  },
  "powers-branch": {
    title: "Edith Powers branch",
    description:
      "Follow the English and Puritan line from the Old World to Massachusetts and beyond.",
  },
  "goodwater-branch": {
    title: "Mary Ann Goodwater branch",
    description:
      "Explore the French-Canadian line — Québec, the St. Lawrence, and the King's Daughters.",
  },
  "merge-1853": {
    title: "Where the branches meet",
    description:
      "Jump to 1853 when Joseph Warren Coss and Mary Ann Goodwater unite the two family lines.",
  },
};

export function getExplorationPaths(): ExplorationPath[] {
  const prompt = getPromptById("where-to-begin");
  const startGroup = prompt?.choiceGroups.find((g) => g.id === "start-here");
  if (!startGroup) return [];

  const sections = getStorySections();

  return startGroup.choices
    .map((choice) => {
      const copy = PATH_COPY[choice.id];
      const nav = executePromptChoice(choice, sections);
      if (nav?.action !== "chapter") return null;

      return {
        id: choice.id,
        title: copy?.title ?? choice.label,
        description: copy?.description ?? choice.label,
        href: `/story/${nav.sectionId}`,
      };
    })
    .filter((path): path is ExplorationPath => Boolean(path));
}