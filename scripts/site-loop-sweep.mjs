#!/usr/bin/env node
/**
 * Full-site link + page loop for The Story of Winifred Coss / pophamstory.com
 *
 *   BASE_URL=https://pophamstory.com ROUNDS=4 node scripts/site-loop-sweep.mjs
 *
 * Exit 1 if any hard failures (unexpected 4xx/5xx, dead internal hrefs).
 */
import { writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://pophamstory.com").replace(/\/$/, "");
const ROUNDS = Math.max(1, Number(process.env.ROUNDS || "4"));
const MARK = "FAMILY-SITE-LOOP";
const RUN = Date.now().toString(36);

const results = [];
function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  results.push({ ok: true, name, detail: `WARN ${detail}`, warn: true });
  console.log(`⚠️  ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, name, detail = "") {
  if (cond) pass(name, detail);
  else {
    fail(name, detail);
    throw new Error(`${name}: ${detail}`);
  }
}

function loadJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

/** Static app routes from filesystem */
function pageRoutesFromFs() {
  const app = join(ROOT, "app");
  const routes = [];
  function rec(dir, urlParts) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith(".") || ent.name === "api") continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name.startsWith("[") && ent.name.endsWith("]")) {
          rec(p, [...urlParts, ent.name]);
        } else {
          rec(p, [...urlParts, ent.name]);
        }
      } else if (ent.name === "page.tsx" || ent.name === "page.ts") {
        const raw = "/" + urlParts.join("/");
        const url = raw === "/" ? "/" : raw.replace(/\/$/, "");
        routes.push(url);
      }
    }
  }
  rec(app, []);
  return [...new Set(routes)].sort();
}

function expandDynamic(route) {
  if (!route.includes("[")) return [route];
  if (route.includes("[chapterId]")) {
    const storybook = loadJson("data/storybook.json");
    const narrative = loadJson("data/narrative-storybook.json");
    const legacyIds = (storybook.sections || []).map((s) => s.id);
    const segIds = (narrative.segments || [])
      .filter((s) => s.status !== "pending")
      .map((s) => s.id);
    // Active chronological chapters + every legacy id (must redirect or 200)
    const ids = [...new Set([...segIds, ...legacyIds])];
    return ids.map((id) => route.replace("[chapterId]", encodeURIComponent(id)));
  }
  return []; // skip other dynamic unless known
}

async function probe(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const method = opts.method || "GET";
  const t0 = Date.now();
  // Chapters may 308 legacy → segment; follow so we verify the destination works.
  const redirect = opts.redirect || (path.startsWith("/story/") ? "follow" : "manual");
  try {
    const res = await fetch(url, {
      method,
      redirect,
      headers: {
        "user-agent": `coss-family-site-loop/${MARK}/1.0`,
        "cache-control": "no-cache",
        ...(opts.headers || {}),
        ...(opts.body ? { "content-type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const loc = res.headers.get("location") || "";
    let text = "";
    try {
      text = await res.text();
    } catch {
      text = "";
    }
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* not json */
    }
    return {
      url,
      status: res.status,
      ok: res.ok,
      loc,
      ms: Date.now() - t0,
      text,
      json,
      headers: res.headers,
      finalUrl: res.url,
    };
  } catch (e) {
    return {
      url,
      status: 0,
      ok: false,
      loc: "",
      ms: Date.now() - t0,
      text: "",
      json: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function isGoodPage(status, loc) {
  if (status >= 200 && status < 300) return true;
  // Next may soft-navigate; redirects to same origin OK
  if (status === 307 || status === 308 || status === 301 || status === 302) {
    return Boolean(loc);
  }
  return false;
}

function extractInternalHrefs(html, pagePath) {
  const hrefs = new Set();
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    let h = m[1].trim();
    if (!h || h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:")) continue;
    if (h.startsWith("javascript:")) continue;
    if (h.startsWith("http://") || h.startsWith("https://")) {
      try {
        const u = new URL(h);
        const base = new URL(BASE);
        if (u.origin !== base.origin) continue; // external
        h = u.pathname + u.search;
      } catch {
        continue;
      }
    }
    if (!h.startsWith("/")) {
      // relative
      const basePath = pagePath.endsWith("/") ? pagePath : pagePath.replace(/\/[^/]*$/, "/");
      h = join(basePath, h).replace(/\\/g, "/");
      if (!h.startsWith("/")) h = `/${h}`;
    }
    // strip hash
    h = h.split("#")[0];
    if (h) hrefs.add(h);
  }
  return [...hrefs];
}

/** Scan TSX for static href="/..." strings */
function scanSourceHrefs() {
  const hrefs = new Set();
  const roots = [join(ROOT, "app"), join(ROOT, "components"), join(ROOT, "lib")];
  function walk(dir) {
    let ents;
    try {
      ents = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of ents) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
        walk(p);
      } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
        const text = readFileSync(p, "utf8");
        // Only static path literals — skip template strings with ${...}
        for (const m of text.matchAll(/href=["'](\/[^"'#?${}]*)["']/g)) {
          hrefs.add(m[1]);
        }
        for (const m of text.matchAll(/\.push\(["'](\/[^"'#?${}]*)["']/g)) {
          hrefs.add(m[1]);
        }
      }
    }
  }
  for (const r of roots) walk(r);
  return [...hrefs].sort();
}

async function runRound(round) {
  const tag = `r${round}`;
  console.log(`\n══ ${MARK} ${tag}/${ROUNDS} · ${RUN} · ${BASE} ══\n`);

  // 1. Home
  const home = await probe("/");
  assert(home.status === 200, `${tag} home`, String(home.status));
  assert(
    /winifred|coss|story|family/i.test(home.text),
    `${tag} home has brand copy`,
    "missing expected keywords",
  );

  // 2. Static pages from filesystem
  const fsRoutes = pageRoutesFromFs().filter((r) => !r.includes("["));
  for (const route of fsRoutes) {
    const r = await probe(route);
    if (isGoodPage(r.status, r.loc)) {
      pass(`${tag} page ${route}`, `${r.status}${r.loc ? ` → ${r.loc.slice(0, 40)}` : ""} ${r.ms}ms`);
    } else {
      fail(`${tag} page ${route}`, `${r.status} ${r.error || ""}`.trim());
    }
  }

  // 3. Dynamic story chapters (all narrative + all legacy)
  const chapterPaths = expandDynamic("/story/[chapterId]");
  let chapterOk = 0;
  let chapterFail = 0;
  for (const path of chapterPaths) {
    const r = await probe(path);
    // Soft 404 pages may still return 200 with not-found UI; require 200 and not obvious crash
    if (r.status === 200 && !/Application error|Internal Server Error/i.test(r.text)) {
      chapterOk++;
    } else if (isGoodPage(r.status, r.loc)) {
      chapterOk++;
    } else {
      chapterFail++;
      fail(`${tag} chapter ${path}`, `${r.status}`);
    }
  }
  if (chapterFail === 0) {
    pass(`${tag} all story chapters`, `${chapterOk}/${chapterPaths.length} ok`);
  } else {
    fail(`${tag} story chapters`, `${chapterFail} failed of ${chapterPaths.length}`);
  }

  // 4. Topic deep-links (sample)
  try {
    const topicsData = loadJson("data/story-topics.json");
    const topics = topicsData.topics || [];
    for (const t of topics.slice(0, 8)) {
      const path = `/story?topic=${encodeURIComponent(t.id)}`;
      const r = await probe(path);
      if (isGoodPage(r.status, r.loc)) pass(`${tag} topic link ${t.id}`, String(r.status));
      else fail(`${tag} topic link ${t.id}`, String(r.status));
    }
    if (topics.length > 8) {
      pass(`${tag} topic sample`, `probed 8 of ${topics.length}`);
    }
  } catch (e) {
    warn(`${tag} topics`, e.message);
  }

  // 5. API health
  const apis = [
    { path: "/api/voice-health", expectOk: true },
  ];
  for (const a of apis) {
    const r = await probe(a.path);
    if (r.status === 200) {
      pass(`${tag} API ${a.path}`, JSON.stringify(r.json || {}).slice(0, 120));
    } else if (r.status === 401 || r.status === 503) {
      warn(`${tag} API ${a.path}`, `${r.status} (keys may be limited)`);
    } else {
      fail(`${tag} API ${a.path}`, String(r.status));
    }
  }

  // Read-aloud without body should not 500
  const ra = await probe("/api/read-aloud", {
    method: "POST",
    body: {},
  });
  if (ra.status >= 400 && ra.status < 500) {
    pass(`${tag} read-aloud gate`, String(ra.status));
  } else if (ra.status === 200) {
    pass(`${tag} read-aloud`, "200");
  } else {
    fail(`${tag} read-aloud`, String(ra.status));
  }

  // 6. Extract internal links from key pages + crawl one level
  const seedPages = ["/", "/story", "/tree", "/map", "/favorites", "/read", "/subjects", "/story/topics", "/story/family-index", "/story/format", "/story/references"];
  const discovered = new Set(seedPages);
  for (const page of seedPages) {
    const r = await probe(page);
    if (r.status !== 200) continue;
    for (const h of extractInternalHrefs(r.text, page)) {
      discovered.add(h.split("?")[0]);
    }
  }

  // Source-scanned hrefs
  for (const h of scanSourceHrefs()) {
    if (!h.includes("[")) discovered.add(h);
  }

  let dead = 0;
  let linkOk = 0;
  for (const href of [...discovered].sort()) {
    if (href.startsWith("/api/")) continue; // GET may 405
    const r = await probe(href);
    if (isGoodPage(r.status, r.loc)) {
      linkOk++;
    } else if (r.status === 404) {
      dead++;
      fail(`${tag} dead href ${href}`, "404");
    } else if (r.status >= 500) {
      dead++;
      fail(`${tag} href 5xx ${href}`, String(r.status));
    } else {
      warn(`${tag} href ${href}`, String(r.status));
      linkOk++;
    }
  }
  pass(`${tag} internal href crawl`, `${linkOk} ok · ${dead} dead · ${discovered.size} discovered`);

  // 7. Static assets used on home
  const assetChecks = [
    "/images/landing/family-tree-chart.png",
    "/images/landing/morris-and-wini.png",
    "/favicon.ico",
  ];
  for (const a of assetChecks) {
    const r = await probe(a);
    if (r.status === 200) pass(`${tag} asset ${a}`, String(r.status));
    else warn(`${tag} asset ${a}`, String(r.status));
  }

  // 8. No obvious React crash on main tabs
  for (const path of ["/story", "/tree", "/map", "/favorites"]) {
    const r = await probe(path);
    assert(r.status === 200, `${tag} tab ${path}`, String(r.status));
    assert(
      !/Application error|Internal Server Error|Unhandled Runtime Error/i.test(r.text),
      `${tag} tab ${path} no crash`,
    );
  }

  pass(`${tag} round complete`);
}

async function main() {
  console.log(`\n📖 ${MARK}`);
  console.log(`BASE: ${BASE}`);
  console.log(`ROUNDS: ${ROUNDS}\n`);

  try {
    for (let r = 1; r <= ROUNDS; r++) {
      await runRound(r);
    }
  } catch (e) {
    console.error("\n💥", e.message);
  }

  const failed = results.filter((x) => !x.ok);
  const warns = results.filter((x) => x.warn);
  const passed = results.filter((x) => x.ok && !x.warn);
  const report = {
    ok: failed.length === 0,
    mark: MARK,
    run: RUN,
    base: BASE,
    rounds: ROUNDS,
    pass: passed.length,
    warn: warns.length,
    fail: failed.length,
    results,
    at: new Date().toISOString(),
  };
  const outPath = join(ROOT, "scripts/.site-loop-sweep-latest.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(
    `\n── Summary: ${passed.length} pass · ${warns.length} warn · ${failed.length} fail ──`,
  );
  if (failed.length) {
    console.log("\nFAILURES:");
    for (const f of failed) console.log(`  • ${f.name}: ${f.detail}`);
  }
  if (warns.length) {
    console.log("\nWARNINGS:");
    for (const w of warns.slice(0, 20)) console.log(`  • ${w.name}: ${w.detail}`);
    if (warns.length > 20) console.log(`  … +${warns.length - 20} more`);
  }
  console.log(`\nWrote ${relative(ROOT, outPath)}\n`);
  process.exit(failed.length ? 1 : 0);
}

main();
