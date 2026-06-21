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

export type StoryImage = {
  src: string;
  caption: string;
  media: string;
};

export type StoryBlock =
  | { type: "paragraph"; text: string }
  | ({ type: "image" } & StoryImage)
  | { type: "slideshow"; images: StoryImage[] };

export type StorySection = {
  id: string;
  title: string;
  branch: Branch;
  yearStart: number;
  yearEnd?: number;
  teaser: string;
  famousPeople: string[];
  familyNames: string[];
  imageCount: number;
  blocks: StoryBlock[];
};

export type StorybookData = {
  sectionCount: number;
  imageCountInDocument: number;
  imageCountMapped: number;
  sections: StorySection[];
};

export type TimelineEvent = {
  id: string;
  year: number;
  title: string;
  summary: string;
  branch: Branch;
  famousPeople: string[];
  familyNames: string[];
  mentionsFamily?: boolean;
  location: {
    name: string;
    lat: number;
    lng: number;
    scope: MapScope;
  };
};

export type IndexedLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  scope: MapScope;
};

export type IndexMeta = {
  timelineElementsRaw: number;
  timelineElementsMapped: number;
  indexedLocations: number;
  yearMin: number;
  yearMax: number;
  withFamousOrFamily: number;
};