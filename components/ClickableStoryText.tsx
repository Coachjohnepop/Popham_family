"use client";

import { getTreePerson } from "@/lib/family-tree";
import { useOptionalReader } from "@/components/ReaderProvider";
import { splitFormattedStoryText } from "@/lib/story-format";

type ClickableStoryTextProps = {
  text: string;
  className?: string;
};

export default function ClickableStoryText({ text, className }: ClickableStoryTextProps) {
  const reader = useOptionalReader();
  const segments = splitFormattedStoryText(text);

  return (
    <p className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.value}</span>;
        }

        if (seg.type === "maiden") {
          return (
            <span
              key={i}
              className="text-[0.95em] italic text-[#6f5c49]"
              title="Maiden name (per family document convention)"
            >
              {seg.value}
            </span>
          );
        }

        if (seg.type === "date-estimate") {
          return (
            <span
              key={i}
              className="border-b border-dotted border-[#c8b08d] text-[#5c4a38]"
              title="Estimated date — records incomplete in the original document"
            >
              {seg.value}
            </span>
          );
        }

        if (seg.type === "famous") {
          return (
            <strong
              key={i}
              className="font-semibold text-[#5c4a38]"
              title="Historical figure (world-famous context)"
            >
              {seg.value}
            </strong>
          );
        }

        const person = seg.personId ? getTreePerson(seg.personId) : undefined;
        const canClick = Boolean(person && reader);

        if (canClick) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => reader!.setPinnedPerson(person!)}
              className="font-bold text-[#7c3aed] underline decoration-[#c4b5fd] underline-offset-2 hover:text-[#5b21b6]"
              title={`Direct family member — click to learn more about ${seg.value}`}
            >
              {seg.value}
            </button>
          );
        }

        return (
          <strong
            key={i}
            className="font-bold text-[#2b2118]"
            title="Direct family member"
          >
            {seg.value}
          </strong>
        );
      })}
    </p>
  );
}