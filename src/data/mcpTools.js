/**
 * The MCP tool surface, filed into data capabilities.
 *
 * The site used to claim "12 tools at launch" while the live server exposed 57.
 * `apiSurface.js` flagged that as an owner's decision rather than a typo, and
 * the decision was: publish **capabilities**, not raw tool count. A caller sees
 * 57 entries in `tools/list`, but `get_news` and `get_news_detail` are one
 * dataset with two access shapes, and counting them as two capabilities is
 * padding that this audience notices immediately.
 *
 * WHAT IS AUTHORED AND WHAT IS DERIVED
 *
 * The domain boundaries below are authored. Three of them are genuine judgement
 * calls and are marked inline. The counts are then derived from this map — not
 * from the live tool list.
 *
 * THE CONTRACT THAT FOLLOWS FROM THAT
 *
 * **A new tool on the server does not move these numbers. It breaks the build
 * until someone files it.** `MCP_TOOL_COUNT` sums the map below, so a tool the
 * map has never heard of leaves it unchanged while
 * `src/__tests__/mcp-tools.test.ts` fails with the tool's name and what to do
 * about it.
 *
 * That is the deliberate trade: a loud failure instead of a silent miscount.
 * The alternative — deriving straight from `tools/list` — would keep the number
 * correct by arithmetic while quietly counting `get_tvl_yields_top` as a
 * capability, which is the exact failure this file was written to end.
 *
 * The cost is a standing obligation: **whoever adds a tool to the MCP server
 * must file it here in the same release**, or CI goes red. Roughly one tool
 * every two months.
 *
 * WHY THE MAP IS A POSITIVE ENUMERATION
 *
 * The obvious alternative is a rule: "anything ending `_detail` is a sibling."
 * That was tried and it fails silently, because a tool only has to *not* match
 * the sibling patterns to be counted as a whole capability — which is how
 * `get_latest_videos`, `get_news_last_24_hours` and `get_tvl_yields_top` were
 * once counted as capabilities in their own right. A negative rule cannot catch
 * a plausible-looking name.
 *
 * Membership here is asserted instead, following the allowlist idiom in
 * `api-surface.test.js`. A tool the server exposes and this map does not claim
 * fails CI (`src/__tests__/mcp-tools.test.ts`), so filing a new tool is a
 * deliberate act rather than an inference.
 *
 * WHY THIS FILE DOES NOT IMPORT THE GENERATED TOOL LIST
 *
 * `mcp-tools.generated.json` is 73 KB and this module is reachable from the home
 * page. Importing it would put the entire tool list, descriptions and JSON
 * schemas into the client bundle to compute two integers — against §2.6, which
 * makes page weight the dominant cost lever. The map below is the small half;
 * the test imports the generated file and asserts the two agree, and tests are
 * not bundled.
 */

/**
 * Data capability -> the tools that access it.
 *
 * A capability is a distinct dataset. Filtered and ranked views of one dataset
 * (`_detail`, `trending`, `_top`, `_history`, `_last_24_hours`, `_this_week`)
 * are tools, not capabilities.
 */
export const TOOL_DOMAINS = {
  news: [
    "get_news",
    "get_news_detail",
    "get_trending_news",
    "get_news_last_24_hours",
  ],
  /*
   * Judgement call 1 of 3: an AI-derived product is its own capability.
   *
   * `get_news_summary` is a briefing generated over the news corpus, and
   * `get_kasandra_patterns` is pattern detection over market history. Neither
   * can be reconstructed from the dataset it reads, so both are capabilities in
   * their own right. Folding both back into their base datasets gives 20.
   */
  "news-summary": ["get_news_summary"],
  blogs: ["get_blogs", "get_blogs_detail", "get_trending_blogs"],
  podcasts: ["get_podcasts", "get_podcasts_detail", "get_trending_podcasts"],
  videos: [
    "get_videos",
    "get_videos_detail",
    "get_trending_videos",
    "get_latest_videos",
  ],
  events: [
    "get_events",
    "get_events_detail",
    "get_trending_events",
    "get_events_this_week",
  ],
  dao: ["get_dao", "get_dao_detail", "get_trending_dao"],
  forum: ["get_forum", "get_forum_detail", "get_trending_forum"],
  keywords: ["get_trending_keywords", "get_trending_keywords_detail"],
  /*
   * Judgement call 2 of 3: `projects` and `tags` are separate datasets.
   *
   * They look like one capability and are not. `search_projects` searches
   * project-tagged *content* across the superfeed; `get_tags` browses the *tag
   * taxonomy* — projects, chains and categories, with parent/child structure.
   * Different data, different use. Folding them gives 21.
   */
  projects: ["search_projects"],
  tags: ["get_tags", "get_tags_detail"],
  "market-coins": [
    "get_market_coins",
    "get_market_coins_detail",
    "get_market_coins_history",
    "get_market_trending",
    "get_market_trending_detail",
  ],
  "coin-categories": ["get_coin_categories", "get_coin_categories_detail"],
  "developer-activity": [
    "get_developer_activity",
    "get_developer_activity_detail",
  ],
  exchanges: ["get_exchanges", "get_exchanges_detail"],
  "onchain-dexes": ["get_onchain_dexes", "get_onchain_dexes_detail"],
  "security-exploits": [
    "get_security_exploits",
    "get_security_exploits_detail",
  ],
  /*
   * Judgement call 3 of 3: TVL is three capabilities, not one.
   *
   * Fees, stablecoins and yields share a URL prefix and nothing else — three
   * datasets with different shapes, which DefiLlama also treats separately.
   * Counting TVL as a single capability gives 20.
   *
   * Note for anyone planning content on these: they are reachable over MCP but
   * `/tvl/*` returns 401 over REST with app credentials, so they cannot be
   * demonstrated with a `curl` command the way the other domains can.
   */
  "tvl-fees": ["get_tvl_fees", "get_tvl_fees_detail", "get_tvl_fees_top"],
  "tvl-stablecoins": ["get_tvl_stablecoins", "get_tvl_stablecoins_detail"],
  "tvl-yields": ["get_tvl_yields", "get_tvl_yields_detail", "get_tvl_yields_top"],
  kasandra: ["get_kasandra_patterns"],
  "fear-greed": ["get_fear_greed_index"],
};

/**
 * Tools that are not a data capability.
 *
 * `get_server_instructions` is protocol handshake — "always call first".
 *
 * `get_events_subscriptions` is user-scoped, and its own description says it
 * "returns an empty list for unauthenticated requests". On a server whose pitch
 * is *no signup*, it returns nothing to the audience these pages are written
 * for, so advertising it as a capability would be actively misleading.
 */
export const PLUMBING_TOOLS = [
  "get_server_instructions",
  "get_events_subscriptions",
];

/** Distinct datasets reachable through the MCP server. The published number. */
export const CAPABILITY_COUNT = Object.keys(TOOL_DOMAINS).length;

/** Every tool this map accounts for. CI asserts it equals the live count. */
export const MCP_TOOL_COUNT =
  Object.values(TOOL_DOMAINS).reduce((total, tools) => total + tools.length, 0) +
  PLUMBING_TOOLS.length;

/**
 * Domains none of `toolNames` reaches — the capabilities a given surface leaves
 * unadvertised.
 *
 * Takes the names rather than importing `apiSurface.js`, which imports this
 * module. The caller passes what it shows; this reports what it is missing.
 */
export function domainsNotCovering(toolNames) {
  const shown = new Set(toolNames);
  return Object.entries(TOOL_DOMAINS)
    .filter(([, tools]) => !tools.some((tool) => shown.has(tool)))
    .map(([domain]) => domain);
}
