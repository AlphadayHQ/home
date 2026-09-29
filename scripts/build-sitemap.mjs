#!/usr/bin/env node
/**
 * Sitemap generation (§5.7, §4.4).
 *
 * Two properties this has to have, both of which the live site lacks:
 *
 *  1. **Same source as the pages.** The old sitemap was built from a list that
 *     drifted from the page set, so it published URLs that rendered 404s. This
 *     reads `/ui/landing-pages/` — the endpoint the routes themselves load.
 *  2. **Gated on the index-state field.** It imports `belongsInSitemap` from
 *     `src/seo/indexState.ts`, the *same module* the routes import to decide
 *     whether to emit `noindex`. Not a copy of the rule — the rule. Node strips
 *     the types on import, so there is one definition and it cannot disagree
 *     with itself.
 *
 * §4.4 also asks for a sitemap index split by content type so each tier is
 * separately measurable in Search Console. Two tiers exist today (static pages
 * and project dashboards); the structure is what matters, since the corpus is
 * expected to grow into it.
 */
import { resolve, dirname } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  belongsInSitemap,
  indexStateFor,
  projectIndexState,
  staticPaths,
} from "../src/seo/indexState.ts";
import { digestPaths } from "../src/data/digestEntities.js";
import { shapeRows } from "../src/data/eventRows.ts";
import {
  monthBounds,
  monthIndexState,
  monthOf,
  monthSlug,
  shiftMonth,
} from "../src/data/eventMonths.js";

const here = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(here, "../dist/client");
const baseUrl = "https://alphaday.com";

const API_BASE = process.env.API_BASE_URL ?? "https://api.alphaday.com";
// §5.10: no VITE_ prefix. A VITE_-prefixed value is inlined into the client
// bundle by Vite, which is how the app secret came to be published in public
// JavaScript. Read the unprefixed names, and fall back to the old ones only so
// a deploy mid-migration does not break.
const appId = process.env.API_APP_ID ?? process.env.VITE_X_APP_ID;
const appSecret = process.env.API_APP_SECRET ?? process.env.VITE_X_APP_SECRET;

// Optional, for the reason in src/server/landingPages.ts: /ui/landing-pages/
// answers anonymously, so a missing secret must not fail the build. The run
// still fails loudly if the fetch itself fails, which is the case that would
// otherwise produce a silently empty sitemap.
const authHeaders =
  appId && appSecret ? { "x-app-id": appId, "x-app-secret": appSecret } : {};

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (char) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]
  );

/**
 * Written by hand rather than through the `sitemaps` package, which emits
 * `link.lastmod || <build time>` — there is no way to express "no known
 * modification date" through it, and a `lastmod` that changes on every build
 * trains Google to ignore the field entirely (§4.4).
 */
function urlsetXml(links) {
  const body = links
    .map((link) => {
      const parts = [`\t\t<loc>${escapeXml(link.loc)}</loc>`];
      if (link.lastmod) parts.push(`\t\t<lastmod>${escapeXml(link.lastmod)}</lastmod>`);
      return `\t<url>\n${parts.join("\n")}\n\t</url>`;
    })
    .join("\n");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n</urlset>\n`
  );
}

function sitemapIndexXml(entries) {
  const body = entries
    .map((e) => `\t<sitemap>\n\t\t<loc>${escapeXml(e.loc)}</loc>\n\t</sitemap>`)
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n</sitemapindex>\n`
  );
}

function write(relativePath, xml) {
  const full = resolve(distPath, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, xml);
  return full;
}

async function fetchLandingPages() {
  const headers = authHeaders;
  const pages = [];
  let next = `${API_BASE}/ui/landing-pages/`;

  while (next) {
    const response = await fetch(next, { headers });
    if (!response.ok) {
      throw new Error(
        `build-sitemap: ${next} returned ${response.status}. Refusing to build ` +
          "a partial sitemap."
      );
    }
    const { results, links } = await response.json();
    pages.push(...(results ?? []));
    next = links?.next;
  }
  return pages;
}

/**
 * Read the record's own `updated_at`. If it is missing or unparseable, emit no
 * `lastmod` at all — an absent signal beats a false one.
 *
 * These come back clustered around 2026-06-08, which looks stale and is not.
 * A project page's *unique indexable text* — the About copy, the benefits, the
 * FAQ — lives on that record and genuinely has not changed since June. The live
 * feeds beside it are embedded data on a template every project shares, so
 * stamping the page as modified daily would claim a change Google would find
 * nothing behind, and spend crawl budget §4.4 already calls the binding
 * constraint. Leave it reporting what actually changed.
 */
function lastmodOf(record) {
  if (!record.updated_at) return undefined;
  const date = new Date(record.updated_at);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * The digest pages are the one tier where the reasoning above inverts, and they
 * were shipping with no `lastmod` at all.
 *
 * `/projects/{slug}/this-week` *is* its rolling window — there is no stable copy
 * underneath it, so the page genuinely differs from yesterday's. It is also the
 * tier whose entire value is recency, which makes an absent recrawl signal the
 * most expensive place on the site to have one.
 *
 * **Day granularity, not the build instant.** A timestamp that moves on every
 * build is the failure this file was written to avoid (see `urlsetXml`): it
 * trains Google to ignore the field, which would cost the tier the very signal
 * this is meant to give it. Truncating to the UTC day means two builds on the
 * same day emit an identical value, and the date advances only when the window
 * actually has.
 *
 * **Known bound.** This is stamped at build time on a statically served file, so
 * a week without a deploy leaves it a week behind while the pages keep rolling.
 * That under-reports freshness, which costs a slower recrawl — the safe
 * direction, and strictly better than the nothing it replaces. Serving the
 * sitemap from `server.mjs` would close it properly; that is a larger change
 * than this defect justifies.
 */
const rollingLastmod = () => `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

/**
 * The promoted month pages of the events calendar (content doc B4).
 *
 * These cannot come from `staticPaths()`: which months exist, and which carry
 * enough events to be worth submitting, are both facts about the API on the day
 * of the build. They are API-driven pages like the project dashboards, and they
 * go through the same gate — `monthIndexState` decides, and this file only ever
 * lists what it promotes.
 *
 * The walk runs forward from the current month and stops after three
 * consecutive empty months rather than at the first, because the corpus has
 * real gaps: July 2027 holds two events and August 2027 holds one, with
 * populated months on either side. Stopping at the first gap would silently
 * drop everything beyond it. `HORIZON_MONTHS` bounds the walk in case the
 * corpus ever runs long.
 */
const HORIZON_MONTHS = 24;
const EMPTY_RUN_LIMIT = 3;
const EVENT_PAGE_SIZE = 500;
const EVENT_MAX_PAGES = 6;

/**
 * A month's count as the *page* will report it, not as the API reports it.
 *
 * This used to read `?limit=1` and take the API's `total`, which is the raw row
 * count — before placeholders are dropped and before the duplicates the corpus
 * carries are collapsed. The route decides on the shaped count. A month holding
 * 21 raw rows and 19 real ones was therefore submitted in the sitemap and
 * served `noindex`: a borderline case, and exactly the kind of drift between
 * "what we publish" and "what we serve" that `indexState.ts` exists to stop.
 *
 * So it reads the rows and shapes them through `shapeRows`, the same function
 * `buildMonth` calls. Costlier — one request per month instead of one tiny one
 * — and it happens once per build.
 */
async function shapedCount(month) {
  const { from, to } = monthBounds(month);
  const rows = [];

  for (let page = 1; page <= EVENT_MAX_PAGES; page += 1) {
    const url =
      `${API_BASE}/items/events/?limit=${EVENT_PAGE_SIZE}&page=${page}` +
      `&starts_at__gte=${from}&starts_at__lte=${to}`;

    const response = await fetch(url, { headers: authHeaders });
    if (!response.ok) {
      throw new Error(
        `build-sitemap: ${url} returned ${response.status}. Refusing to build ` +
          "a partial sitemap."
      );
    }

    const body = await response.json();
    const results = body.results ?? [];
    rows.push(...results);
    if (results.length < EVENT_PAGE_SIZE || !body.links?.next) break;
  }

  return shapeRows(rows).length;
}

async function fetchEventMonths() {
  const current = monthOf(new Date());
  const promoted = [];
  let emptyRun = 0;

  for (let i = 0; i < HORIZON_MONTHS && emptyRun < EMPTY_RUN_LIMIT; i += 1) {
    const month = shiftMonth(current, i);
    const count = await shapedCount(month);

    if (count === 0) {
      emptyRun += 1;
      continue;
    }
    emptyRun = 0;

    // The current month lives at /events and is listed through STATIC_STATES;
    // listing it twice would submit the same content under two URLs, which is
    // what `canonicalForMonth` exists to prevent on the page itself.
    if (month === current) continue;
    if (monthIndexState(month, count, current) === "promoted") {
      promoted.push(`/events/${monthSlug(month)}`);
    }
  }

  return promoted;
}

async function main() {
  if (!existsSync(distPath)) mkdirSync(distPath, { recursive: true });

  // Static routes come from src/seo/indexState.ts, not from a list kept here.
  // This file used to hold its own copy of the paths, so adding a page meant
  // editing two files and forgetting the second one silently dropped the page
  // from the sitemap. Each path is still filtered through the same gate, so a
  // route that is not `promoted` cannot be listed either way.
  const rolling = new Set(digestPaths());
  const staticLinks = staticPaths()
    .filter((path) => belongsInSitemap(indexStateFor(path)))
    .map((path) => ({
      loc: path === "/" ? `${baseUrl}/` : `${baseUrl}${path}`,
      // Everything else in this tier is a genuinely static marketing or docs
      // page. No `lastmod` for those, for the same reason as above: this file
      // has no honest source for when they last changed, and inventing one is
      // worse than omitting it.
      lastmod: rolling.has(path) ? rollingLastmod() : undefined,
    }));

  const monthPaths = await fetchEventMonths();
  for (const path of monthPaths) {
    // No `lastmod`: a month page changes when the API gains an event, and this
    // build has no honest source for when that last happened. An absent signal
    // beats a false one (§4.4).
    staticLinks.push({ loc: `${baseUrl}${path}`, lastmod: undefined });
  }

  const pages = await fetchLandingPages();
  const projectLinks = pages
    .filter((record) => belongsInSitemap(projectIndexState(record)))
    .map((record) => ({
      // §3.1: project pages moved under /projects/. The old root-level URLs
      // 301 here, and only the destination is ever listed.
      loc: `${baseUrl}/projects/${record.slug}`,
      lastmod: lastmodOf(record),
    }));

  write("sitemaps/pages.xml", urlsetXml(staticLinks));
  write("sitemaps/projects.xml", urlsetXml(projectLinks));
  write(
    "sitemap.xml",
    sitemapIndexXml([
      { loc: `${baseUrl}/sitemaps/pages.xml` },
      { loc: `${baseUrl}/sitemaps/projects.xml` },
    ])
  );

  const excluded = pages.length - projectLinks.length;
  console.log(
    `build-sitemap: ${staticLinks.length} static (${monthPaths.length} event ` +
      `months) + ${projectLinks.length} project URLs across 2 tiers` +
      `, ${rolling.size} rolling lastmod` +
      (excluded ? `, ${excluded} excluded by index state` : "")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
