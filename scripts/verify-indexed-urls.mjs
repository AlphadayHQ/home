#!/usr/bin/env node
/**
 * Appendix C, pre-cutover: do the URLs **Google has actually indexed** survive
 * the migration?
 *
 * WHY THIS EXISTS ALONGSIDE `verify-301-map.mjs`
 *
 * That script sources its URL set from the API — the union of `/ui/views/` and
 * `/ui/landing-pages/`. It proves every URL *this project knows about*
 * resolves. It cannot prove anything about a URL the project has forgotten,
 * because a forgotten URL is by definition absent from both endpoints.
 *
 * Google has not forgotten them. `/berachain` was found only because the
 * homepage linked to it; the same class of URL that is *not* linked from
 * anywhere is invisible to every check in this repo and visible in Search
 * Console. This reads the Search Console export and asks the same questions of
 * that set instead.
 *
 * The two are complementary and neither subsumes the other: the API knows about
 * pages Google has never crawled, and Google knows about pages the API has
 * dropped.
 *
 * WHY IMPRESSIONS ARE CARRIED THROUGH TO THE OUTPUT
 *
 * A migration failure is not one bit per URL. Losing `/orbs` (1,559
 * impressions) and losing `/beginner` (1) are the same line in a pass/fail
 * report and are not remotely the same event. Findings are ordered by what is
 * at stake and the total is printed, so a run that reports "4 problems" can be
 * read as "4 problems holding 12 impressions" or "4 problems holding 4,000".
 *
 * WHEN TO DELETE THIS
 *
 * It needs a hand-downloaded CSV and a running server, so it can never join
 * `verify-ssr.mjs` in CI, and nothing exercises it between runs — which means
 * it rots silently and the next person cannot tell a real failure from a
 * changed export format. That is an acceptable trade for three runs around an
 * irreversible migration, and not for a permanent fixture.
 *
 * **Retire it once the old sitemap is withdrawn** (Appendix C, ~30 days after
 * cutover): either delete it, or fold the "indexed and earning nothing" half
 * into the promotion/demotion job in seo-strategy.md §4.2, which asks the same
 * question against the Search Console bulk export rather than this file.
 *
 *   yarn build && yarn start          # terminal 1
 *   node scripts/verify-indexed-urls.mjs --csv ~/Downloads/<export>/Pages.csv
 *
 * The export is Search Console → Performance → Export → Pages.csv. Any date
 * range works; three months is the default this repo has baselined against.
 */
import { readFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const CSV = arg("csv");
const HOST = arg("host", "alphaday.com");
const DRY = process.argv.includes("--dry-run");

if (!CSV) {
  console.error("usage: verify-indexed-urls.mjs --csv <Pages.csv> [--base URL] [--host HOST]");
  process.exit(2);
}

/**
 * Minimal CSV reader. Search Console quotes a field only when it contains a
 * comma, and URLs in this export do not — but a quoted field is handled anyway
 * rather than assuming the shape of someone else's file forever.
 */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { cells.push(cell); cell = ""; }
      else cell += c;
    }
    cells.push(cell);
    rows.push(cells);
  }
  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i]])));
}

const hit = async (path) => {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
};

async function main() {
  const rows = parseCsv(readFileSync(CSV, "utf8"));
  const urlKey = Object.keys(rows[0]).find((k) => /page|url/i.test(k));
  const imprKey = Object.keys(rows[0]).find((k) => /impression/i.test(k));
  if (!urlKey) throw new Error(`No page/URL column in ${CSV}`);

  /*
   * Fragments are collapsed onto their path. Search Console reports `/#faq` as
   * its own row because it is its own search result, but a fragment never
   * reaches the server, so as a redirect target it is simply `/`. Counting them
   * separately would report four phantom failures for one working page.
   */
  const seen = new Map();
  for (const row of rows) {
    const raw = row[urlKey];
    if (!raw?.startsWith(`https://${HOST}/`) && raw !== `https://${HOST}`) continue;
    const path = (new URL(raw).pathname || "/").replace(/\/$/, "") || "/";
    const impressions = Number(String(row[imprKey] ?? 0).replace(/[^0-9.]/g, "")) || 0;
    seen.set(path, (seen.get(path) ?? 0) + impressions);
  }

  const paths = [...seen.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`Checking ${paths.length} indexed URLs on ${HOST} against ${BASE}`);
  console.log(`(${[...seen.values()].reduce((a, b) => a + b, 0)} impressions represented)\n`);

  if (DRY) {
    for (const [path, impressions] of paths) {
      console.log(`  ${String(impressions).padStart(6)}  ${path}`);
    }
    console.log("\n--dry-run: nothing was fetched.");
    return;
  }

  const problems = [];
  let ok = 0;

  for (const [path, impressions] of paths) {
    const first = await hit(path);

    if (first.status === 200) { ok += 1; continue; }

    if (first.status === 301 || first.status === 308) {
      if (!first.location) {
        problems.push([impressions, `${path}: ${first.status} with no Location header`]);
        continue;
      }
      // Only same-origin destinations can be followed; /blog and /b/* leave.
      if (!first.location.startsWith("/")) { ok += 1; continue; }
      const dest = await hit(first.location);
      if (dest.status === 200) { ok += 1; continue; }
      problems.push([
        impressions,
        `${path}: 301 → ${first.location} which returned ${dest.status}` +
          (dest.status === 301 ? " (redirect chain)" : " (dead end)"),
      ]);
      continue;
    }

    if (first.status === 404) {
      /*
       * Not automatically wrong — Appendix C retires `/oceanprotocol` and
       * `/berachain` on purpose, and a genuine 404 is the correct answer for a
       * URL with no page behind it. It is reported anyway, with its
       * impressions, because "we meant to drop this" and "we forgot this
       * existed" look identical from here and only a human can tell them apart.
       */
      problems.push([impressions, `${path}: 404 — intended, or forgotten?`]);
      continue;
    }

    problems.push([impressions, `${path}: unexpected ${first.status}`]);
  }

  problems.sort((a, b) => b[0] - a[0]);
  const atRisk = problems.reduce((sum, [i]) => sum + i, 0);

  console.log(`  ${ok} resolve (200, or 301 → 200)\n`);
  if (problems.length === 0) {
    console.log("No problems. Every indexed URL has somewhere to land.");
    return;
  }
  console.log(`${problems.length} to review, holding ${atRisk} impressions:\n`);
  for (const [impressions, message] of problems) {
    console.log(`  ${String(impressions).padStart(6)}  ${message}`);
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
