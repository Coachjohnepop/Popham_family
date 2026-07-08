# The Story of Winifred Coss

Interactive family history app built from *The Story of Winifred Coss Family Tree* — storybook chapters, a family tree chart, and a map & timeline.

**Live site:** [https://coss-family-story.vercel.app/](https://coss-family-story.vercel.app/)

**Repository:** [github.com/Coachjohnepop/Popham_family](https://github.com/Coachjohnepop/Popham_family)

## Tabs

- **Storybook** — narrative chapters with famous-people intersections
- **Family Tree** — Powers and Goodwater branches converging at Joseph Warren Coss + Mary Ann Goodwater (1853)
- **Map & Timeline** — Leaflet map with indexed locations from the story (1469–1950)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Data scripts

```bash
npm run extract          # extract chapters/events from source .docx
npm run index:locations  # build location + timeline indexes
npm run index:search     # build search.index.json
npm run index:narration  # precompute voice narration (extractive, from full source text)
npm run index:narration:ai  # same, with OpenAI summaries (OPENAI_API_KEY)
```

Voice answers use `data/narration-summaries.json` (precomputed cache, not a database). Re-run `index:narration` after updating the storybook or briefs.

## Deploy

Production is hosted on Vercel under `johnepop-s-projects`:

```bash
npm run build
vercel --prod --yes
```