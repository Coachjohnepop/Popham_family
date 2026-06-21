import landingImagesData from "@/data/landing-images.json";

export type LandingImageCategory = "family" | "history" | "places";

export type LandingImage = {
  id: string;
  src: string;
  caption: string;
  category: LandingImageCategory;
};

export type LandingImagesData = {
  totalInDocument: number;
  curatedCount: number;
  images: LandingImage[];
};

const data = landingImagesData as LandingImagesData;

export function getLandingImages(): LandingImagesData {
  return data;
}