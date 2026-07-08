import { getStoryNotes, getStoryReferences } from "@/lib/story-format";

const KIND_LABELS: Record<string, string> = {
  source: "Sources",
  archive: "Archives",
  "related-document": "Related family papers",
  topic: "Topics",
};

export default function StoryReferencesView() {
  const references = getStoryReferences();
  const notes = getStoryNotes();

  const grouped = references.reduce<Record<string, typeof references>>((acc, entry) => {
    const bucket = acc[entry.kind] ?? [];
    bucket.push(entry);
    acc[entry.kind] = bucket;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8b5e34]">
          References
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
          Sources &amp; related documents
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6f5c49]">
          The narrative avoids footnotes to stay readable. Individual source citations live in
          Family Tree Maker; historical references and cross-document notes are collected here.
        </p>
      </div>

      {Object.entries(grouped).map(([kind, entries]) => (
        <section
          key={kind}
          className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="font-serif text-xl font-semibold text-[#2b2118]">
            {KIND_LABELS[kind] ?? kind}
          </h2>
          <ul className="mt-4 space-y-4">
            {entries.map((entry) => (
              <li key={`${kind}-${entry.title}`} className="rounded-2xl bg-[#fffaf2] p-4">
                <h3 className="font-semibold text-[#5c4a38]">{entry.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6f5c49]">{entry.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-3xl border border-[#e2d4bf] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-serif text-xl font-semibold text-[#2b2118]">
          Notes from the original document
        </h2>
        <p className="mt-2 text-sm text-[#6f5c49]">
          {notes.length} editorial notes pointing to related papers and historical context.
        </p>
        <ul className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
          {notes.map((note, index) => (
            <li
              key={index}
              className="rounded-2xl border border-[#efe4d2] bg-[#fffaf2] px-4 py-3 text-sm leading-relaxed text-[#3f342c]"
            >
              {note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}