import Link from "next/link";
import { getKindLabel } from "@/lib/search";
import type { AskSearchResult } from "@/lib/ask-search";
import type { SearchEntry } from "@/lib/types";

const KIND_STYLES: Record<SearchEntry["kind"], string> = {
  event: "bg-[#dbeafe] text-[#1e3a8a]",
  chapter: "bg-[#efe4d2] text-[#5c4a38]",
  person: "bg-[#f3e8ff] text-[#5b3c88]",
  place: "bg-[#dcfce7] text-[#166534]",
};

type SearchAnswerCardProps = {
  answer: AskSearchResult;
};

export default function SearchAnswerCard({ answer }: SearchAnswerCardProps) {
  return (
    <aside className="space-y-4 rounded-2xl border-2 border-[#e2d4bf] bg-[#fffaf2] p-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          {answer.directMatch ? "From the family index" : "Closest related records"}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#3f342c]">{answer.intro}</p>
      </div>

      <ul className="space-y-3">
        {answer.entries.map((entry) => {
          const primaryRef = entry.references[0];
          return (
            <li
              key={entry.id}
              className="rounded-xl border border-[#e8dcc8] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${KIND_STYLES[entry.kind]}`}
                >
                  {getKindLabel(entry.kind)}
                </span>
                {entry.year && (
                  <span className="text-xs font-medium text-[#8b5e34]">{entry.year}</span>
                )}
              </div>
              <p className="mt-2 font-medium text-[#2b2118]">{entry.label}</p>
              {entry.subtitle && (
                <p className="mt-0.5 text-xs text-[#6f5c49]">{entry.subtitle}</p>
              )}
              {entry.summary.length > 0 && (
                <div className="mt-2 space-y-1 text-sm leading-relaxed text-[#3f342c]">
                  {entry.summary.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
              {primaryRef && (
                <Link
                  href={primaryRef.href}
                  className="mt-3 inline-flex text-sm font-semibold text-[#8b5e34] hover:underline"
                >
                  Open {primaryRef.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}