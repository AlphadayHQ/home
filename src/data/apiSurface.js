/**
 * Single source of truth for the public API surface.
 *
 * The home page shows a condensed view (6 tools, the stat band) and /api shows
 * the full one. Both read from here so the counts can never drift apart.
 *
 * Verified against the live API on 8 Sep 2026 (Appendix B finding 22). Every
 * command below was previously broken, in two different ways:
 *
 *  - `/news` and `/news/trending` returned 404 outright — the collections live
 *    under `/items/`.
 *  - `/search` and `/get-started` returned 301, because the API requires a
 *    trailing slash. Pasted verbatim into a terminal those printed nothing at
 *    all, which reads as "the API is broken" rather than "the URL is wrong".
 *
 * That distinction is why the trailing slash is not cosmetic here, and why
 * `src/__tests__/api-surface.test.js` asserts it. This is the page CLAUDE.md
 * names as the primary conversion target for audience one, and a model reading
 * it copies whatever it finds.
 *
 * `/search/`, `/get-started/` and `/mcp` are live but absent from the generated
 * OpenAPI spec, so the test allowlists them rather than treating them as typos.
 */

export const API_STATS = [
  { num: "1,000+", label: "Data sources" },
  { num: "500k+", label: "Indexed items" },
  // Copy decision, deliberately left alone: the live MCP server advertises 57
  // tools (src/api/mcp-tools.generated.json), not 12. Twelve is the curated
  // showcase in API_TOOLS below. If "at launch" is meant literally this
  // undersells the layer by 45 tools to the one audience that counts them —
  // but it is a claim about the product, not a broken string, so it needs an
  // owner's decision rather than a silent edit.
  { num: "12", label: "Tools at launch" },
];

export const API_COMMANDS = {
  search: "curl https://api.alphaday.com/search/?project=arbitrum",
  news: "curl https://api.alphaday.com/items/news/?tags=arbitrum",
  trending: "curl https://api.alphaday.com/items/news/trending/?limit=3",
  getStarted: "curl https://api.alphaday.com/get-started/",
  mcpUrl: "https://api.alphaday.com/mcp",
  mcporter: "mcporter config add alphaday --url https://api.alphaday.com/mcp",
};

export const API_TOOLS = [
  { name: "get_news", desc: "Real-time news from 49 crypto outlets" },
  { name: "get_trending_news", desc: "What the crypto media is buzzing about" },
  { name: "get_news_summary", desc: "AI-generated daily crypto briefing" },
  { name: "get_blogs", desc: "133 project blogs, one feed" },
  { name: "get_podcasts", desc: "118 podcast feeds, latest episodes" },
  { name: "get_videos", desc: "121 YouTube channels, timestamped" },
  { name: "get_events", desc: "Conferences, meetups, side events" },
  { name: "get_dao", desc: "Live Snapshot votes across 51 DAOs" },
  { name: "get_forum", desc: "59 governance forums, one endpoint" },
  {
    name: "get_trending_keywords",
    desc: "What crypto is talking about, right now",
  },
  { name: "search_projects", desc: "Discover tags for any project" },
  { name: "get_market_coins", desc: "Prices and metadata for the top 100 coins" },
];

/** The six tools surfaced on the home page, in the approved order. */
const HOME_TOOL_NAMES = [
  "get_news",
  "get_podcasts",
  "get_dao",
  "get_trending_keywords",
  "get_videos",
  "get_market_coins",
];

export const HOME_TOOLS = HOME_TOOL_NAMES.map((name) =>
  API_TOOLS.find((tool) => tool.name === name),
);

export const TOOL_COUNT = API_TOOLS.length;
