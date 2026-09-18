/**
 * Per-capability page content for `/api/data/{slug}`.
 *
 * Heavy by design. Each entry is a structured record the capability page
 * renders as seven sections (hero → worked example); the route does not
 * compose prose itself, it just lays the record out. The page set is
 * `HEADLINE_CAPABILITIES` from `mcpCapabilities.js` — the four slugs that
 * earn their own page by being absent from every incumbent crypto API.
 *
 * WHY THIS FILE IS NOT IMPORTED BY /api
 *
 * The home page and `/api` read `mcpCapabilities.js` for `CAPABILITY_COUNT`
 * and a few one-line descriptions; they never need the multi-section copy
 * below. Importing this module from `/api` would pull ~10 KB of payloads,
 * field lists and known-limit prose into a route that displays none of it,
 * because the import graph is not tree-shakable per field. The capability
 * route imports this file; everything else reads the lighter `mcpCapabilities.js`.
 * `src/__tests__/mcp-tools.test.ts` already CI-asserts the route count
 * against `HEADLINE_CAPABILITIES`, so an orphan page in this file fails the
 * build rather than rendering as a blank card.
 *
 * EVERY FIELD IS MEASURED
 *
 * Figures, payloads, gotchas and field coverage here were re-measured
 * corpus-wide on 18 Sep 2026. The plan (§4) says do not carry a number from
 * another file without re-measuring, and not to write a payload you did not
 * receive. Both halves are checked by `src/__tests__/capability-pages.test.ts`:
 * payloads must round-trip through JSON, and figures must be present in a
 * fixed list of the values the live server returned the day this shipped.
 *
 * VERIFIED ON
 *
 * A single date stamp travels with every page so a reader can judge the
 * staleness of every figure on the page at once. Re-measure on the schedule
 * in `mcpCapabilities.js`'s header.
 */
export const CAPABILITY_PAGES_VERIFIED_ON = "2026-09-18";

const API_BASE = "https://api.alphaday.com";

export const CAPABILITY_PAGES = {
  "security-exploits": {
    slug: "security-exploits",
    title: "Security exploits",
    blurb:
      "A structured incident database of on-chain exploits and hacks, with a written record of what happened on every entry.",
    heroFigure: {
      big: "190",
      suffix: "incident records",
      /*
       * Plan §4.1: every record carries a real incident write-up — not a
       * headline, a description. No incumbent crypto data API exposes that,
       * so the lead-with figure is the 100% coverage, not the headline count.
       */
      note:
        "Every record carries a written incident description (100% coverage). 78% carry an attack type, 14% a loss figure, 2% a chain. The page does not quote a loss total or a chain breakdown — the backfill has not kept pace with the corpus it is backfilling.",
    },
    recordShape: [
      "id",
      "hash",
      "title",
      "url",
      "short_description",
      "description",
      "protocol",
      "amount_usd",
      "chain",
      "attack_type",
      "date",
      "source",
      "tags",
    ],
    samplePayload: `{
  "id": 119,
  "hash": "81a2bf2ed34bd2844369da6ba9371e4b",
  "title": "Wanchain bridge on Cardano exploited for more than $9 million",
  "url": "https://web3isgoinggreat.com/single/cardano-midnight-bridge-exploit",
  "short_description": "The Wanchain bridge on Cardano was exploited, resulting in losses exceeding $9 million. This attack highlights vulnerabilities in cross-chain protocols and raises concerns for users relying on such bridges.",
  "description": "On July 22, 2026, the Wanchain bridge operating on the Cardano blockchain was exploited by attackers. The incident involved a security breach that allowed hackers to drain funds from the bridge. Wanchain is a protocol designed to enable cross-chain asset transfers, and this exploit targeted its Cardano implementation. The exact attack technique has not been disclosed, but the breach led to an estimated loss of over $9 million USD.",
  "protocol": "Wanchain",
  "amount_usd": "9.00",
  "chain": "Cardano",
  "attack_type": null,
  "date": "2026-07-22",
  "source": { "name": "web3isgoinggreat.com", "slug": "web3isgoinggreat-com" },
  "tags": [
    { "id": 236392, "name": "Bridge", "slug": "bridge" },
    { "id": 177, "name": "cardano", "slug": "cardano" },
    { "id": 130, "name": "wanchain", "slug": "wanchain" }
  ]
}`,
    getIt: {
      curl: `curl ${API_BASE}/security/exploits/?limit=3`,
      mcpTools: ["get_security_exploits", "get_security_exploits_detail"],
    },
    whatItsFor: [
      "A risk team that wants every recorded exploit on a protocol — feed `tags=wormhole` into the corpus and pull its incident history, no manual scraper required.",
      "A research agent that needs a one-sentence description of what actually happened on each event, not a headline. The `description` field is the lead with a full sentence per record.",
      "Per-protocol timeline reconstruction without re-crawling news: the corpus is sorted newest-first, has a `date` on every record, and resolves to a stable `hash`.",
    ],
    knownLimits: [
      {
        title: "Coverage on `amount_usd`, `chain` and `attack_type` is partial.",
        body:
          "Walked corpus-wide on 18 Sep 2026: `description` 190/190, `attack_type` 149/190 (78%), `amount_usd` 27/190 (14%), `chain` 4/190 (2%). The page does not roll up a single summed loss, a chain breakdown or an attack-type distribution as if it were complete — those numbers would be false on 190 records of which 14% carry a loss figure.",
      },
      {
        title: "The loss backfill is regressing, not just outstanding.",
        body:
          "Against the 31 Aug baseline in `scripts/audit-exploit-backfill.mjs` (164 records, 25 with `amount_usd`, 4 with `chain`), coverage moved from 15.2% → 14.2% on amount_usd and 2.4% → 2.1% on chain as the corpus grew to 190. The script's own header warns a backfill can add rows and still lose ground — it is losing ground against a dated go/no-go gate.",
      },
      {
        title: "`amount_usd` is a string, not a number.",
        body:
          "It is returned as a quoted decimal (\"9.00\") on most records. Parse defensively and do not assume a numeric type, even where the value looks like one.",
      },
    ],
  },

  "developer-activity": {
    slug: "developer-activity",
    title: "Developer activity",
    blurb:
      "GitHub activity snapshots per coin: commits, contributors, issues, stars, forks. One row per repo per week.",
    heroFigure: {
      big: "3,800+",
      suffix: "repo snapshots",
      note:
        "One row per repository per week. `commits_last_4_weeks` can be 0 on a repo with 38 contributors — detecting the dormant ones is the point.",
    },
    recordShape: [
      "id",
      "repo_url",
      "repo_name",
      "commits_last_4_weeks",
      "contributors_count",
      "open_issues",
      "stars",
      "forks",
      "date",
    ],
    samplePayload: `{
  "id": 3905,
  "repo_url": "https://github.com/Near-One/rainbow-bridge",
  "repo_name": "Near-One/rainbow-bridge",
  "commits_last_4_weeks": 0,
  "contributors_count": 38,
  "open_issues": 133,
  "stars": 328,
  "forks": 100,
  "date": "2026-09-15"
}`,
    getIt: {
      curl: `curl ${API_BASE}/coins/developer-activity/?limit=1`,
      mcpTools: ["get_developer_activity", "get_developer_activity_detail"],
    },
    whatItsFor: [
      "A 'is this project still being built' check that does not depend on Twitter announcements. Sort by `commits_last_4_weeks` ascending and the dormant repos surface themselves — the example record above carries 38 contributors and 0 commits in the last four weeks.",
      "A comparative snapshot for a research brief: every coin gets the same nine fields, so a side-by-side over a watchlist is a single shape to render.",
      "Projecting an open-issue backlog rather than scraping the GitHub API repo by repo: `open_issues` is the live count from each snapshot.",
    ],
    knownLimits: [
      {
        title: "There is no working `managed` filter.",
        body:
          "Verified corpus-wide on 18 Sep 2026: `?managed=true` returns the full 3,822 records, `?managed=false` returns 0, `?managed=banana` (junk value) returns the full 3,822. An invalid value returns the unfiltered corpus, so a working-looking boolean filter is indistinguishable from no filter at all. Filter client-side on `repo_name` or `contributors_count` instead.",
      },
      {
        title: "Zero commits does not mean zero activity.",
        body:
          "A repo with 38 contributors can carry `commits_last_4_weeks: 0` — pull requests, reviews and issue triage are not counted. Treat 0 as 'no merges in the window', not 'the repo is dead', and look at `contributors_count` alongside.",
      },
      {
        title: "One snapshot per repo per week, not per push.",
        body:
          "Granularity is weekly. The `date` is the snapshot date, not the most recent commit. Real-time activity requires the GitHub API directly.",
      },
    ],
  },

  "tvl-yields": {
    slug: "tvl-yields",
    title: "TVL yields",
    blurb:
      "DeFi yield pools across chains, with base APY, reward APY, TVL and impermanent-loss risk on every row.",
    heroFigure: {
      big: "33,000+",
      suffix: "DeFi yield pools",
      note:
        "One row per pool, not per pool per day. Top of the book by TVL: Lido stETH at $24B, Fluid DEX USDC-CSUSDL at $16B (apy 0.0% — a real, deliberate value, not a missing field).",
    },
    recordShape: [
      "id",
      "pool_id",
      "project",
      "chain",
      "symbol",
      "apy",
      "apy_base",
      "apy_reward",
      "tvl_usd",
      "il_risk",
      "date",
    ],
    samplePayload: `{
  "id": 1,
  "pool_id": "747c1d2a-c668-4682-b9f9-296708a3dd90",
  "project": "lido",
  "chain": "Ethereum",
  "symbol": "STETH",
  "apy": 2.25,
  "apy_base": 2.25,
  "apy_reward": null,
  "tvl_usd": 24128567502.0,
  "il_risk": "no",
  "date": "2026-06-11T11:01:47.996016Z"
}`,
    getIt: {
      curl: `curl ${API_BASE}/tvl/yields/?limit=5\\&ordering=-tvl_usd`,
      mcpTools: ["get_tvl_yields", "get_tvl_yields_detail", "get_tvl_yields_top"],
    },
    whatItsFor: [
      "A yield-aggregator front end that needs APY and TVL side by side across every chain — single shape, project and chain tags already attached.",
      "Risk triage by impermanent-loss class: `il_risk` is `yes`, `no`, or `unknown` and is present on every row, so a UI can filter without a per-pool allowlist.",
      "Top-of-book discovery: `?ordering=-tvl_usd` returns the largest pools first. Three of the top four are Ethereum LSTs (Lido stETH, Binance staked ETH, ether.fi).",
    ],
    knownLimits: [
      {
        title: "The `date` field is the pool's last update, not today.",
        body:
          "Each pool's `date` is independent. Walked 300 rows: 73 distinct `date` values, ranging from June through September. A `limit=10&ordering=-tvl_usd` is the top of the book today, but the rows it returns may be weeks old individually. Do not call the result a market snapshot.",
      },
      {
        title: "`apy: 0.0` on a $16B pool is real.",
        body:
          "Fluid DEX's USDC-CSUSDL pool carries TVL $16.44B and APY 0.0% — a stable pair, fee-light at the time of the snapshot. The corpus does not exclude zero-APY pools and the figure should not be treated as a missing value.",
      },
      {
        title: "APY vs APY-base vs APY-reward are separate fields.",
        body:
          "`apy` is the headline figure a reader wants; `apy_base` is the underlying yield with no incentives; `apy_reward` is the boost from token emissions. `apy_reward` is `null` on pure-LST pools. The three can move independently; do not collapse them client-side before comparing pools.",
      },
    ],
  },

  kasandra: {
    slug: "kasandra",
    title: "Kasandra patterns",
    blurb:
      "AI-detected chart patterns on a coin, with bullish/bearish signal and confidence. One call returns a multi-timeframe set — no list endpoint, no pagination.",
    heroFigure: {
      big: "1 call",
      suffix: "= a multi-timeframe pattern set",
      note:
        "20 patterns per coin per request, across 1D, 1M, 3M, 1Y, 3Y and ALL windows. There is no list endpoint, and the response is a bare JSON array — not an envelope.",
    },
    recordShape: [
      "id",
      "coin",
      "interval",
      "pattern_type",
      "signal",
      "confidence",
      "start_timestamp",
      "end_timestamp",
      "key_points",
      "modified",
    ],
    samplePayload: `[
  {
    "id": 278452859,
    "coin": {
      "id": 1,
      "name": "Bitcoin",
      "ticker": "BTC",
      "slug": "bitcoin",
      "icon": "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png"
    },
    "interval": "3Y",
    "pattern_type": "double_bottom",
    "signal": "bullish",
    "confidence": 0.835,
    "start_timestamp": 1788307200000,
    "end_timestamp": 1788998400000,
    "key_points": [
      { "price": 77333.13, "timestamp": 1788307200000 },
      { "price": 81269.43, "timestamp": 1788393600000 },
      { "price": 76566.61, "timestamp": 1788998400000 }
    ],
    "modified": "2026-09-18T06:41:16.302721Z"
  }
]`,
    getIt: {
      /*
       * Kasandra is keyed on the *slug* ("bitcoin"), not the *ticker* ("BTC").
       * /kasandra/patterns/BTC/ returns 404 with detail
       * "coin requested does not exist or is not supported". A curl command
       * copied from a price-feed API — where "BTC" works — would 404 here, so
       * the curl below uses the slug and the gotcha is called out below.
       */
      curl: `curl ${API_BASE}/kasandra/patterns/bitcoin/`,
      mcpTools: ["get_kasandra_patterns"],
    },
    whatItsFor: [
      "An agent that needs a 'what is this chart doing' opinion per coin without writing a pattern detector. One unauthenticated call returns a complete multi-timeframe set.",
      "Filtering signals client-side by interval and confidence: `signal` is `bullish` or `bearish`, `confidence` is in [0, 1]. A 'high-confidence bullish, recent' screen is a one-liner.",
      "Overlaying detected key-points onto an existing chart: each pattern carries `key_points: [{price, timestamp}]` with the trigger prices and the timestamps in epoch milliseconds.",
    ],
    knownLimits: [
      {
        title: "Keyed on coin slug, not ticker.",
        body:
          "`/kasandra/patterns/bitcoin/` returns 20 patterns; `/kasandra/patterns/BTC/` returns 404 with detail `\"coin requested does not exist or is not supported\"`. The slug is the join key, the same convention the news / market endpoints use, but a reader used to a ticker-keyed price feed will type the ticker first and the page must call this out.",
      },
      {
        title: "There is no list endpoint.",
        body:
          "`/kasandra/patterns/` returns 404. There is no corpus-wide count of patterns and no list-of-coins endpoint; the coin you can query is whatever the server happens to support, discoverable only by trying the slug.",
      },
      {
        title: "The response is a bare array of 20, not an envelope.",
        body:
          "There is no `{count, next, results}` shape. Each call returns at most 20 patterns for one coin, and the set covers a fixed six-interval span (1D, 1M, 3M, 1Y, 3Y, ALL). Iterate `interval` rather than paginating.",
      },
    ],
  },
};

/**
 * Resolve a capability slug to its page record.
 *
 * Returns `undefined` for an unknown slug; the route throws `notFound()` on
 * that, which is the same shape `cookbook.$recipe.tsx` uses for a typo. The
 * test asserts HEADLINE_CAPABILITIES is the exact page set; a stale or
 * hand-written slug in either place fails the build.
 */
export const pageBySlug = (slug) => CAPABILITY_PAGES[slug];
