"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getFamilyTree, getTreePerson, getTreePeople, type TreePerson } from "@/lib/family-tree";

const tree = getFamilyTree();

const BRANCH_STYLES: Record<string, string> = {
  powers: "border-[#3b82f6] bg-[#eff6ff] text-[#1e3a8a]",
  goodwater: "border-[#7c3aed] bg-[#f5f3ff] text-[#4c1d95]",
  coss: "border-[#8b5e34] bg-[#fffaf2] text-[#5c4a38]",
  both: "border-[#8b5e34] bg-[#fffaf2] text-[#5c4a38]",
};

function PersonCard({
  person,
  selected,
  onSelect,
}: {
  person: TreePerson;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const spouse = person.spouseId ? getTreePerson(person.spouseId) : null;
  const style = BRANCH_STYLES[person.branch] ?? BRANCH_STYLES.coss;

  return (
    <button
      type="button"
      onClick={() => onSelect(person.id)}
      className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
        selected || person.highlight
          ? `${style} shadow-md ring-2 ring-[#d97706]/40`
          : `${style} hover:shadow-sm`
      }`}
    >
      <div className="font-serif text-base font-semibold leading-tight">{person.name}</div>
      {(person.born || person.place) && (
        <div className="mt-1 text-xs opacity-80">
          {person.born ? `b. ${person.born}` : ""}
          {person.born && person.place ? " · " : ""}
          {person.place ?? ""}
        </div>
      )}
      {spouse && <div className="mt-1 text-xs opacity-75">↔ {spouse.name}</div>}
    </button>
  );
}

function ChainColumn({
  title,
  subtitle,
  ids,
  selectedId,
  onSelect,
}: {
  title: string;
  subtitle: string;
  ids: string[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const people = getTreePeople(ids);

  return (
    <div className="flex min-w-[220px] flex-1 flex-col items-center gap-2">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          {title}
        </p>
        <p className="text-xs text-[#6f5c49]">{subtitle}</p>
      </div>
      {people.map((person, index) => (
        <div key={person.id} className="flex w-full max-w-xs flex-col items-center gap-2">
          <PersonCard person={person} selected={selectedId === person.id} onSelect={onSelect} />
          {index < people.length - 1 && (
            <div className="h-6 w-px bg-[#c8b08d]" aria-hidden />
          )}
        </div>
      ))}
    </div>
  );
}

export default function FamilyTreeView() {
  const searchParams = useSearchParams();
  const personParam = searchParams.get("person");
  const [selectedId, setSelectedId] = useState(personParam ?? tree.rootId);

  useEffect(() => {
    if (personParam && getTreePerson(personParam)) {
      setSelectedId(personParam);
    }
  }, [personParam]);

  const selected = useMemo(() => getTreePerson(selectedId), [selectedId]);

  const junction = getTreePerson("joseph-warren-coss");
  const mary = getTreePerson("mary-goodwater");
  const warren = getTreePerson("warren-coss");
  const edith = getTreePerson("edith-powers");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          Family tree
        </p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">{tree.title}</h2>
        <p className="mt-1 text-sm text-[#6f5c49]">{tree.subtitle}</p>
        <p className="mt-2 text-xs text-[#6f5c49]">
          {tree.people.length} people charted · tap any name for details
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-[#e2d4bf] bg-white p-4 sm:p-6">
        <div className="flex min-w-[760px] items-start justify-center gap-4">
          <ChainColumn
            title="Powers branch"
            subtitle="England → Massachusetts → Vermont"
            ids={tree.powersChain}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          <div className="flex w-48 flex-col items-center gap-3 self-center pt-16">
            {warren && edith && (
              <>
                <PersonCard
                  person={warren}
                  selected={selectedId === warren.id}
                  onSelect={setSelectedId}
                />
                <span className="text-xs text-[#6f5c49]">+</span>
                <PersonCard
                  person={edith}
                  selected={selectedId === edith.id}
                  onSelect={setSelectedId}
                />
                <div className="h-8 w-px bg-[#c8b08d]" />
              </>
            )}
            {junction && (
              <PersonCard
                person={junction}
                selected={selectedId === junction.id}
                onSelect={setSelectedId}
              />
            )}
            <span className="rounded-full bg-[#efe4d2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8b5e34]">
              1853 marriage
            </span>
            {mary && (
              <PersonCard
                person={mary}
                selected={selectedId === mary.id}
                onSelect={setSelectedId}
              />
            )}
          </div>

          <ChainColumn
            title="Goodwater branch"
            subtitle="Paris → Québec → Iowa"
            ids={tree.goodwaterChain}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-2">
          <div className="h-8 w-px bg-[#c8b08d]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            Coss line → Winifred
          </p>
          {getTreePeople(
            tree.cossDescent.filter((id) => id !== "joseph-warren-coss").slice(1),
          ).map(
            (person, index, arr) => (
              <div key={person.id} className="flex w-full max-w-xs flex-col items-center gap-2">
                <PersonCard
                  person={person}
                  selected={selectedId === person.id}
                  onSelect={setSelectedId}
                />
                {index < arr.length - 1 && <div className="h-6 w-px bg-[#c8b08d]" />}
              </div>
            ),
          )}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
            {selected.branch} branch
            {selected.born ? ` · ${selected.born}` : ""}
          </div>
          <h3 className="mt-1 font-serif text-2xl font-semibold">{selected.name}</h3>
          {selected.place && <p className="mt-1 text-sm text-[#6f5c49]">{selected.place}</p>}
          {selected.note && (
            <p className="mt-3 text-sm leading-relaxed text-[#5c4a38]">{selected.note}</p>
          )}
          {selected.parents && selected.parents.length > 0 && (
            <p className="mt-3 text-sm text-[#5c4a38]">
              Parents:{" "}
              {selected.parents
                .map((id) => getTreePerson(id)?.name)
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {selected.spouseId && getTreePerson(selected.spouseId) && (
            <p className="mt-1 text-sm text-[#5c4a38]">
              Spouse: {getTreePerson(selected.spouseId)?.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}