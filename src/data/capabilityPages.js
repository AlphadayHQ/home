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

/*
 * Content feeds (news, blogs, podcasts, videos, forum) all share the same
 * /items/{slug}/ endpoint, the same record envelope (results + total + links)
 * and the same three filters — period, tags, sources — so their entries
 * read as siblings rather than as one-off prose. The five are kept here
 * together for that reason: when one of them drifts (a filter changing,
 * a new source joining), the other four are usually affected the same
 * way, and re-measuring five at once catches the drift before any single
 * page quietly disagrees with the others.
 *
 * Measured corpus-wide on 18 Sep 2026 against the same live server:
 *   news     444,175  blogs 19,017   podcasts 22,773   videos 34,570   forum 62,403
 * All five pass junk-value tests on period (rejected, 400), tags (returns
 * the few items that fuzzy-match the junk keyword) and sources (returns 0).
 * The dao and events endpoints share the same URL pattern, but their
 * period filter is silently broken (see plan §4.1); those pages live in
 * batch 2c and are not here.
 */
export const CAPABILITY_PAGES = {
  news: {
    slug: "news",
    title: "News",
    blurb:
      "Real-time news from 49 crypto outlets, deduped and tagged, with sentiment scored per record.",
    heroFigure: {
      big: "440,000+",
      suffix: "articles",
      /*
       * Plan §3: the volume claim ("440,000+ articles") is the single most
       * impressive figure this API has, and the source claim ("49 outlets")
       * is its credibility half. Both go on the page. The corpus grows by
       * tens of thousands a week, so the rounded-down step (440k+) stays
       * true rather than decaying the morning after the build ships.
       */
      note:
        "49 outlets behind the corpus. Sorted newest-first; every record carries a published_at, a sentiment score, and the source's name and slug.",
    },
    recordShape: [
      "id",
      "hash",
      "title",
      "url",
      "image",
      "author",
      "published_at",
      "source",
      "sentiment",
      "sentiment_score",
      "likes",
    ],
    samplePayload: `{
  "id": 484835,
  "hash": "de8ff05bf07734c7276519af5b05a92bef8155073656509293525cc00c0e7e0b",
  "title": "House Committee Advances US Bitcoin Reserve Bill on Party-Line Split",
  "url": "https://decrypt.co/378457/house-committee-advances-us-bitcoin-reserve-bill-on-party-line-split",
  "image": "https://img.decrypt.co/insecure/rs:fill:1024:512:1:0/plain/https://cdn.decrypt.co/wp-content/uploads/2025/05/US-Capitol-decrypt-style-02-gID_7.png@png",
  "author": null,
  "published_at": "2026-09-17T10:24:00Z",
  "source": {
    "name": "Decrypt",
    "slug": "decrypt_news",
    "icon": "https://cdn.alphaday.com/media/icons/sources/decrypt_news.jpg"
  },
  "is_bookmarked": false,
  "is_liked": false,
  "sentiment": 0,
  "sentiment_score": "0.00",
  "likes": 0
}`,
    getIt: {
      curl: `curl ${API_BASE}/items/news/?tags=arbitrum\\&limit=3`,
      mcpTools: ["get_news", "get_news_detail", "get_trending_news", "get_news_last_24_hours"],
    },
    whatItsFor: [
      "A media-monitoring agent that wants every outlet's take on a single story — `tags=arbitrum` returns 1,264 articles, a 'who has covered this' count is a `?sources=*` walk from there.",
      "Sentiment-tagged news for a research brief: `sentiment` and `sentiment_score` are scored per article, so a one-week tone chart for a project is a single sort.",
      "A 'last 24 hours' feed without signup or polling: `get_news_last_24_hours` is a separate tool, and `?period=0` gives the same window on this endpoint — 69 articles in the last 24 hours, against 3,992 for the week.",
    ],
    knownLimits: [
      {
        title: "`sources` requires the source's slug, not its name.",
        body:
          "Verified corpus-wide on 18 Sep 2026: `?sources=decrypt` returns 0 on news; `?sources=decrypt_news` returns 22,778. The slug is the join key (e.g. `decrypt_news`, `kyberswap_blog`), not the display name — discoverable from any record's `source.slug` field. A junk value returns 0, the same shape a working-looking invalid filter has.",
      },
      {
        title: "`tags` is a fuzzy keyword match, not a slug match.",
        body:
          "`?tags=banana` returns 77 news items, not 0 — the parameter searches across the keyword bag on every record rather than matching the taxonomy slug exactly. Use the tag taxonomy (`get_tags`) to discover slugs first; once you have them, the count is exact.",
      },
      {
        title: "`sentiment` is a single number, not a label.",
        body:
          "`sentiment` is a numeric score and `sentiment_score` is its decimal string (\"0.00\"). The endpoint does not bucket articles as positive/negative/neutral; the bucket has to be derived client-side from the score's sign.",
      },
    ],
  },

  forum: {
    slug: "forum",
    title: "Forum",
    blurb:
      "Governance forum posts across 59 protocols — the discussion layer behind every DAO proposal.",
    heroFigure: {
      big: "60,000+",
      suffix: "governance posts",
      note:
        "59 forums behind one endpoint. The record is the post, not the thread — title and url point to the top of the thread on the protocol's Discourse (or similar), and the author is the Discourse handle.",
    },
    recordShape: [
      "id",
      "hash",
      "title",
      "url",
      "author",
      "published_at",
      "image",
      "source",
    ],
    samplePayload: `{
  "id": 411649,
  "hash": "cce0b0650f82ef70c709577a235030e257a1a686cc7f992c08e54b9298cf8cdc",
  "title": "RSR Unlocking - a brief recent history",
  "url": "https://forum.reserve.org/t/rsr-unlocking-a-brief-recent-history/1652",
  "author": "reserve_forum",
  "published_at": "2026-09-18T07:02:00Z",
  "image": null,
  "source": {
    "name": "Reserve Forum",
    "slug": "reserve_forum",
    "icon": "https://cdn.alphaday.com/media/icons/sources/Reserve_protocol_logo_mZsCDuv.png"
  }
}`,
    getIt: {
      curl: `curl ${API_BASE}/items/forum/?tags=arbitrum\\&limit=3`,
      mcpTools: ["get_forum", "get_forum_detail", "get_trending_forum"],
    },
    whatItsFor: [
      "Joining a DAO proposal to its underlying discussion: `?tags=arbitrum` returns 2,170 governance posts; pair with the DAO snapshot endpoint on the same slug to reconstruct the deliberation, not just the vote.",
      "Detecting when a forum is being brigaded or quiet — the `published_at` per post is real and a daily count per source is a single group-by.",
      "Researching a protocol's history of contentious proposals: every post carries its source forum's slug, so a 'what did Reserve argue about' query is a filter on one source.",
    ],
    knownLimits: [
      {
        title: "No sentiment, likes or bookmarks on this endpoint.",
        body:
          "Walked one record on 18 Sep 2026: forum records carry only `id`, `hash`, `title`, `url`, `author`, `published_at`, `image`, `source`. The news endpoint's `sentiment`, `is_bookmarked`, `is_liked`, `likes` fields do not exist here — the schema is intentionally leaner. Treat a client that expects news-shaped records as broken against this endpoint.",
      },
      {
        title: "`author` is the Discourse handle, not a human name.",
        body:
          "The example record above carries `author: \"reserve_forum\"` — a bot or community handle, not a person. The endpoint does not link handle → human identity; do not build a byline view from it.",
      },
      {
        title: "`sources` needs the slug.",
        body:
          "Verified on 18 Sep 2026: `?sources=reserve` returns 0, `?sources=reserve_forum` returns 544. Same shape as the news endpoint — the slug from any record's `source.slug` is the parameter value.",
      },
    ],
  },

  videos: {
    slug: "videos",
    title: "Videos",
    blurb:
      "YouTube videos from 121 channels — market commentary, explainers and protocol walkthroughs, timestamped.",
    heroFigure: {
      big: "34,000+",
      suffix: "videos",
      note:
        "121 channels behind the corpus. `short_description` is the YouTube description, often empty on shorts — the record's title is the load-bearing field, with the URL pointing at the video.",
    },
    recordShape: [
      "id",
      "title",
      "url",
      "image",
      "short_description",
      "published_at",
      "source",
    ],
    samplePayload: `{
  "id": 34859,
  "title": "Send the Dash rocket 🚀",
  "url": "https://www.youtube.com/shorts/k1x4nNfLyXw",
  "image": null,
  "published_at": "2026-09-18T03:30:00Z",
  "source": {
    "name": "Digital Cash Network",
    "slug": "digitalcashnetwork_video",
    "icon": "https://cdn.alphaday.com/media/icons/sources/2.jpg"
  },
  "is_bookmarked": false,
  "short_description": ""
}`,
    getIt: {
      curl: `curl ${API_BASE}/items/videos/?tags=bitcoin\\&limit=3`,
      mcpTools: ["get_videos", "get_videos_detail", "get_trending_videos", "get_latest_videos"],
    },
    whatItsFor: [
      "A 'what is the crypto YouTube sphere saying today' feed without scraping 121 RSS feeds: `?period=0` returns the day's videos from every channel in one call — 22 in the last 24 hours, 127 over the week.",
      "Discovering which YouTube channels cover a project: `?tags=bitcoin` returns 428 videos; the `source.slug` per record identifies the channel.",
      "A frontend for the newest upload only: `get_latest_videos` is a separate tool, and `/items/videos/latest/` returns a single most-recent record rather than a page of them.",
    ],
    knownLimits: [
      {
        title: "No `hash` field on videos — and no `likes`.",
        body:
          "Verified on 18 Sep 2026: video records carry `id`, `title`, `url`, `image`, `short_description`, `published_at`, `source`, `is_bookmarked` — but no `hash`, no `author`, no `likes`, no `sentiment`. A client that hashes news for dedup will get nothing on videos.",
      },
      {
        title: "`short_description` is often empty on shorts.",
        body:
          "The example record above is a YouTube Short with `short_description: \"\"` — the field is the full YouTube description, and shorts typically have none. Do not assume a populated description; the title carries the payload.",
      },
      {
        title: "`period` works here; `sources` needs the slug.",
        body:
          "Verified 18 Sep 2026. `period` takes an integer, not a duration string: `0` is 24 hours, `1` a week, `2` a month, `3` a quarter. `?period=1` returns 127 videos and `?period=0` returns 22; anything else — including `?period=1d` — returns 400 rather than falling back. `?sources=digitalcashnetwork` returns 0 while `?sources=digitalcashnetwork_video` returns 390: the same `slug ≠ name` trap as the other content feeds.",
      },
    ],
  },

  podcasts: {
    slug: "podcasts",
    title: "Podcasts",
    blurb:
      "Latest episodes from 118 crypto podcast feeds, with audio URLs and durations on every record.",
    heroFigure: {
      big: "22,000+",
      suffix: "episodes",
      note:
        "118 feeds behind the corpus. Every record carries a `file_url` (the audio file) and a `duration` — the page is the only content endpoint where the resource itself is reachable.",
    },
    recordShape: [
      "id",
      "hash",
      "title",
      "url",
      "image",
      "short_description",
      "duration",
      "file_url",
      "published_at",
      "source",
    ],
    samplePayload: `{
  "id": 161686,
  "hash": "ffcb6f4b6a777efa57f9984e34b297cf66eacd82e3cfad8acb383e3dde659252",
  "title": "HUGE! SEC PROVIDES TOKENIZATION GUIDANCE! CLARITY ACT TO PASS IN 2027? S&P GLOBAL CRYPTO SECURITY!",
  "url": "https://youtu.be/zGnkQzReuOg",
  "image": "https://d3wo5wojvuv7l.cloudfront.net/t_rss_itunes_square_1400/images.spreaker.com/original/e8115a696e3e25752a627b3db11e6f6d.jpg",
  "short_description": "Crypto News: SEC rolls out long-awaited 'innovation exemption' for tokenized securities venues. Kevin OLeary says Congress will revisit Clarity early next year. S&P Global agrees to acquire OpenZeppelin in onchain security push.",
  "duration": "00:00",
  "file_url": "https://dts.podtrac.com/redirect.mp3/api.spreaker.com/download/episode/...",
  "published_at": "2026-09-18T03:33:00Z",
  "source": {
    "name": "Thinking Crypto Podcast",
    "slug": "thinking_cryptonews_podcast",
    "icon": "https://cdn.alphaday.com/media/icons/sources/..."
  }
}`,
    getIt: {
      curl: `curl ${API_BASE}/items/podcasts/?tags=bitcoin\\&limit=3`,
      mcpTools: ["get_podcasts", "get_podcasts_detail", "get_trending_podcasts"],
    },
    whatItsFor: [
      "A podcast player that does not crawl 118 RSS feeds: every record carries the audio URL (`file_url`) and the episode page (`url`), with `published_at` for the chronological feed.",
      "Discovering which shows covered a story: `?tags=bitcoin` returns 101 episodes, and the `source.slug` per record names the show.",
      "A research brief that needs a transcript summary: `short_description` is the RSS-channel's episode summary, not a transcript — long enough for an LLM summary, short enough to fit one call.",
    ],
    knownLimits: [
      {
        title: "`duration` is a string, sometimes \"00:00\".",
        body:
          "The example record above carries `duration: \"00:00\"` — the field is present on every record but is not always populated. Parse defensively (it is `HH:MM` or `HH:MM:SS`), and do not assume a non-zero duration is meaningful.",
      },
      {
        title: "`file_url` may be a tracking redirect, not the audio.",
        body:
          "Many podcast feeds go through a tracker (`dts.podtrac.com/redirect.mp3/...`) before the actual file. The URL plays, but a downloader that strips query strings will lose the redirect. Fetch the URL as-is.",
      },
      {
        title: "`sources` needs the slug.",
        body:
          "Verified on 18 Sep 2026: `?sources=thinkingcrypto` returns 0; `?sources=thinking_cryptonews_podcast` returns 1,187. Same `slug ≠ name` rule as the other content feeds — discoverable from any record's `source.slug`.",
      },
    ],
  },

  blogs: {
    slug: "blogs",
    title: "Blogs",
    blurb:
      "Posts from 133 project and protocol blogs in one feed — engineering write-ups, governance updates, announcements.",
    heroFigure: {
      big: "19,000+",
      suffix: "posts",
      note:
        "133 blogs behind the corpus. The record shape is identical to news (id, hash, title, url, image, author, published_at, source) but the corpus is project-authored, not media-authored — title points at engineering deep-dives, not press releases.",
    },
    recordShape: [
      "id",
      "hash",
      "title",
      "url",
      "image",
      "author",
      "published_at",
      "source",
    ],
    samplePayload: `{
  "id": 19375,
  "hash": "b9752e269fa16722b179b91e0e57ccb264929b2bb5c645fb5e4c9e04186e937e",
  "title": "How to Find and Buy Trending Tokens on Arc Chain",
  "url": "https://blog.kyberswap.com/how-to-find-and-buy-trending-tokens-on-arc-chain/",
  "image": "https://blog.kyberswap.com/wp-content/uploads/2022/07/kyberswap-logo-150x150.png",
  "author": null,
  "published_at": "2026-09-18T07:18:00Z",
  "source": {
    "name": "Kyberswap - Blog",
    "slug": "kyberswap_blog",
    "icon": "https://cdn.alphaday.com/media/icons/sources/kybe.jpg"
  },
  "is_bookmarked": false,
  "is_liked": false,
  "likes": 0
}`,
    getIt: {
      curl: `curl ${API_BASE}/items/blogs/?tags=arbitrum\\&limit=3`,
      mcpTools: ["get_blogs", "get_blogs_detail", "get_trending_blogs"],
    },
    whatItsFor: [
      "A 'what is the team at ArgoCo building' feed that does not crawl 133 RSS feeds: `?tags=arbitrum` returns 273 posts, and `?sources=kyberswap_blog` returns the 158 from one blog.",
      "Engineering-deep-link discovery for a research agent: blog records carry the post URL and the project's blog host — a UI can deep-link without parsing.",
      "Daily summary by blog: `?period=0` gives the day's posts — 12 in the last 24 hours — and grouping by `source.slug` turns them into a 'which projects shipped today' report.",
    ],
    knownLimits: [
      {
        title: "`author` is often null.",
        body:
          "Verified on 18 Sep 2026: the example record carries `author: null` — project blogs frequently publish with no byline, even when the underlying CMS has one. Do not build a byline view that requires `author` to be present.",
      },
      {
        title: "No sentiment or engagement fields.",
        body:
          "Blog records carry `likes` (count) and `is_liked` (boolean), but no `sentiment` or `sentiment_score`. The endpoint is a feed, not a tone corpus — for sentiment-scoped blog analysis, score the `short_description` client-side.",
      },
      {
        title: "`sources` needs the slug.",
        body:
          "Verified on 18 Sep 2026: `?sources=kyberswap` returns 0; `?sources=kyberswap_blog` returns 158. Same `slug ≠ name` rule as the other content feeds — discoverable from any record's `source.slug`.",
      },
    ],
  },

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
      curl: `curl ${API_BASE}/tvl/yields/?limit=5`,
      mcpTools: ["get_tvl_yields", "get_tvl_yields_detail", "get_tvl_yields_top"],
    },
    whatItsFor: [
      "A yield-aggregator front end that needs APY and TVL side by side across every chain — single shape, project and chain tags already attached.",
      "Risk triage by impermanent-loss class: `il_risk` is `yes`, `no`, or `unknown` and is present on every row, so a UI can filter without a per-pool allowlist.",
      "Top-of-book discovery, with a caveat worth knowing: `/tvl/yields/top/` ranks by APY, not TVL, and returns a different envelope (`{ pools: { config, data } }`, attributed to DefiLlama). Its leaders are four- and five-figure APYs on tiny pools. For the largest pools by capital, sort `tvl_usd` yourself — the LSTs dominate: Lido stETH at $24B, Binance staked ETH, ether.fi.",
    ],
    knownLimits: [
      {
        title: "The `date` field is the pool's last update, not today.",
        body:
          "Each pool's `date` is independent. Walked 300 rows: 73 distinct `date` values, ranging from June through September. A TVL-sorted top ten is the top of the book today, but the rows in it may be weeks old individually. Do not call the result a market snapshot.",
      },
      {
        title: "`?ordering=` is accepted and ignored.",
        body:
          "Not a documented parameter, and it does nothing: `?ordering=-tvl_usd` and `?ordering=banana` both return the unfiltered 33,618 in the default order. It is easy to believe it works here, because the largest pool by TVL — Lido stETH — is also first by `id`, so the top row does not move. Sort client-side.",
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
