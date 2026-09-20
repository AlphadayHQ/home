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
      "Top-of-book discovery needs no parameters: the default order is `tvl_usd` descending, so `?limit=5` returns the largest pools by capital — Lido stETH at $25B, then Fluid DEX and Binance staked ETH. Note that `/tvl/yields/top/` is a different thing: it ranks by APY, returns a different envelope (`{ pools: { config, data } }`, attributed to DefiLlama), and its leaders are five-figure APYs on pools with almost no capital in them.",
    ],
    knownLimits: [
      {
        title: "The `date` field is the pool's last update, not today.",
        body:
          "Each pool's `date` is independent. Walked 300 rows: 73 distinct `date` values, ranging from June through September. The default TVL ordering gives you the top of the book today, but the rows in it may be weeks old individually. Do not call the result a market snapshot.",
      },
      {
        title: "`?ordering=` is not live on the public API yet.",
        body:
          "The API defines four sort fields — `tvl_usd`, `apy`, `apy_base`, `apy_reward`, each ascending or descending with a `-` prefix. None of them take effect here yet: every value, including an invalid one, returns the default order. That default is `tvl_usd` descending, so the common case already works without the parameter. Sort client-side for anything else until it ships.",
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

  "market-coins": {
    slug: "market-coins",
    title: "Market coins",
    blurb:
      "Price, market cap, volume and all-time extremes for the ranked coin universe, with 24h / 7d / 30d change already computed.",
    heroFigure: {
      big: "1,300+",
      suffix: "ranked coins",
      note:
        "`price` and `rank` are on every record; `market_cap` on 98% and `volume` on 99%. The percentage-change fields are precomputed across three windows, so a mover list needs no history calls.",
    },
    recordShape: [
      "id", "name", "ticker", "slug", "icon", "rank", "price", "market_cap",
      "volume", "price_percent_change_24h", "price_percent_change_7d",
      "price_percent_change_30d", "high_24h", "low_24h", "ath", "atl", "updated_at",
    ],
    samplePayload: `{
  "id": 1,
  "name": "Bitcoin",
  "ticker": "BTC",
  "slug": "bitcoin",
  "rank": 1,
  "price": 80433.2310665514,
  "market_cap": 1611653315762.6667,
  "volume": 20546803091.92952,
  "price_percent_change_24h": -1.1334662209728525,
  "price_percent_change_7d": 2.853303977829609,
  "price_percent_change_30d": 4.361915472905906,
  "high_24h": 81937.95,
  "low_24h": 80131.51333333332,
  "ath": 126192.65666666666,
  "atl": 67.81,
  "updated_at": "2026-09-20T12:07:16Z"
}`,
    getIt: {
      curl: `curl ${API_BASE}/market/coins/?limit=5`,
      mcpTools: [
        "get_market_coins", "get_market_coins_detail", "get_market_coins_history",
        "get_market_trending", "get_market_trending_detail",
      ],
    },
    whatItsFor: [
      "A movers board with no arithmetic: `price_percent_change_24h`, `_7d` and `_30d` are already on the row, so ranking by momentum is a sort rather than a history walk.",
      "Drawdown and recovery framing: `ath` and `atl` sit beside `price` on 86% of rows, so \"how far off the high\" is one subtraction and needs no separate endpoint.",
      "Coin resolution for every other endpoint here: `slug` is the join key that `/kasandra/patterns/{coin}/` and the tag filters expect — `bitcoin`, never `BTC`.",
    ],
    knownLimits: [
      {
        title: "`updated_at` is per coin, and the spread is months.",
        body:
          "Walked all 1,321 rows on 20 Sep 2026: `updated_at` spans 2026-05-25 to 2026-09-20 across 69 distinct days. The top of the book is fresh; the long tail is not. Read `updated_at` before treating a row as current, and do not present the set as a single market snapshot.",
      },
      {
        title: "`ath` and `atl` are missing on 14% of rows.",
        body:
          "1,138 of 1,321 carry `ath`, 1,134 carry `atl` — newer listings mostly. A drawdown view has to tolerate nulls rather than assuming the pair is always present.",
      },
    ],
  },

  "coin-categories": {
    slug: "coin-categories",
    title: "Coin categories",
    blurb:
      "The sector taxonomy — Smart Contract Platform, Layer 1, PoW and 700-odd more — each with a market-cap aggregate where one has been computed.",
    heroFigure: {
      big: "700+",
      suffix: "categories",
      note:
        "Read the limits below before building on the aggregates: roughly half the categories carry one, and `coin_count` is never populated on any record.",
    },
    recordShape: [
      "id", "slug", "name", "market_cap", "market_cap_change_24h",
      "volume_24h", "coin_count", "updated_at",
    ],
    samplePayload: `{
  "id": 1,
  "slug": "smart-contract-platform",
  "name": "Smart Contract Platform",
  "market_cap": 2287322109640.296,
  "market_cap_change_24h": 1.4610133478211142,
  "volume_24h": 56636037295.46437,
  "coin_count": 0,
  "updated_at": "2026-09-01T00:00:14.657949Z"
}`,
    getIt: {
      curl: `curl ${API_BASE}/coins/categories/?limit=5`,
      mcpTools: ["get_coin_categories", "get_coin_categories_detail"],
    },
    whatItsFor: [
      "Sector rotation at a glance: the largest categories by market cap are Smart Contract Platform ($2.29T), Layer 1 ($2.26T) and Proof of Work ($1.63T), each with `market_cap_change_24h` alongside.",
      "A sector filter for the rest of the API: `slug` here is a tag slug elsewhere, so a category name resolves into news, governance and price queries without a mapping table.",
      "Naming a narrative without inventing one: the taxonomy is the industry's own sector vocabulary rather than a set of labels this API made up.",
    ],
    knownLimits: [
      {
        title: "`coin_count` is 0 on every record.",
        body:
          "Walked all 750 categories on 20 Sep 2026: not one carries a non-zero `coin_count`. The field is present and always empty, so \"how many coins are in this sector\" cannot be answered here — count them from `/market/coins/` by tag instead.",
      },
      {
        title: "Only about half carry an aggregate.",
        body:
          "368 of 750 have `market_cap`, 370 have `volume_24h`, 365 have `market_cap_change_24h`. A sector leaderboard built without a null check silently ranks the 49% that happen to be computed and drops the rest — which is not the same as those sectors being small.",
      },
      {
        title: "`updated_at` can be weeks behind.",
        body:
          "The sample above was computed on 1 Sep and read on 20 Sep. These are periodic aggregates, not live figures; quote them with their date.",
      },
    ],
  },

  exchanges: {
    slug: "exchanges",
    title: "Exchanges",
    blurb:
      "Centralized exchanges with CoinGecko trust scores, 24h BTC-denominated volume, jurisdiction and year established.",
    heroFigure: {
      big: "150",
      suffix: "exchanges",
      note:
        "`trust_score`, `trade_volume_24h_btc` and `url` are on every record; `year_established` on 97% and `country` on 93%. Small enough to walk in full — 150 rows is one page at `limit=200`.",
    },
    recordShape: [
      "id", "exchange_id", "name", "year_established", "country", "description",
      "url", "image", "has_trading_incentive", "trust_score", "trust_score_rank",
      "trade_volume_24h_btc", "trade_volume_24h_btc_normalized", "tags",
    ],
    samplePayload: `{
  "id": 214,
  "exchange_id": "binance",
  "name": "Binance",
  "year_established": 2017,
  "country": "Cayman Islands",
  "url": "https://www.binance.com/",
  "has_trading_incentive": false,
  "trust_score": 10,
  "trust_score_rank": 1,
  "trade_volume_24h_btc": 167917.00941477102,
  "trade_volume_24h_btc_normalized": null,
  "tags": [
    { "id": 302367, "name": "Binance", "slug": "binance" },
    { "id": 302368, "name": "Cayman Islands", "slug": "cayman-islands" }
  ]
}`,
    getIt: {
      curl: `curl ${API_BASE}/exchanges/?min_trust_score=9`,
      mcpTools: ["get_exchanges", "get_exchanges_detail"],
    },
    whatItsFor: [
      "Counterparty screening that is one call, not a spreadsheet: `?min_trust_score=9` returns the 19 exchanges scoring 9 or 10, out of 150.",
      "Jurisdiction mapping: `country` is a real field on 93% of rows and also arrives as a tag, so \"which venues are domiciled where\" needs no string matching.",
      "Volume comparison in a single unit: `trade_volume_24h_btc` is BTC-denominated across every venue, so it compares directly without an FX step.",
    ],
    knownLimits: [
      {
        title: "`has_trading_incentive` is false on all 150.",
        body:
          "Walked the full set on 20 Sep 2026: not one exchange has it set. The filter works — `?has_trading_incentive=true` returns 0 and `false` returns 150 — but it partitions nothing useful. Do not build a facet on it.",
      },
      {
        title: "`ordering` and `sort_by` are documented here but not live.",
        body:
          "`?ordering=trust_score` and `?ordering=-trust_score` return identical rows, so the parameter does nothing on the public API yet; `?sort_by=trust_score` returns 400. Sort the 150 rows client-side — `trust_score_rank` is already on each record.",
      },
      {
        title: "`description` is missing on a third of rows.",
        body:
          "100 of 150 carry one. A venue card that requires `description` will render empty for a third of the set, including venues with a perfect trust score.",
      },
    ],
  },

  "onchain-dexes": {
    slug: "onchain-dexes",
    title: "Onchain DEXes",
    blurb:
      "Decentralized exchanges with TVL, volume across four windows, fees, market share and the chain and protocol behind each.",
    heroFigure: {
      big: "750+",
      suffix: "DEXes",
      note:
        "`protocol` and `description` are on 97% of records, `volume_1d` and `market_share` on 95%, `tvl` and `chain` on 90%. Numeric fields arrive as strings — see the limits.",
    },
    recordShape: [
      "id", "dex_id", "slug", "name", "description", "url", "image",
      "volume_1d", "volume_1d_change", "volume_7d", "volume_30d",
      "volume_all_time", "tvl", "fees_24h", "fees_7d", "fees_30d",
      "chain", "protocol", "disabled", "rank", "market_share", "tags",
    ],
    samplePayload: `{
  "id": 1431,
  "dex_id": "0swap",
  "slug": "0swap",
  "name": "0Swap",
  "url": "https://www.0swap.exchange",
  "volume_1d": "11770.00",
  "volume_1d_change": "-48.47",
  "volume_7d": "194481.00",
  "volume_30d": "563354.00",
  "volume_all_time": "575124.00",
  "tvl": "44146.19",
  "fees_24h": "0.00",
  "chain": "Robinhood Chain",
  "protocol": "AMM",
  "disabled": false,
  "rank": 323,
  "market_share": "0.0001"
}`,
    getIt: {
      curl: `curl ${API_BASE}/onchain-dexes/?tags=ethereum`,
      mcpTools: ["get_onchain_dexes", "get_onchain_dexes_detail"],
    },
    whatItsFor: [
      "Venue discovery per chain: `?tags=ethereum` returns 85 of the 757. The chain distribution is wider than the usual shortlist — Binance 59, Ethereum 36, Base 32, Solana 31.",
      "Protocol-shape analysis: `protocol` separates AMMs from order books and aggregators on 97% of rows, so \"how much volume runs through AMMs on this chain\" is a group-by.",
      "Fee-to-volume comparison without a second source: `volume_1d/7d/30d` and `fees_24h/7d/30d` sit on the same record across matching windows.",
    ],
    knownLimits: [
      {
        title: "Every numeric field is a string.",
        body:
          "`tvl`, `volume_1d`, `fees_24h` and `market_share` come back quoted — `\"44146.19\"`, not `44146.19`. Sorting without casting gives you lexicographic order, where `\"9\"` beats `\"44146.19\"`. This is the single most likely thing to go wrong on this endpoint.",
      },
      {
        title: "`chain` is null on 79 records.",
        body:
          "678 of 757 carry one. A chain facet drops 10% of the corpus silently, and the missing rows are not a random sample — multi-chain deployments are the common case among them.",
      },
      {
        title: "`fees_24h` is thinner than volume.",
        body:
          "561 of 757 carry a fees figure against 722 for `volume_1d`. A fee-to-volume ratio is only computable on about three-quarters of the set; the rest will divide by null.",
      },
      {
        title: "Three records are flagged `disabled`.",
        body:
          "`disabled: true` on 3 of 757. They are returned by default, so filter them out if the list is user-facing.",
      },
    ],
  },

  "tvl-fees": {
    slug: "tvl-fees",
    title: "Protocol fees & revenue",
    blurb:
      "What DeFi protocols actually earn — fees and revenue over 24h, 7d and 30d windows, per protocol, in USD.",
    heroFigure: {
      big: "2,200+",
      suffix: "fee records",
      note:
        "The distinction the shape makes for you: `total_*` is fees paid by users, `revenue_*` is what the protocol keeps. For Tether they are identical; for most AMMs they are not.",
    },
    recordShape: [
      "id", "project", "currency", "total_24h", "total_7d", "total_30d",
      "revenue_24h", "revenue_7d", "revenue_30d", "date",
    ],
    samplePayload: `{
  "id": 881,
  "project": {
    "name": "Tether",
    "slug": "tether",
    "project_type": "protocol",
    "icon": "https://icons.llama.fi/tether.png",
    "url": "https://defillama.com/protocol/tether"
  },
  "currency": "USD",
  "total_24h": 17046499.0,
  "total_7d": 117034021.0,
  "total_30d": 485359152.0,
  "revenue_24h": 17046499.0,
  "revenue_7d": 117034021.0,
  "revenue_30d": 485359152.0,
  "date": "2026-06-11T07:18:49.381620Z"
}`,
    getIt: {
      curl: `curl ${API_BASE}/tvl/fees/?tags=ethereum`,
      mcpTools: ["get_tvl_fees", "get_tvl_fees_detail", "get_tvl_fees_top"],
    },
    whatItsFor: [
      "The question TVL cannot answer: TVL says how much capital sits somewhere, fees say whether it earns anything. Both are on this API and they rank differently.",
      "Fees versus revenue as a business-model signal: where `revenue_*` tracks `total_*` the protocol keeps the fee; where it is a fraction, the rest goes to liquidity providers.",
      "Scoping by ecosystem: `?tags=ethereum` returns 168 of the 2,207 records, and `?project=<slug>` narrows to one protocol.",
    ],
    knownLimits: [
      {
        title: "`date` is per record and spans months.",
        body:
          "Walked 1,400 rows on 20 Sep 2026: 57 distinct `date` values from 2026-06-11 to 2026-09-17. The sample above is a June reading. These are snapshots at differing times, not a synchronized daily cut — never sum across rows without checking their dates agree.",
      },
      {
        title: "`revenue_*` is thinner than `total_*`.",
        body:
          "Over the same walk: `total_24h` on 92% of rows, `revenue_24h` on 72%. A take-rate calculation is unavailable for roughly a quarter of the corpus.",
      },
      {
        title: "`currency` is always USD.",
        body:
          "1,400 of 1,400 read `USD`. The field is a constant today rather than a dimension — do not build a currency selector on it.",
      },
    ],
  },

  "tvl-stablecoins": {
    slug: "tvl-stablecoins",
    title: "Stablecoins",
    blurb:
      "Every tracked stablecoin with what it pegs to, how the peg is held, its circulating supply and its current price.",
    heroFigure: {
      big: "420+",
      suffix: "stablecoins",
      note:
        "`peg_type`, `peg_mechanism` and `symbol` are on 100% of records, `circulating_usd` on all but two. The peg fields are the reason to use this rather than a price feed.",
    },
    recordShape: [
      "id", "stablecoin_id", "name", "symbol", "peg_type",
      "peg_mechanism", "circulating_usd", "price", "date",
    ],
    samplePayload: `{
  "id": 1,
  "stablecoin_id": "1",
  "name": "Tether",
  "symbol": "USDT",
  "peg_type": "peggedUSD",
  "peg_mechanism": "fiat-backed",
  "circulating_usd": 182097304516.19,
  "price": 1.0,
  "date": "2026-09-19T09:07:21.416687Z"
}`,
    getIt: {
      curl: `curl ${API_BASE}/tvl/stablecoins/?peg_type=peggedUSD`,
      mcpTools: ["get_tvl_stablecoins", "get_tvl_stablecoins_detail"],
    },
    whatItsFor: [
      "Peg-risk screening as a filter rather than a research project: 253 of 428 are crypto-backed, 147 fiat-backed and 27 algorithmic — the mechanism that determines how a depeg behaves is a field, not a footnote.",
      "Non-USD stablecoin discovery: `?peg_type=peggedUSD` returns 339, which leaves 89 pegged to EUR (26), a basket (10), BRL (5), JPY (5) and others. Most dashboards never show these.",
      "Depeg monitoring: `price` beside `peg_type` makes deviation computable directly, with no separate oracle call.",
    ],
    knownLimits: [
      {
        title: "`peg_mechanism` contains a misspelled value.",
        body:
          "One record reads `crytpo-backed` rather than `crypto-backed`. An equality filter on the correct spelling silently drops it. Normalise before grouping, or match on both — the value set is otherwise `crypto-backed` (253), `fiat-backed` (147) and `algorithmic` (27).",
      },
      {
        title: "`price` is missing on 28% of records.",
        body:
          "308 of 428 carry one. Depeg detection therefore covers roughly three-quarters of the corpus, and the gaps skew toward the smaller and more obscure coins — which are the ones most likely to depeg.",
      },
      {
        title: "`date` is the record's own reading.",
        body:
          "Each row carries its own timestamp rather than sharing a snapshot time. Compare `circulating_usd` across coins only when their dates agree.",
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
