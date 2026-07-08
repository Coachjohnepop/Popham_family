"use client";

import Link from "next/link";
import { getFamilyIndexEntry } from "@/lib/story-format";
import { getPersonLineage } from "@/lib/person-match";
import type { TreePerson } from "@/lib/family-tree";

type PersonSidePanelProps = {
  person: TreePerson;
  onClose: () => void;
};

export default function PersonSidePanel({ person, onClose }: PersonSidePanelProps) {
  const { parents, spouse, children } = getPersonLineage(person.id);
  const indexEntry = getFamilyIndexEntry(person.name);

  return (
    <aside className="sticky top-4 rounded-2xl border-2 border-[#7c3aed] bg-[#faf5ff] p-5 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7c3aed]">
            Family member
          </p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-[#2b2118]">{person.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#6f5c49] hover:bg-[#efe4d2]"
          aria-label="Close person panel"
        >
          ✕
        </button>
      </div>

      <dl className="mt-4 space-y-2 text-sm text-[#3f342c]">
        {person.born && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              Born
            </dt>
            <dd>
              {person.born}
              {person.place ? ` · ${person.place}` : ""}
            </dd>
          </div>
        )}
        {person.place && !person.born && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              Place
            </dt>
            <dd>{person.place}</dd>
          </div>
        )}
        {spouse && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              Spouse
            </dt>
            <dd>{spouse.name}</dd>
          </div>
        )}
        {parents.length > 0 && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              Parents
            </dt>
            <dd>{parents.map((p) => p.name).join(" · ")}</dd>
          </div>
        )}
        {children.length > 0 && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              Children
            </dt>
            <dd>{children.map((p) => p.name).join(" · ")}</dd>
          </div>
        )}
        {person.note && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              How they lived
            </dt>
            <dd className="leading-relaxed">{person.note}</dd>
          </div>
        )}
        {indexEntry && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              From the family index
            </dt>
            <dd className="leading-relaxed text-[#6f5c49]">{indexEntry.snippet}</dd>
          </div>
        )}
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-[#6f5c49]">
        Birth and marriage sources are in Family Tree Maker.{" "}
        <Link href="/story/references" className="font-semibold text-[#7c3aed] hover:underline">
          See references
        </Link>
        .
      </p>

      <Link
        href={`/tree?person=${person.id}`}
        className="mt-4 inline-block text-sm font-semibold text-[#7c3aed] hover:underline"
      >
        View on family tree →
      </Link>
    </aside>
  );
}