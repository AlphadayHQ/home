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

import { CAPABILITY_COUNT, MCP_TOOL_COUNT } from "./mcpTools";

/*
 * Re-exported because this file calls itself the single source of truth for the
 * public API surface, and a component reaching past it to mcpTools.js for one
 * of the two numbers it renders makes that false. Components import the surface;
 * the surface decides where its numbers come from.
 */
export { CAPABILITY_COUNT };

export const API_STATS = [
  { num: "1,000+", label: "Data sources" },
  /*
   * "500k+" was last verified on 8 Sep and measured 478,206 — it was already
   * understating then. Measured corpus-wide on 18 Sep: news 444,175 + forum
   * 62,402 + videos 34,569 + podcasts 22,772 + blogs 19,016 + dao 6,603 +
   * events 6,542 = 596,079. `500k+` understated the corpus by ~19%.
   *
   * The same `rounded down + 1` convention the rest of the stat band uses —
   * `500k+` was the previous bound, 590k+ is the next sensible one above the
   * measured 596,079. The figure stays true as the corpus grows rather than
   * decaying the morning after the build ships.
   */
  { num: "590k+", label: "Indexed items" },
  /*
   * Was a hardcoded "12 Tools at launch" while the live server exposed 57. The
   * note here used to say that undersold the layer by 45 tools to the one
   * audience that counts them, and that changing it needed an owner's decision
   * rather than a silent edit. That decision was taken: publish capabilities.
   *
   * "12" was never just this stat - TOOL_COUNT rendered it as "12 tools" in
   * four more places, so the page understated itself in prose as well.
   *
   * Both numbers now derive from src/data/mcpTools.js, which is CI-checked
   * against the live tool list. Note what that does and does not buy: a new
   * tool on the server does NOT move these numbers on its own, it fails the
   * build until someone files it. See the contract in mcpTools.js.
   *
   * The label changed because it now counts a different thing - capabilities,
   * not tools - and "at launch" was never true of either.
   */
  { num: String(CAPABILITY_COUNT), label: "Data capabilities" },
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
  { name: "get_news", desc: "Real-time news from 49 crypto outlets — 440,000+ articles" },
  { name: "get_trending_news", desc: "What the crypto media is buzzing about" },
  { name: "get_news_summary", desc: "AI-generated daily crypto briefing" },
  { name: "get_blogs", desc: "133 project blogs — 19,000+ posts" },
  { name: "get_podcasts", desc: "118 podcast feeds — 22,000+ episodes" },
  { name: "get_videos", desc: "121 YouTube channels — 34,000+ videos" },
  { name: "get_events", desc: "Conferences, meetups, side events" },
  { name: "get_dao", desc: "Live Snapshot votes across 51 DAOs" },
  { name: "get_forum", desc: "59 governance forums — 60,000+ posts" },
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

/**
 * The live MCP tool count, rendered as "{n} tools" on the home page and /api.
 *
 * Deliberately NOT `API_TOOLS.length`. API_TOOLS is a twelve-tool showcase -
 * how many cards to draw - and using its length as the public tool count meant
 * every "all 12 tools" on the site was wrong by 45.
 */
export const TOOL_COUNT = MCP_TOOL_COUNT;

