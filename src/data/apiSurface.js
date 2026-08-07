/**
 * Single source of truth for the public API surface.
 *
 * The home page shows a condensed view (6 tools, the stat band) and /api shows
 * the full one. Both read from here so the counts can never drift apart.
 *
 * !! PENDING API-TEAM SIGN-OFF !!
 * The commands in API_COMMANDS below do not match the live OpenAPI spec
 * (src/api/docs-spec.generated.js): the real paths are /items/news/trending/,
 * /items/dao/ etc., and there is no /search endpoint or /mcp path in the spec.
 * These strings are the approved launch copy — confirm them against the real
 * API before launch. Fixing them here fixes them on every page at once.
 */

export const API_STATS = [
  { num: "1,000+", label: "Data sources" },
  { num: "500k+", label: "Indexed items" },
  { num: "12", label: "Tools at launch" },
];

export const API_COMMANDS = {
  search: "curl https://api.alphaday.com/search?project=arbitrum",
  news: "curl https://api.alphaday.com/news?tags=arbitrum",
  trending: "curl https://api.alphaday.com/news/trending?limit=3",
  getStarted: "curl https://api.alphaday.com/get-started",
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
  { name: "get_market_coin", desc: "Prices and metadata for the top 100 coins" },
];

/** The six tools surfaced on the home page, in the approved order. */
const HOME_TOOL_NAMES = [
  "get_news",
  "get_podcasts",
  "get_dao",
  "get_trending_keywords",
  "get_videos",
  "get_market_coin",
];

export const HOME_TOOLS = HOME_TOOL_NAMES.map((name) =>
  API_TOOLS.find((tool) => tool.name === name),
);

export const TOOL_COUNT = API_TOOLS.length;
