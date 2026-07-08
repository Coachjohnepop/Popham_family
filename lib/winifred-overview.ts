import overviewData from "@/data/winifred-overview.json";

export type OverviewDepth = "short" | "medium" | "full";

export type OverviewSummary = {
  label: string;
  targetWords: number;
  spoken: string;
};

export type WinifredOverviewData = {
  id: string;
  title: string;
  summaries: Record<OverviewDepth, OverviewSummary>;
};

const overview = overviewData as WinifredOverviewData;

export const OVERVIEW_DEPTHS: OverviewDepth[] = ["short", "medium", "full"];

export function getWinifredOverview(): WinifredOverviewData {
  return overview;
}

export function getOverviewSummary(depth: OverviewDepth): OverviewSummary {
  return overview.summaries[depth];
}

export function getOverviewIntro(depth: OverviewDepth): string {
  const summary = getOverviewSummary(depth);
  return `${summary.label}. ${overview.title}. `;
}