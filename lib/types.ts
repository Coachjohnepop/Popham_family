export type Branch = "powers" | "goodwater" | "both";

export type MapScope = "us" | "world";

export type StoryChapter = {
  id: string;
  title: string;
  branch: Branch;
  yearStart: number;
  yearEnd?: number;
  readingLevel: "grade6";
  teaser: string;
  story: string;
  famousPeople: string[];
  familyNames: string[];
  highlight: boolean;
};

export type TimelineEvent = {
  id: string;
  year: number;
  title: string;
  summary: string;
  branch: Branch;
  famousPeople: string[];
  familyNames: string[];
  location: {
    name: string;
    lat: number;
    lng: number;
    scope: MapScope;
  };
};