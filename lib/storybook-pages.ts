import type { StoryBlock } from "@/lib/types";

export const MAX_CHAPTER_PAGES = 4;

function blockWeight(block: StoryBlock): number {
  if (block.type === "paragraph") {
    return Math.max(1, Math.ceil(block.text.length / 650));
  }
  if (block.type === "image") {
    return 2;
  }
  return 1;
}

export function paginateChapterBlocks(blocks: StoryBlock[], maxPages = MAX_CHAPTER_PAGES): StoryBlock[][] {
  if (blocks.length === 0) {
    return [[]];
  }

  const weights = blocks.map(blockWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const pageCount = Math.min(maxPages, Math.max(1, blocks.length));
  const targetWeight = totalWeight / pageCount;

  const pages: StoryBlock[][] = [];
  let currentPage: StoryBlock[] = [];
  let currentWeight = 0;
  let pageIndex = 0;

  for (let i = 0; i < blocks.length; i++) {
    currentPage.push(blocks[i]);
    currentWeight += weights[i];

    const remainingPages = pageCount - pageIndex - 1;
    const remainingBlocks = blocks.length - i - 1;

    if (
      pageIndex < pageCount - 1 &&
      currentWeight >= targetWeight &&
      remainingBlocks >= remainingPages
    ) {
      pages.push(currentPage);
      currentPage = [];
      currentWeight = 0;
      pageIndex += 1;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  while (pages.length > maxPages) {
    const overflow = pages.pop();
    if (overflow) {
      pages[pages.length - 1].push(...overflow);
    }
  }

  return pages;
}