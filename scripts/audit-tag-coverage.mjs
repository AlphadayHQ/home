#!/usr/bin/env node
/**
 * Tag-coverage audit for the 66 board slugs.
 *
 * Two questions, one pass:
 *
 *  1. **Which boards are silently empty?** A landing page whose tag returns no
 *     news is a dashboard with a dead panel — this degrades the product, not
 *     just SEO, and it fails quietly because an empty list renders as an empty
 *     list rather than an error.
 *  2. **How large is the recap tier actually?** C3 wants ~20 items a week to be
 *     worth a page. That cannot be sized by guessing at the entity count; it
 *     needs last-week volume per entity, which is what `period=1` gives.
 *
 * A slug with no news is checked against blogs and videos too. All three empty
 * means the slug is not a real tag; news-only empty means the tag exists but
 * its keywords do not match news, which is a different fix.
 *
 *   node --env-file-if-exists=.env.local scripts/audit-tag-coverage.mjs
 */
const API = "https://api.alphaday.com";
const appId = process.env.API_APP_ID ?? process.env.VITE_X_APP_ID;
const appSecret = process.env.API_APP_SECRET ?? process.env.VITE_X_APP_SECRET;
if (!appId || !appSecret) {
  console.error("audit-tag-coverage: set API_APP_ID / API_APP_SECRET");
  process.exit(1);
}
const headers = { "x-app-id": appId, "x-app-secret": appSecret };

// C3's own threshold: below roughly this many items a week there is not enough
// happening to justify a recap page.
const RECAP_FLOOR = 20;

/**
 * Board slug -> real tag slug, recovered from the live taxonomy.
 *
 * The product filters content by the board's own slug, but the tag taxonomy
 * does not use those slugs, so 17 of 66 boards matched nothing at all. The
 * causes are ordinary and all historical:
 *
 *  - **Rebrands.** Polygon's tag is still `matic-network`; the board is
 *    `polygon` and the token is now `POL`.
 *  - **Disambiguated coin IDs.** Avalanche is `avalanche-2`, CoinGecko-style.
 *  - **Missing hyphens.** `ethereumclassic`, `rocketpool`, `thegraph`,
 *    `liquidstaking`, `vitalikbuterin` — the taxonomy hyphenates, the boards
 *    do not.
 *
 * This map exists to size the recap tier honestly. **It is not the fix** — the
 * mapping belongs on the landing-page record, so that one source drives the
 * dashboard, the recap and the sitemap alike. Sizing C3 against the broken
 * slugs would have undercounted the tier by more than half.
 */
const SLUG_FIXES = {
  avalanche: "avalanche-2",
  ethereumclassic: "ethereum-classic",
  impossible: "impossible-finance",
  injective: "injective-protocol",
  kyber: "kyber-network",
  liquidstaking: "liquid-staking",
  metis: "metisdao",
  polygon: "matic-network",
  risechain: "rise-chain",
  rocketpool: "rocket-pool",
  sia: "siacoin",
  thegraph: "the-graph",
  vitalikbuterin: "vitalik-buterin",
  worldcoin: "world",
};

// Boards with no plausible tag, and no reason to have one: an audience
// category, Alphaday's own AI, and a conference.
const NO_TAG_EXPECTED = new Set(["beginner", "kasandra", "solana-break-point"]);

const total = async (path) => {
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) return null;
  return (await res.json()).total ?? 0;
};

async function boardSlugs() {
  const out = [];
  let next = `${API}/ui/landing-pages/`;
  while (next) {
    const res = await fetch(next, { headers });
    if (!res.ok) throw new Error(`${next} -> ${res.status}`);
    const body = await res.json();
    out.push(...(body.results ?? []).filter((r) => r.is_published !== false));
    next = body.links?.next;
  }
  return out.map((r) => r.slug).sort();
}

// Small pool: 66 slugs x up to 4 calls, and the API is shared with production.
async function mapPool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n]);
      }
    })
  );
  return out;
}

const main = async () => {
  const slugs = await boardSlugs();
  console.log(`Auditing ${slugs.length} published board slugs\n`);

  const rows = await mapPool(slugs, 6, async (slug) => {
    const tag = SLUG_FIXES[slug] ?? slug;
    const q = `tags=${encodeURIComponent(tag)}&limit=1`;
    const news = await total(`/items/news/?${q}`);
    const week = await total(`/items/news/?${q}&period=1`);
    if (news === 0) {
      const blogs = await total(`/items/blogs/?${q}`);
      const videos = await total(`/items/videos/?${q}`);
      return { slug, tag, news, week, blogs, videos };
    }
    return { slug, tag, news, week };
  });

  const dead = rows.filter((r) => r.news === 0 && !NO_TAG_EXPECTED.has(r.slug));
  const remapped = rows.filter((r) => r.tag !== r.slug);
  const orphan = dead.filter((r) => r.blogs === 0 && r.videos === 0);
  const newsOnly = dead.filter((r) => !(r.blogs === 0 && r.videos === 0));
  const recap = rows.filter((r) => r.week >= RECAP_FLOOR);

  if (dead.length) {
    console.log(`${dead.length} boards return ZERO news:\n`);
    console.log("  slug                 news  blogs  videos  diagnosis");
    for (const r of dead.sort((a, b) => a.slug.localeCompare(b.slug))) {
      const isOrphan = r.blogs === 0 && r.videos === 0;
      console.log(
        `  ${r.slug.padEnd(20)} ${String(r.news).padStart(4)}  ` +
          `${String(r.blogs).padStart(5)}  ${String(r.videos).padStart(6)}  ` +
          (isOrphan ? "slug matches nothing — wrong or unmapped tag" : "tag exists, news keywords do not match")
      );
    }
  }

  console.log(
    `\nRecap tier (C3) sizing — boards with >= ${RECAP_FLOOR} news items in the last week:`
  );
  console.log(`  ${recap.length} of ${rows.length} qualify.`);
  const top = rows.filter((r) => r.week > 0).sort((a, b) => b.week - a.week);
  console.log(
    `  distribution: ${top.filter((r) => r.week >= 100).length} over 100/wk, ` +
      `${top.filter((r) => r.week >= RECAP_FLOOR && r.week < 100).length} between ${RECAP_FLOOR} and 100, ` +
      `${top.filter((r) => r.week < RECAP_FLOOR).length} below ${RECAP_FLOOR}, ` +
      `${rows.length - top.length} at zero.`
  );

  console.log(
    `\n${remapped.length} boards only return content under a corrected tag slug:`
  );
  for (const r of remapped.sort((a, b) => b.news - a.news)) {
    console.log(
      `  ${r.slug.padEnd(18)} -> ${r.tag.padEnd(20)} ${String(r.news).padStart(6)} news`
    );
  }
  console.log(
    "  These are broken in the product today, not only in SEO: the board filters\n" +
      "  by its own slug, so each of these dashboards renders an empty feed."
  );

  console.log("\nSummary");
  console.log(`  boards audited            ${rows.length}`);
  console.log(`  zero news                 ${dead.length} unexplained, ${NO_TAG_EXPECTED.size} expected (category / own product / event)`);
  console.log(`  fixed by a slug remap     ${remapped.length}`);
  console.log(`  qualify for a recap page  ${recap.length}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
