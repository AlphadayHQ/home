const buildSitemap = require("sitemaps");
const { resolve } = require("path");
const { existsSync, mkdirSync } = require("fs");
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
const boardsRequestUrl = "https://api.alphaday.com/ui/views/";

const appId = process.env.VITE_X_APP_ID;
const appSecret = process.env.VITE_X_APP_SECRET;

if (!appId || !appSecret) {
  throw new Error(
    "build-sitemap: missing VITE_X_APP_ID / VITE_X_APP_SECRET env vars — " +
      "cannot fetch boards. Refusing to build a sitemap without landing pages."
  );
}

// function to fetch all pages from the API looping through paginated results
async function fetchBoards(url) {
  const headers = {
    "x-app-id": appId,
    "x-app-secret": appSecret,
  };
  const response = await fetch(url, { headers: headers });
  const { results, links } = await response.json();
  let next = links?.next;
  let boards = [...(results || [])];
  while (next) {
    const response = await fetch(next, { headers: headers });
    const { results, links } = await response.json();
    next = links?.next;
    boards = [...boards, ...(results || [])];
  }
  return boards;
}

const static_links = [
  {
    loc: baseUrl,
    priority: "1.00",
    changefreq: "monthly",
  },
  {
    loc: `${baseUrl}/blog`,
    priority: "0.80",
    changefreq: "weekly",
  },
];

// call fetchBoards to get all boards synchronously
fetchBoards(boardsRequestUrl).then((boards) => {
  if (!boards.length) {
    throw new Error(
      "build-sitemap: board fetch returned 0 results — check API credentials " +
        "and endpoint. Refusing to build a sitemap with no landing pages."
    );
  }

  // SEO landing pages live on this domain at alphaday.com/{slug}.
  // The live dashboards at app.alphaday.com/b/{slug} are a different host
  // and must not be listed here — they belong in app.alphaday.com's own sitemap.
  const landing_links = boards.map((board) => {
    return {
      loc: `${baseUrl}/${board.slug}`,
      priority: "0.70",
      changefreq: "weekly",
    };
  });

  /**
   * Generate a sitemap.xml file for the app.
   *
   * Build the sitemap from the static links plus one landing page per board.
   */
  buildSitemap(outputPath, [...static_links, ...landing_links]);
}).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
