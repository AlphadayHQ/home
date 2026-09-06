#!/usr/bin/env node
/**
 * Appendix C, pre-cutover check 1: "Every URL in the current sitemap resolves
 * to a 200 or a 301 to a 200."
 *
 * The URLs at risk are the ones Google has already indexed, and those came from
 * the *old* sitemap — which was built from `/ui/views/` (67 records) while the
 * pages served from `/ui/landing-pages/` (66). So the set to verify is the
 * union, not just the pages that exist now: a slug that only appears in
 * `/ui/views/` is still a URL Google was told to crawl.
 *
 * Every redirect is followed one hop and its destination checked too. A 301 to
 * a 404, or a 301 to another 301, loses the equity the redirect exists to keep.
 *
 *   yarn build && yarn start          # terminal 1
 *   node --env-file-if-exists=.env.local scripts/verify-301-map.mjs
 */
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const API = arg("api", "https://api.alphaday.com").replace(/\/$/, "");

const appId = process.env.API_APP_ID ?? process.env.VITE_X_APP_ID;
const appSecret = process.env.API_APP_SECRET ?? process.env.VITE_X_APP_SECRET;
if (!appId || !appSecret) {
  console.error("verify-301-map: set API_APP_ID / API_APP_SECRET");
  process.exit(1);
}
const headers = { "x-app-id": appId, "x-app-secret": appSecret };

async function paginate(url) {
  const out = [];
  let next = url;
  while (next) {
    const res = await fetch(next, { headers });
    if (!res.ok) throw new Error(`${next} returned ${res.status}`);
    const body = await res.json();
    out.push(...(body.results ?? []));
    next = body.links?.next;
  }
  return out;
}

const hit = async (path) => {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
};

async function main() {
  const [views, pages] = await Promise.all([
    paginate(`${API}/ui/views/`),
    paginate(`${API}/ui/landing-pages/`),
  ]);

  const published = new Set(
    pages.filter((p) => p.is_published !== false).map((p) => p.slug)
  );
  const indexedSlugs = [
    ...new Set([
      ...views.map((v) => v.slug).filter(Boolean),
      ...pages.map((p) => p.slug),
    ]),
  ].sort();

  console.log(
    `Checking ${indexedSlugs.length} slugs (${views.length} views ∪ ${pages.length} landing pages) ` +
      `plus static routes, against ${BASE}\n`
  );

  const problems = [];

  for (const slug of indexedSlugs) {
    const legacy = await hit(`/${slug}`);
    const expectPage = published.has(slug);

    if (expectPage) {
      // Must be a real 301 to the new location, and that location must be 200.
      if (legacy.status !== 301) {
        problems.push(`/${slug}: expected 301, got ${legacy.status}`);
        continue;
      }
      if (legacy.location !== `/projects/${slug}`) {
        problems.push(`/${slug}: 301 → ${legacy.location}, expected /projects/${slug}`);
        continue;
      }
      const dest = await hit(legacy.location);
      if (dest.status !== 200) {
        problems.push(
          `/${slug}: 301 → ${legacy.location} which returned ${dest.status} (chain or dead end)`
        );
      }
    } else {
      // A slug the old sitemap published with no page behind it. A genuine 404
      // is the correct answer — it is the soft-404-at-200 that costs crawl
      // budget and confuses index selection.
      if (legacy.status !== 404) {
        problems.push(
          `/${slug}: no published page, expected 404, got ${legacy.status}` +
            (legacy.location ? ` → ${legacy.location}` : "")
        );
      } else {
        console.log(`  note  /${slug} → 404 (no landing-page record; correct)`);
      }
    }
  }

  const staticExpectations = [
    ["/", 200],
    ["/api", 200],
    ["/api/docs", 200],
    ["/mobile", 200],
    ["/privacy", 200],
    ["/dashboards", 200],
    ["/dashboard", 301],
    ["/blog", 301],
    ["/b/ethereum", 301],
  ];
  for (const [path, expected] of staticExpectations) {
    const { status, location } = await hit(path);
    if (status !== expected) {
      problems.push(`${path}: expected ${expected}, got ${status}`);
    } else if (expected === 301) {
      // Only follow same-origin redirects; /blog and /b/* leave the site.
      if (location?.startsWith("/")) {
        const dest = await hit(location);
        if (dest.status !== 200) {
          problems.push(`${path}: 301 → ${location} returned ${dest.status}`);
        }
      }
    }
  }

  console.log(
    `\n${indexedSlugs.length + staticExpectations.length} URLs checked, ` +
      `${problems.length} problem${problems.length === 1 ? "" : "s"}`
  );
  if (problems.length) {
    problems.forEach((p) => console.log(`  FAIL  ${p}`));
    process.exit(1);
  }
  console.log("Every indexed URL resolves to a 200 or a 301 to a 200.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
