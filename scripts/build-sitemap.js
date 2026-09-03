const { resolve } = require("path");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const fetch = require("node-fetch");

// path to app build directory
const distPath = resolve(__dirname, "../dist");
const outputName = "sitemap.xml";
const outputPath = `${distPath}/${outputName}`;

// ensure the build directory exists
// so we can run this script independent of the build.
if (!existsSync(distPath)) {
  mkdirSync(distPath);
}

const baseUrl = "https://alphaday.com";

// /ui/views/ is the app's board list — it contains boards that have no landing
// page on this domain (oceanprotocol among them), so building from it published
// URLs that render a 404. /ui/landing-pages/ is the set that actually exists
// here, which makes it the only correct source: a page is in the sitemap
// because it has a record, not because someone remembered to keep two lists
// in sync.
const landingPagesRequestUrl = "https://api.alphaday.com/ui/landing-pages/";

const appId = process.env.VITE_X_APP_ID;
const appSecret = process.env.VITE_X_APP_SECRET;

if (!appId || !appSecret) {
  throw new Error(
    "build-sitemap: missing VITE_X_APP_ID / VITE_X_APP_SECRET env vars — " +
      "cannot fetch landing pages. Refusing to build a sitemap without them."
  );
}

// The `sitemaps` package emits `link.lastmod || <build time>`, so there is no
// way to express "this URL has no known modification date" through it — the
// build timestamp is always substituted. Writing the XML here is a dozen lines
// and makes an absent lastmod actually absent.
const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });

function writeSitemap(filePath, links) {
  const body = links
    .map((link) => {
      const parts = [`\t\t<loc>${escapeXml(link.loc)}</loc>`];
      if (link.lastmod) parts.push(`\t\t<lastmod>${escapeXml(link.lastmod)}</lastmod>`);
      if (link.changefreq)
        parts.push(`\t\t<changefreq>${escapeXml(link.changefreq)}</changefreq>`);
      if (link.priority)
        parts.push(`\t\t<priority>${escapeXml(link.priority)}</priority>`);
      return `\t<url>\n${parts.join("\n")}\n\t</url>`;
    })
    .join("\n");

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    "</urlset>\n";

  writeFileSync(filePath, xml);
  return xml;
}

// function to fetch all pages from the API looping through paginated results
async function fetchLandingPages(url) {
  const headers = {
    "x-app-id": appId,
    "x-app-secret": appSecret,
  };
  const response = await fetch(url, { headers: headers });
  if (!response.ok) {
    throw new Error(
      `build-sitemap: ${url} returned ${response.status}. Refusing to build a ` +
        "sitemap from an incomplete response."
    );
  }
  const { results, links } = await response.json();
  let next = links?.next;
  let pages = [...(results || [])];
  while (next) {
    const response = await fetch(next, { headers: headers });
    if (!response.ok) {
      throw new Error(
        `build-sitemap: pagination request ${next} returned ${response.status}. ` +
          "Refusing to build a partial sitemap."
      );
    }
    const { results, links } = await response.json();
    next = links?.next;
    pages = [...pages, ...(results || [])];
  }
  return pages;
}

// Using the build timestamp as lastmod tells Google every page changed on
// every deploy, which trains it to ignore the field entirely. Read the
// record's own `updated_at`; if it is missing or unparseable, emit no lastmod
// at all — an absent signal is better than a false one.
//
// Verified contract of /ui/landing-pages/: { slug, name, is_published, updated_at }.
function lastmodOf(record) {
  const value = record.updated_at;
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Static routes are only listed here if App.jsx actually serves them. Adding a
// URL the SPA does not recognise publishes a soft 404.
const static_links = [
  {
    // Trailing slash to match canonicalFor("/") in src/utils/canonical.js.
    // Equivalent under RFC 3986 and Google normalises it, but this script is
    // CJS and cannot import that helper, so the two only agree by hand.
    loc: `${baseUrl}/`,
    priority: "1.00",
    changefreq: "monthly",
  },
  {
    // The former home page. Carries the "crypto dashboards" search intent that
    // / no longer targets since it was repositioned to the data layer.
    loc: `${baseUrl}/dashboards`,
    priority: "0.90",
    changefreq: "monthly",
  },
  {
    // The primary conversion target for the API/MCP audience.
    loc: `${baseUrl}/api`,
    priority: "0.90",
    changefreq: "weekly",
  },
  {
    loc: `${baseUrl}/api/docs`,
    priority: "0.80",
    changefreq: "weekly",
  },
  {
    loc: `${baseUrl}/mobile`,
    priority: "0.60",
    changefreq: "monthly",
  },
  {
    loc: `${baseUrl}/privacy`,
    priority: "0.30",
    changefreq: "yearly",
  },
];

// `/blog` is deliberately absent: it is a client-side redirect to Substack, not
// a page on this domain. Listing it asks Google to index a URL whose only
// content is a redirect it cannot see without running JS.

fetchLandingPages(landingPagesRequestUrl)
  .then((pages) => {
    if (!pages.length) {
      throw new Error(
        "build-sitemap: landing-page fetch returned 0 results — check API " +
          "credentials and endpoint. Refusing to build a sitemap with no " +
          "landing pages."
      );
    }

    // SEO landing pages live on this domain at alphaday.com/{slug}.
    // The live dashboards at app.alphaday.com/b/{slug} are a different host
    // and must not be listed here — they belong in app.alphaday.com's own sitemap.
    const landing_links = pages
      // `is_published` gates whether the page renders at all. An unpublished
      // slug in the sitemap is a soft 404 submitted to Google on purpose.
      .filter((page) => page.slug && page.is_published)
      .map((page) => {
        const lastmod = lastmodOf(page);
        return {
          loc: `${baseUrl}/${page.slug}`,
          priority: "0.70",
          changefreq: "weekly",
          ...(lastmod ? { lastmod } : {}),
        };
      });

    const skipped = pages.length - landing_links.length;
    if (skipped) {
      console.warn(
        `build-sitemap: ${skipped} landing-page record(s) skipped as ` +
          "unpublished or slug-less."
      );
    }

    const links = [...static_links, ...landing_links];
    writeSitemap(outputPath, links);
    console.log(
      `build-sitemap: wrote ${links.length} URLs ` +
        `(${static_links.length} static, ${landing_links.length} landing) to ${outputPath}`
    );

    const withoutLastmod = landing_links.filter((l) => !l.lastmod).length;
    if (withoutLastmod) {
      console.warn(
        `build-sitemap: ${withoutLastmod} landing page(s) had no usable ` +
          "`updated_at` and were emitted without a lastmod."
      );
    }
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
