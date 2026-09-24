#!/usr/bin/env node
/**
 * Taxonomy-level audit of `/tags/`.
 *
 * The companion script, `audit-tag-resolution.mjs`, asks a board-level question:
 * which of the 66 dashboards render an empty feed, and does the resolution rule
 * fix them. This one asks *why* they are empty, and the answer turns out not to
 * be board-shaped at all.
 *
 * Three defects, none of which is visible from the board side:
 *
 *  1. **Keyword-less tags.** A tag with no keywords is never attached to an
 *     item, so it matches nothing — permanently. It is not a valid published
 *     state, but nothing rejects it, so they accumulate.
 *  2. **Shadowed twins.** A keyword-less tag whose name matches a working tag
 *     is a duplicate of the same entity. Every consumer — dashboard, recap,
 *     sitemap, search — has to guess which one is real, and they will
 *     eventually guess differently. These want merging, not mapping, which is
 *     the whole argument of `docs/tag-taxonomy-fix.md`.
 *  3. **Over-broad keywords.** A single common English word or a two-letter
 *     ticker matches bare. `world` collects the FIFA World Cup; `RISE` collects
 *     "bond yields rise"; `BASE` — on a board featured on the home page —
 *     collects "Iran missile strikes ... target US base".
 *
 * Defect 3 is the one that makes a mapping table dangerous rather than merely
 * incomplete: the obvious recovery heuristic is "pick the candidate tag with
 * the most items", and for `worldcoin` and `risechain` that heuristic picks
 * the noise tag over the correct one.
 *
 *   node --env-file-if-exists=.env.local scripts/audit-tag-taxonomy.mjs
 */
const API = "https://api.alphaday.com";
const appId = process.env.API_APP_ID ?? process.env.VITE_X_APP_ID;
const appSecret = process.env.API_APP_SECRET ?? process.env.VITE_X_APP_SECRET;
if (!appId || !appSecret) {
  console.error("audit-tag-taxonomy: set API_APP_ID / API_APP_SECRET");
  process.exit(1);
}
const headers = { "x-app-id": appId, "x-app-secret": appSecret };

/**
 * Terms that match far more than the project that claims them. Two groups:
 * ordinary English words, and tickers short enough to collide with them.
 *
 * This list is deliberately hand-kept rather than derived. "Is this word too
 * common to match bare" is a judgement about English, not a property of the
 * taxonomy, and a frequency heuristic over 17k crypto tags would flag `base`
 * and `chain` while missing `IF`.
 */
const OVER_BROAD = new Set([
  "world", "rise", "chain", "market", "block", "token", "coin", "swap", "pool",
  "node", "data", "cloud", "stream", "flow", "echo", "pulse", "wave", "core",
  "edge", "spark", "shift", "boost", "grid", "loop", "mint", "dex", "base",
  "link", "gas", "art", "real", "open", "live", "next", "move", "play", "air",
  "top", "best", "new", "time", "point", "one", "if", "sc", "el",
]);

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function allTags() {
  const out = [];
  let next = `${API}/tags/?limit=500`;
  while (next) {
    const res = await fetch(next, { headers });
    if (!res.ok) throw new Error(`${next} -> ${res.status}`);
    const body = await res.json();
    out.push(...(body.results ?? []));
    next = body.links?.next;
  }
  return out;
}

const main = async () => {
  const tags = await allTags();
  const pct = (n) => `${((n / tags.length) * 100).toFixed(1)}%`;

  const empty = tags.filter((t) => !(t.keywords ?? []).length);

  // Index the working tags by normalised name so an empty tag can be checked
  // for a twin that actually carries the entity's content.
  const workingByName = new Map();
  for (const t of tags) {
    if (!(t.keywords ?? []).length) continue;
    const key = norm(t.name);
    if (!workingByName.has(key)) workingByName.set(key, []);
    workingByName.get(key).push(t);
  }
  const shadowed = empty.filter((t) => workingByName.has(norm(t.name)));

  const broad = tags.filter((t) =>
    (t.keywords ?? []).some((k) => OVER_BROAD.has(norm(k.name)))
  );

  console.log(`Tags enumerated              ${tags.length}`);
  console.log(
    `Zero keywords                ${empty.length} (${pct(empty.length)}) — can never match an item`
  );
  console.log(
    `  of which shadow a twin     ${shadowed.length} — duplicate entity, content split`
  );
  console.log(
    `Over-broad keyword           ${broad.length} — matches unrelated coverage`
  );

  console.log(`\nShadowed twins (empty tag -> the tag actually holding content):`);
  for (const t of shadowed.slice(0, 20)) {
    const twin = workingByName.get(norm(t.name))[0];
    console.log(
      `  ${t.slug.padEnd(26)} -> ${twin.slug.padEnd(26)} ` +
        `[${(twin.keywords ?? []).map((k) => k.name).join(" | ").slice(0, 40)}]`
    );
  }
  if (shadowed.length > 20) console.log(`  ... and ${shadowed.length - 20} more`);

  console.log(`\nOver-broad keywords:`);
  for (const t of broad.slice(0, 20)) {
    const bad = (t.keywords ?? [])
      .filter((k) => OVER_BROAD.has(norm(k.name)))
      .map((k) => k.name)
      .join(", ");
    console.log(`  ${t.slug.padEnd(30)} ${bad}`);
  }
  if (broad.length > 20) console.log(`  ... and ${broad.length - 20} more`);

  console.log(
    "\nThese are taxonomy defects, not board defects. The resolution rule fixes\n" +
      "the empty boards and leaves all three of these in place — see\n" +
      "docs/tag-taxonomy-fix.md."
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
