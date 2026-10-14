/**
 * Sitemap XML, shared by the build (`scripts/build-sitemap.mjs`) and the routes
 * that serve a sitemap live (`/sitemaps/posts.xml`). One writer, so a file built
 * at deploy and a file built on request cannot differ in shape.
 *
 * Node imports this directly under type stripping, so it imports nothing.
 */

export const SITE_URL = "https://alphaday.com";

export interface SitemapLink {
  loc: string;
  /** ISO 8601, or absent: no known modification date is better than a false one. */
  lastmod?: string;
}

const escapeXml = (value: string): string =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] ?? char
  );

/**
 * Written by hand rather than through the `sitemaps` package, which emits
 * `link.lastmod || <build time>` — there is no way to express "no known
 * modification date" through it, and a `lastmod` that changes on every build
 * trains Google to ignore the field entirely (§4.4).
 */
export function urlsetXml(links: SitemapLink[]): string {
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

export function sitemapIndexXml(entries: Array<{ loc: string }>): string {
  const body = entries
    .map((entry) => `\t<sitemap>\n\t\t<loc>${escapeXml(entry.loc)}</loc>\n\t</sitemap>`)
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n</sitemapindex>\n`
  );
}

/** The child sitemaps the index lists, in order. `posts.xml` is served live. */
export const SITEMAP_FILES = ["pages", "projects", "posts"].map(
  (name) => `${SITE_URL}/sitemaps/${name}.xml`
);
