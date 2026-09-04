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
} from "../src/seo/indexState.ts";

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

if (!appId || !appSecret) {
  throw new Error(
    "build-sitemap: missing API_APP_ID / API_APP_SECRET — cannot fetch landing " +
      "pages. Refusing to build a sitemap without them, because a silently " +
      "empty sitemap is worse than a failed build."
  );
}

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
  const headers = { "x-app-id": appId, "x-app-secret": appSecret };
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
 */
function lastmodOf(record) {
  if (!record.updated_at) return undefined;
  const date = new Date(record.updated_at);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Static routes, filtered through the same gate as everything else. A route
// that is not `promoted` in src/seo/indexState.ts cannot appear here, no matter
// what this list says.
const STATIC_PATHS = ["/", "/api", "/api/docs", "/dashboards", "/mobile", "/privacy"];

async function main() {
  if (!existsSync(distPath)) mkdirSync(distPath, { recursive: true });

  const staticLinks = STATIC_PATHS.filter((path) =>
    belongsInSitemap(indexStateFor(path))
  ).map((path) => ({ loc: path === "/" ? `${baseUrl}/` : `${baseUrl}${path}` }));

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
    `build-sitemap: ${staticLinks.length} static + ${projectLinks.length} project ` +
      `URLs across 2 tiers` +
      (excluded ? `, ${excluded} excluded by index state` : "")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
