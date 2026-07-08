"use client";

import { splitTextByPeople } from "@/lib/person-match";
import { getTreePerson } from "@/lib/family-tree";
import { useOptionalReader } from "@/components/ReaderProvider";

type ClickableStoryTextProps = {
  text: string;
  className?: string;
};

export default function ClickableStoryText({ text, className }: ClickableStoryTextProps) {
  const reader = useOptionalReader();
  const segments = splitTextByPeople(text);

  return (
    <p className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              const person = getTreePerson(seg.personId);
              if (person && reader) reader.setPinnedPerson(person);
            }}
            className="font-medium text-[#7c3aed] underline decoration-[#c4b5fd] underline-offset-2 hover:text-[#5b21b6]"
            title={`Learn about ${seg.personName}`}
          >
            {seg.value}
          </button>
        );
      })}
    </p>
  );
}