/**
 * Human-readable copy for each data capability in `TOOL_DOMAINS`.
 *
 * WHY THIS IS SEPARATE FROM mcpTools.js
 *
 * `mcpTools.js` is reachable from the home page, which needs exactly one thing
 * from it: `CAPABILITY_COUNT`. Hanging 22 descriptions off the same object would
 * ship all of them to `/` to render a single integer, since the map cannot be
 * tree-shaken while the count reads its keys. Only `/mcp` imports this file.
 *
 * WHY THE COUNTS ARE ROUNDED
 *
 * Every figure below was measured against the live server on 14 Sep 2026, then
 * rounded down with a `+`. Exact counts drift — `get_tags` moved from 17,403 to
 * 17,407 in a single day — and a page that claims 17,403 is wrong by tomorrow.
 * Rounding down is the same convention `API_STATS` already uses ("1,000+ data
 * sources", "500k+ indexed items"): still concrete, still verifiable, and it
 * stays true as the corpus grows rather than decaying the moment it ships.
 *
 * Two of these needed care rather than arithmetic. The live totals for
 * exchanges and coin categories are exactly 150 and 750, so "150" (bare) would
 * be wrong the day the 151st lands, and "750+" asserts more than 750 and is
 * false today. Both round down to the previous step: 140+ and 700+. Rounding
 * down only works if you actually round down.
 *
 * Measured: exchanges 150 · dexes 748 · exploits 184 · yields 32,770 ·
 * stablecoins 426 · fees 2,199 · categories 750 · dev-activity 3,276 ·
 * tags 17,407 · events 6,337. Source-count claims (49 outlets, 133 blogs, 118
 * podcasts, 121 channels, 51 DAOs, 59 forums) match the approved copy in
 * `apiSurface.js` and are not restated differently here.
 */

/**
 * Domain slug -> what it gives you.
 *
 * Keys must match `TOOL_DOMAINS` exactly; `src/__tests__/mcp-tools.test.ts`
 * asserts it, so a newly filed capability fails CI until someone writes its
 * line rather than rendering as a blank card.
 */
export const CAPABILITY_COPY = {
  news: "Real-time news from 49 crypto outlets, tagged and deduped.",
  "news-summary": "An AI briefing over the whole news corpus, focusable by project.",
  blogs: "133 project blogs in one feed.",
  podcasts: "118 podcast feeds with their latest episodes.",
  videos: "121 YouTube channels, timestamped.",
  events: "6,000+ conferences, meetups, hackathons and side events.",
  dao: "Live Snapshot proposals across 51 DAOs.",
  forum: "59 governance forums behind one endpoint.",
  keywords: "What crypto is talking about, ranked, right now.",
  projects: "Search project-tagged content across the whole superfeed.",
  tags: "A 17,000+ tag taxonomy — projects, chains and categories, with parents and children.",
  "market-coins": "Prices, metadata, history and trending movers for the top coins.",
  "coin-categories": "700+ token categories with their sector aggregates.",
  "developer-activity": "3,000+ GitHub activity snapshots — commits and contributors per coin.",
  exchanges: "140+ centralized exchanges with trust scores and volume.",
  "onchain-dexes": "700+ DEXes with the chains and protocols behind them.",
  "security-exploits": "180+ on-chain exploits and hacks, each with a written incident record.",
  "tvl-fees": "2,000+ protocol fee and revenue records across DeFi.",
  "tvl-stablecoins": "400+ stablecoins — peg type, mechanism and circulating supply.",
  "tvl-yields": "32,000+ DeFi yield pools with base and reward APY, TVL and IL risk.",
  kasandra: "AI-detected chart patterns with a bullish/bearish signal and confidence score.",
  "fear-greed": "The fear & greed index, per asset.",
};

/**
 * Capabilities worth leading with.
 *
 * These are the ones no general crypto API exposes — a structured incident
 * database, per-coin developer activity, AI-detected chart patterns — and they
 * are also, not coincidentally, in the set the site has never advertised. They
 * are the reason this page counts capabilities rather than tools.
 */
export const HEADLINE_CAPABILITIES = [
  "security-exploits",
  "developer-activity",
  "kasandra",
  "tvl-yields",
];

/**
 * Display name for every domain. No fallback, and no CSS capitalisation.
 *
 * An earlier version derived most of these from the slug and leaned on
 * `first-letter:uppercase` for the capital. That worked only by accident of
 * layout: `::first-letter` does not apply to inline boxes, and it applied here
 * solely because the parent is a flex container, which blockifies its children.
 * Change that parent and fourteen labels silently render lowercase.
 *
 * Writing all 22 out costs nothing and removes the dependency. The keys are
 * CI-checked against TOOL_DOMAINS, so a new capability fails the build rather
 * than rendering untitled.
 */
export const CAPABILITY_LABELS = {
  news: "News",
  "news-summary": "News summary",
  blogs: "Blogs",
  podcasts: "Podcasts",
  videos: "Videos",
  events: "Events",
  dao: "DAO",
  forum: "Forum",
  keywords: "Keywords",
  projects: "Projects",
  tags: "Tags",
  "market-coins": "Market coins",
  "coin-categories": "Coin categories",
  "developer-activity": "Developer activity",
  exchanges: "Exchanges",
  "onchain-dexes": "On-chain DEXes",
  "security-exploits": "Security exploits",
  "tvl-fees": "TVL fees",
  "tvl-stablecoins": "TVL stablecoins",
  "tvl-yields": "TVL yields",
  kasandra: "Kasandra",
  "fear-greed": "Fear & greed",
};
