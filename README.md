# The Story of Winifred Coss

Interactive family history app built from *The Story of Winifred Coss Family Tree* — storybook chapters, a family tree chart, and a map & timeline.

**Live site:** [https://coss-family-story.vercel.app/](https://coss-family-story.vercel.app/)

**Repository:** [github.com/Coachjohnepop/Popham_family](https://github.com/Coachjohnepop/Popham_family)

## Tabs

Uniform navigation boxes (top of every page; **My Path** is last):

- **Storybook** — voice dial, ask anything, topics, chapters
- **Family Tree** — Powers and Goodwater branches converging at Joseph Warren Coss + Mary Ann Goodwater (1853)
- **Map & Timeline** — Leaflet map with indexed locations from the story (1469–1950)
- **My Path** — reading progress, pinned favorites, custom chapter order

**Subjects covered** (`/subjects`) — high-level checklist (easter-egg flower in the brand header). Progress and pins live in the browser (`localStorage`) per reader.

Ask-anything search is on the Interactive Storybook page only (not the landing page).

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

### Read-aloud (TTS)

Storybook **Read aloud** calls `/api/read-aloud`:

1. **Speechify** (preferred) when `SPEECHIFY_API_KEY` is set  
2. **OpenAI** `gpt-4o-mini-tts` when `OPENAI_API_KEY` is set  
3. **Browser** `speechSynthesis` as client-side fallback  

```bash
# Local
cp .env.example .env.local
# paste SPEECHIFY_API_KEY from https://platform.speechify.ai/api-keys

# Production (Vercel)
SPEECHIFY_API_KEY=sk_... ./scripts/add-speechify-vercel-env.sh
```

Optional: `SPEECHIFY_VOICE` (default `edmund_32`), `SPEECHIFY_MODEL` (default `simba-3.2`).  
Health: `GET /api/voice-health` should report `"tts": "speechify"`.

## Deploy

Production is hosted on Vercel under `johnepop-s-projects`:

```bash
npm run build
vercel --prod --yes
```