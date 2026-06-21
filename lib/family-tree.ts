import type { Branch } from "@/lib/types";
import familyTreeSeed from "@/data/family-tree.seed.json";

export type TreePerson = {
  id: string;
  name: string;
  branch: Branch | "coss";
  born?: number;
  place?: string;
  note?: string;
  highlight?: boolean;
  parents?: string[];
  spouseId?: string;
};

export type FamilyTreeData = {
  title: string;
  subtitle: string;
  rootId: string;
  people: TreePerson[];
  powersChain: string[];
  goodwaterChain: string[];
  cossDescent: string[];
};

const tree = familyTreeSeed as FamilyTreeData;

export function getFamilyTree(): FamilyTreeData {
  return tree;
}

export function getTreePerson(id: string): TreePerson | undefined {
  return tree.people.find((p) => p.id === id);
}

export function getTreePeople(ids: string[]): TreePerson[] {
  return ids.map((id) => getTreePerson(id)).filter((p): p is TreePerson => Boolean(p));
}