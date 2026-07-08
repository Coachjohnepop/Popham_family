import Link from "next/link";
import { getStoryFormat } from "@/lib/story-format";

export default function StoryFormatGuide({ compact = false }: { compact?: boolean }) {
  const format = getStoryFormat();

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] p-5"
          : "rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
        {format.title}
      </p>
      <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
        How this story is written
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[#6f5c49]">
        Conventions from the original Winifred Coss family document — applied throughout the
        interactive storybook.
      </p>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {format.conventions.map((rule) => (
          <li
            key={rule.id}
            className="rounded-2xl border border-[#efe4d2] bg-[#fffaf2] px-4 py-3 text-sm"
          >
            <span className="font-semibold text-[#2b2118]">{rule.label}</span>
            <p className="mt-1 leading-relaxed text-[#6f5c49]">{rule.detail}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[#6f5c49]">
        <span className="inline-flex items-center gap-1.5">
          <span className="font-bold text-[#2b2118]">Bold</span>
          direct family
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="font-bold text-[#7c3aed] underline">Purple</span>
          clickable on tree
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="italic text-[#6f5c49]">(Parentheses)</span>
          maiden name
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="border-b border-dotted border-[#c8b08d]">about</span>
          estimated date
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-[#5c4a38]">Famous</span>
          historical figure
        </span>
      </div>

      {!compact && (
        <details className="mt-6 rounded-2xl border border-[#e2d4bf] bg-[#fffaf2] px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-[#8b5e34]">
            Full text from the original document
          </summary>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#3f342c]">
            {format.rules.map((rule, index) => (
              <p key={index}>{rule.text}</p>
            ))}
          </div>
        </details>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/story/family-index"
          className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
        >
          Family index →
        </Link>
        <Link
          href="/story/references"
          className="rounded-full bg-[#efe4d2] px-4 py-2 text-sm font-semibold text-[#5c4a38] hover:bg-[#e4d4bc]"
        >
          References →
        </Link>
      </div>
    </section>
  );
}