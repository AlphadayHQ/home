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
const appUrl = "https://app.alphaday.com";
const boardsRequestUrl = "https://api.alphaday.com/ui/views/";

// function to fetch all pages from the API looping through paginated results
async function fetchBoards(url) {
  const response = await fetch(url);
  const { results, links } = await response.json();
  let next = links?.next;
  let boards = [...(results || [])];
  while (next) {
    const response = await fetch(next);
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
  {
    loc: appUrl,
    priority: "1.00",
    changefreq: "weekly",
  },
  {
    loc: `${appUrl}/calendar`,
    priority: "0.40",
    changefreq: "weekly",
  },
];

// call fetchBoards to get all boards synchronously
fetchBoards(boardsRequestUrl).then((boards) => {
  const board_links = boards.map((board) => {
    return {
      loc: `${appUrl}/b/${board.slug}`,
      priority: "0.60",
      changefreq: "weekly",
    };
  });

  /**
   * Generate a sitemap.xml file for the app.
   *
   * Build the sitemap by adding the links and partner links to the sitemap
   */
  buildSitemap(outputPath, [...static_links, ...board_links]);
});
