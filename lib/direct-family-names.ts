import directNamesData from "@/data/direct-family-names.json";

type DirectFamilyNamesData = {
  count: number;
  names: string[];
  famousPeople: string[];
};

const data = directNamesData as DirectFamilyNamesData;

export function getDirectFamilyNames(): string[] {
  return data.names;
}

export function getFamousPeopleNames(): string[] {
  return data.famousPeople;
}