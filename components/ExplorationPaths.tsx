import Link from "next/link";
import { getExplorationPaths } from "@/lib/exploration-paths";

const PATH_ACCENTS = [
  "border-[#e2d4bf] bg-[#fffaf2] hover:border-[#c8b08d]",
  "border-[#ddd6fe] bg-[#f5f3ff] hover:border-[#c4b5fd]",
  "border-[#bbf7d0] bg-[#f0fdf4] hover:border-[#86efac]",
  "border-[#fde68a] bg-[#fffbeb] hover:border-[#fcd34d]",
];

export default function ExplorationPaths() {
  const paths = getExplorationPaths();

  return (
    <section aria-labelledby="explore-heading" className="w-full">
      <h2
        id="explore-heading"
        className="text-center font-serif text-xl font-semibold text-[#2b2118] sm:text-2xl"
      >
        Where would you like to explore?
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-relaxed text-[#6f5c49]">
        Pick a path through the family story — or ask your own question below.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {paths.map((path, index) => (
          <Link
            key={path.id}
            href={path.href}
            className={`group rounded-2xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${PATH_ACCENTS[index % PATH_ACCENTS.length]}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b5e34]">
              Path {index + 1}
            </p>
            <h3 className="mt-1 font-serif text-lg font-semibold text-[#2b2118] group-hover:text-[#6f4a28]">
              {path.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#5c4a38]">{path.description}</p>
            <span className="mt-3 inline-block text-sm font-semibold text-[#8b5e34] group-hover:underline">
              Open this path →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}