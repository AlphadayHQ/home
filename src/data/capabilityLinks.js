/**
 * Where a REST path, an MCP tool or a recipe points on this site: the
 * capability page at `/api/data/{slug}` for the dataset it reaches.
 *
 * The docs, the cookbook and the capability pages each name the same datasets
 * three ways — `/items/dao/`, `get_dao`, `dao` — and until this module none of
 * them linked to the others. A reader on `/api/docs` looking at `/items/dao/`
 * had no way to the page that says `?active=true` returns nothing; a recipe
 * listed `/items/dao/` as a plain chip.
 *
 * WHY THIS IS NOT `capabilityPages.js`
 *
 * Same reason that file gives for not being imported by /api: it is ~70 KB of
 * payloads and prose, and the docs and recipe pages need a slug, not the page.
 * This module reads the two light ones only.
 */
import { TOOL_DOMAINS } from "./mcpTools.js";
import { HEADLINE_CAPABILITIES } from "./mcpCapabilities.js";

/**
 * Each capability's REST path, as its page's own `curl` calls it. A path
 * belongs to the longest of these it starts with, so `/items/news/summary/` is
 * the summary and `/items/news/trending/` is news. `capability-pages.test.ts`
 * checks every page's `curl` resolves to that page, so this cannot drift from
 * the calls the pages print.
 */
export const CAPABILITY_ENDPOINTS = {
  news: "/items/news/",
  "news-summary": "/items/news/summary/",
  forum: "/items/forum/",
  videos: "/items/videos/",
  podcasts: "/items/podcasts/",
  blogs: "/items/blogs/",
  "security-exploits": "/security/exploits/",
  "developer-activity": "/coins/developer-activity/",
  "tvl-yields": "/tvl/yields/",
  kasandra: "/kasandra/patterns/",
  "market-coins": "/market/coins/",
  "coin-categories": "/coins/categories/",
  exchanges: "/exchanges/",
  "onchain-dexes": "/onchain-dexes/",
  "tvl-fees": "/tvl/fees/",
  "tvl-stablecoins": "/tvl/stablecoins/",
  dao: "/items/dao/",
  events: "/items/events/",
  tags: "/tags/",
  keywords: "/keywords/",
  projects: "/search/",
  "fear-greed": "/market/fear-greed/",
};

const hasPage = (slug) => HEADLINE_CAPABILITIES.includes(slug);

export const capabilityPagePath = (slug) => `/api/data/${slug}`;

/** The capability a REST path reaches, or null. The query string is ignored. */
export function capabilityForPath(path) {
  const bare = path.split("?")[0];
  let best = null;
  for (const [slug, base] of Object.entries(CAPABILITY_ENDPOINTS)) {
    if (bare.startsWith(base) && (!best || base.length > CAPABILITY_ENDPOINTS[best].length)) {
      best = slug;
    }
  }
  return best && hasPage(best) ? best : null;
}

/** The capability an MCP tool reaches, or null for a tool with no page. */
export function capabilityForTool(name) {
  const slug = Object.keys(TOOL_DOMAINS).find((key) => TOOL_DOMAINS[key].includes(name));
  return slug && hasPage(slug) ? slug : null;
}

/** A recipe's `uses` entry is a REST path or a tool name; this reads either. */
export const capabilityFor = (use) =>
  use.startsWith("/") ? capabilityForPath(use) : capabilityForTool(use);

/**
 * Each recipe's slug, title and calls: the one place they are written.
 *
 * `cookbook.js` holds the full recipes — every step's code and output, ~11 KB
 * gzipped — and spreads each entry here into its recipe. A capability page
 * needs only a title to link to a recipe, so it reads this and never loads the
 * cookbook. A new recipe starts here; `cookbook.js` throws on a slug that does
 * not.
 */
export const RECIPE_INDEX = [
  {
    slug: "claude-crypto-news",
    title: "Give Claude live crypto news",
    uses: ["get_news_summary", "get_trending_news"],
  },
  {
    slug: "dao-proposal-alerts",
    title: "Alert on DAO proposals closing soon",
    uses: ["/items/dao/"],
  },
  {
    slug: "crypto-research-agent",
    title: "Build a crypto research agent",
    uses: ["/keywords/trending/", "/items/news/", "/items/blogs/", "/items/podcasts/", "/items/dao/"],
  },
  {
    slug: "discord-bot-crypto-data",
    title: "Crypto data for a Discord bot",
    uses: ["/items/news/trending/", "/items/news/"],
  },
  {
    slug: "weekly-ecosystem-digest",
    title: "Automate a weekly ecosystem digest",
    uses: ["/items/news/summary/", "/items/news/", "/items/dao/"],
  },
  {
    slug: "sentiment-from-podcasts",
    title: "Analyse crypto podcasts programmatically",
    uses: ["/items/podcasts/", "/items/news/"],
  },
];

/** The recipes that call a capability, in cookbook order. */
export const recipesUsing = (slug) =>
  RECIPE_INDEX.filter((recipe) => recipe.uses.some((use) => capabilityFor(use) === slug));
