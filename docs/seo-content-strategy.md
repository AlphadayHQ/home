# Alphaday SEO Content Strategy

**Scope:** what to publish, in what order, and what each piece is supposed to earn
**Date:** 31 Aug 2026
**Companion to:** [seo-strategy.md](./seo-strategy.md) — that document covers the technical audit,
the rendering decision, indexation tiering and crawl budget. This one does not repeat any of it.

> **The plan in the companion document is a publishing plan. Publishing does not rank on its own.**
> A 36,000-page programmatic corpus on a domain with no link acquisition programme gets partially
> indexed and then decays. The missing half of the strategy is what earns the authority that makes
> the corpus rankable — and it is sitting unused inside the API.

---

## Contents

1. [What the data actually contains](#1-what-the-data-actually-contains)
2. [The strategic problem](#2-the-strategic-problem)
3. [Three engines](#3-three-engines)
4. [Engine A — Proof](#4-engine-a--proof-converts)
5. [Engine B — Authority](#5-engine-b--authority-earns-the-links)
6. [Engine C — Corpus](#6-engine-c--corpus-captures-demand)
7. [The blog decision](#7-the-blog-decision)
8. [How a page is written](#8-how-a-page-is-written)
9. [Distribution](#9-distribution--where-audience-one-actually-is)
10. [Cadence and ownership](#10-cadence-and-ownership)
11. [Measurement by engine](#11-measurement-by-engine)
12. [Kill list](#12-kill-list)
13. [First 90 days](#13-first-90-days)
14. [Corrections to the companion document](#14-corrections-to-the-companion-document)

---

## 1. What the data actually contains

Measured against `api.alphaday.com/v1` on 31 Aug 2026 using the credentials in `.env.local`. These
are counts, not estimates.

| Dataset | Endpoint | Records | Has a page today |
| --- | --- | --- | --- |
| News items | `/items/news/` | **431,951** | No |
| Governance forum posts | `/items/forum/` | **61,886** | No |
| Videos | `/items/videos/` | **34,230** | No |
| Podcast episodes | `/items/podcasts/` | **22,618** | No |
| Project blog posts | `/items/blogs/` | **18,871** | No |
| DAO proposals | `/items/dao/` | **6,591** | No |
| Events | `/items/events/` | **6,041** | No |
| On-chain DEXes | `/onchain-dexes/` | **725** | No |
| Exchanges | `/exchanges/` | **150** | No |
| **Security exploits** | `/security/exploits/` | **164** | **No — and nobody has noticed it** |
| TVL / yields / stablecoins / fees | `/tvl/*` | — | No (returns `401` with app credentials — different auth tier) |

Seven content types sum to **582,188 items**, so the homepage's "500k+ indexed items" is accurate and
conservative. It could honestly say 580k+.

**The finding that matters:** `/security/exploits/` is a fully structured incident database —
protocol, date, attack type, source URL, and a written 150-word description per record — and it
appears nowhere in the product, nowhere on the site, and nowhere in the companion document's list of
content types. It is the highest-value SEO asset in the API and it is currently invisible.

Two more datasets have no marketing surface at all: **6,041 events** and **725 DEXes**.

---

## 2. The strategic problem

The audience priority in [CLAUDE.md](../CLAUDE.md) puts agent builders first and app users third.
Search volume runs exactly the other way. That is fine and the companion document handles it.

The problem it does not handle is **authority**. Three facts compound:

1. **Programmatic corpora are authority-hungry.** Google crawls and indexes long-tail database pages
   in proportion to how much it trusts the domain. Thin trust means a fraction of 36,000 pages ever
   get indexed, regardless of how good the template is.
2. **Alphaday's entire content property is off-domain.** Twelve Substack articles, linked out twelve
   times from every page footer. Whatever authority the site has built, it has been exporting.
3. **There is no link acquisition plan anywhere in the current documents.** Not one line. The
   companion document's measurement section has no link metric at all.

Meanwhile the company holds datasets that no competitor has assembled, that journalists and
researchers cite by nature, and that cost nothing to publish because they are already in a database.

**So the content strategy is: stop thinking of content as writing, and start thinking of it as
queries.** The link engine should be a cron job.

---

## 3. Three engines

Order is a dependency order, not a priority order. Each engine feeds the next.

| Engine | Pages | Job | Success metric |
| --- | --- | --- | --- |
| **A · Proof** | ~30 | Convert the visitor who already knows they need this | First API call / MCP install |
| **B · Authority** | ~10 + recurring | Earn links, citations and press | Referring root domains, model citations |
| **C · Corpus** | 10k–36k | Capture long-tail demand | Indexed / submitted, by tier |

Engine C is the one the company is excited about and it is the one that fails without B. Engine B is
cheap, is not staffed anywhere in the current plan, and is the only part of this that produces
compounding domain authority.

---

## 4. Engine A — Proof (converts)

The companion document scopes `/mcp`, the client setup pages, twelve tool pages and the comparison
pages. Those are right and this section does not restate them. Two additions.

### A1 · The recipes tier — the biggest gap in the current plan

One page per use case, each with working code and a real, pasted output. Not tutorials in the
marketing sense — the smallest complete thing that does something.

| Page | The query it answers |
| --- | --- |
| `/recipes/claude-crypto-news` | "give claude live crypto news" |
| `/recipes/dao-proposal-alerts` | "alert me on new DAO proposals" |
| `/recipes/crypto-research-agent` | "build a crypto research agent" |
| `/recipes/discord-bot-crypto-data` | "crypto data for a discord bot" |
| `/recipes/weekly-ecosystem-digest` | "automate a crypto newsletter" |
| `/recipes/sentiment-from-podcasts` | "analyse crypto podcasts programmatically" |

Why this format specifically:

- It is the highest-converting developer content type there is. Someone who runs your snippet has
  already integrated.
- It is **the format language models quote most often**, because it is a complete answer with
  runnable code rather than a claim about a product.
- It targets long-tail intent that no keyword tool will show you and no competitor is writing.
- **The name already exists in the product.** "Recipes" is one of the five products on the homepage
  ([productsData.jsx](../src/components/home/productsData.jsx)). Marketing content and product
  vocabulary reinforcing each other is free brand equity.

Six pages. Two days of engineering-quality writing. Highest revenue per hour on the whole list.

### A2 · The exploits API is a product page you do not have

`get_exploits` is not in the twelve tools in [apiSurface.js](../src/data/apiSurface.js). A structured
security-incident endpoint is genuinely differentiated — no incumbent crypto data API exposes one —
and it is the sort of tool an agent builder immediately understands the use for. Ship it as a
thirteenth tool with its own `/api/tools/get-exploits` page.

---

## 5. Engine B — Authority (earns the links)

Five assets. Each one is a query against data Alphaday already owns, published on a recurring
schedule. After the pipeline is built, marginal cost per publication is close to zero.

The selection test: **could a competitor produce this?** If yes, it is not on this list.

#### The filter that found most of these

SERP research on 31 Aug 2026 produced a repeatable test, and it is more useful than any individual
asset below:

> **Attack SERPs owned by hand-curated listicles, and publish the live, data-ranked version.**

Listicle SERPs are structurally weak. They are stale the day after publication, they are written by
companies with no authority in the topic — tax tools, marketing agencies, exchanges chasing affiliate
revenue — and they cannot update. A page that ranks by *measured behaviour* and refreshes on a
schedule beats them on every axis Google claims to weigh. The test is not "do we have data here", it
is **"is the incumbent a listicle."**

### B1 · The Alphaday Governance Report — `/research/governance`, monthly

**Source:** 6,591 proposals (`/items/dao/`) joined against 61,886 forum posts (`/items/forum/`),
across the 51 DAOs and 59 forums already in the index.

**The claim nobody else can make:** Alphaday is the only place that has the proposals *and* the
forum discussion that preceded them in one queryable set. Snapshot has votes. The forums have
threads. Nothing joins them.

Metrics that do not currently exist in public anywhere:

- Proposal velocity per DAO, month over month
- Share of proposals that had prior forum discussion — a proxy for governance health
- Median time from forum thread to on-chain vote
- **The dead-DAO index** — treasuries with no proposal in 90 days. This is the headline. It is
  uncomfortable, specific, and journalists will run it.

**Why it earns links:** DAO governance is chronically under-measured and heavily written about.
Delegates, governance researchers, DL News, Blockworks and The Block all need participation numbers
and there is no standard source. A recurring primary source becomes the citation by default.

**Secondary effect:** delegates discuss the report in the same governance forums Alphaday indexes.
The content loop closes on itself.

### B2 · The Crypto Exploit Tracker — `/security/exploits` + a page per incident, continuous

**Source:** `/security/exploits/` — 164 records, each with protocol, date, attack type, source URL
and a written description.

**Blocker, and it is the whole thing:** `amount_usd` is populated on **25 of 164** records and
`chain` on **4 of 164**. The loss amount is the fact people search for, cite, and link to. A hack
tracker without dollar figures is not a hack tracker. Backfilling that field is the single
highest-leverage data task in this document.

**Second constraint:** 163 of the 164 records are dated 2026. This is a live feed, not a historical
archive. Until it is backfilled, position it as *"crypto exploits, 2026"* — accurate and still
valuable — rather than as a database of all time.

**The competitive picture — revised 31 Aug after SERP research.** An earlier draft of this document
claimed nobody owned the structured slot for crypto hacks. That was wrong, and the correction matters
for sequencing:

| Incumbent | What it holds |
| --- | --- |
| [DefiLlama `/hacks`](https://defillama.com/hacks) | A hacks database *with loss amounts*, on a very high-authority domain |
| [DeFiHackLabs explorer](https://defihacklabs.io/explorer/index.html) | Root-cause and reproduction detail — and, per the `source` field on the records, **where Alphaday's 164 rows come from** |
| Rekt | The narrative slot |
| financefeeds, BeInCrypto, CCN, Finbold | The `biggest hacks of 2026` listicle SERP |

So the data is not proprietary and the packaging is not unclaimed. **What is still open:**

- **`{protocol} exploit` as a query.** DefiLlama's is one table, not per-incident URLs. Nobody has
  built the individual incident pages.
- **The join with news coverage.** No incumbent connects the incident to what the crypto media wrote
  about it — and that join is the one thing Alphaday's index does better than any of them.
- **The MCP tool.** No security-incident endpoint exists in any crypto MCP server.

**One useful validation:** press reports [164 incidents year-to-date](https://www.ccn.com/education/crypto/defi-hacks-exploits-causes-crypto-stolen-2026/)
totalling roughly $1.2B. Alphaday's table has exactly 164 rows. **Coverage is complete; only the
amounts are missing, and they are publicly available to backfill against.**

**Revised verdict:** still worth building, for the three open angles above and because every new
incident is a publishing event with built-in distribution. **But it is not the authority engine an
earlier draft billed it as, and it should not automatically ship first.** See
[§13](#13-first-90-days).

**Third-order benefit, unchanged:** it is proof of the layer thesis. Security incidents are exactly
the kind of data type a "crypto data layer" should have and a price API should not.

### B3 · The Narrative Index — `/research/narratives`, weekly

**Source:** `/keywords/trending/` joined across 49 news outlets, 118 podcast feeds and 121 YouTube
channels.

**The claim:** the only public measure of crypto *media* attention — what is being talked about, as
distinct from what is being traded. Attention, not price. Everyone measures price.

Recurring, naturally social, and the weekly rhythm makes it a standing reason for people to link and
subscribe. It is also the most direct possible demonstration of `get_trending_keywords`.

### B4 · The Crypto Events Calendar — `/events`, evergreen with dated entries

**Source:** `/items/events/` — 6,041 records spanning conferences, meetups, hackathons and
educational sessions.

`crypto conferences 2026` and its per-city variants are real, recurring, seasonal queries, and event
calendars attract links from a category of site nothing else does: conference organisers, city guides
and community newsletters, all of whom link *out* to calendars as a matter of course. `Event` schema
earns rich results. This is the cheapest link acquisition on the list because the outreach is
inbound — organisers want to be listed.

**Competitive picture, checked 31 Aug:** [Blockspot](https://blockspot.io/events/) is the only real
incumbent. The rest of the first page is [Ninjapromo](https://ninjapromo.io/best-crypto-conferences),
[Outrun](https://www.outrun.at/crypto-calendar) and
[Qubika](https://qubika.com/blog/list-of-blockchain-cryptocurrency-conferences/) — hand-maintained
lists. Another listicle SERP, and 6,041 records beats all of them on coverage alone.

### B5 · Media discovery — the best-shaped opportunity found in the research

*`best crypto podcasts` · `best crypto youtube channels` · `best crypto news sites` ·
`best crypto newsletters`*

**Source:** 118 podcast feeds (22,618 episodes), 121 YouTube channels (34,230 videos) and 49 news
outlets — every one of them already indexed with publish timestamps.

**Who owns these SERPs today:** [CoinLedger](https://coinledger.io/tools/top-bitcoin-and-cryptocurrency-podcasts),
[Coinbound](https://coinbound.io/best-cryptocurrency-podcasts/),
[Koinly](https://koinly.io/blog/best-crypto-news-websites/),
[BitDegree](https://www.bitdegree.org/crypto/tutorials/best-crypto-youtube-channels),
[Milk Road](https://milkroad.com/social/youtube/) and
[Feedspot](https://podcast.feedspot.com/cryptocurrency_podcasts/). Every one hand-written, none
backed by data, and not one of them an authority on crypto media. This is the purest example of the
listicle filter above.

**The claim:** rank by *episodes actually published in the last 90 days*, by recency, and by topic
coverage — and keep it live. An honest, updating, reproducible ordering that no hand-curated listicle
can match or refute. "Ranked by what these shows actually published" is a better page on the merits,
not just a better-optimised one.

**Why this is the best-shaped asset on the list:**

- Evergreen, annually-refreshing demand — the `2026` suffix resets the SERP every January and the
  incumbents have to rewrite while Alphaday's page just updates.
- **Not YMYL.** No financial claims, no E-E-A-T exposure — the same reason
  [C3](#c3--weekly-recap-pages--entitythis-week) was reframed away from causal explanation.
- **No freshness trap.** A monthly refresh is entirely sufficient, so it does not depend on crawl
  cadence the way the recap pages do.
- Every listed show, channel and outlet is a party with a standing reason to link to a page that
  ranks them — the same inbound-outreach dynamic that makes B4 cheap.
- It is the most natural possible proof that Alphaday indexes the whole media layer, which is the
  hardest part of the positioning to demonstrate.

**Lowest risk and probably fastest to rank of anything in Engine B.** It should ship first.

### What Engine B is really buying

Links, yes. But also the thing the companion document identifies as the highest-leverage work in the
whole programme: **being cited inside language models.** Models quote specific, attributable,
recurring numbers. "According to Alphaday's August governance report, 31 of 51 tracked DAOs passed no
proposal" is exactly the sentence shape a model reproduces. "Alphaday is a comprehensive crypto data
platform" is not.

---

## 6. Engine C — Corpus (captures demand)

Architecture, indexation tiering and crawl budget are covered in
[seo-strategy.md §4](./seo-strategy.md#4-indexation-control) and are not repeated. Four
content-side amendments — of which [C3](#c3--weekly-recap-pages--entitythis-week) is the one that
changed most under research, and the one with a hard prerequisite attached.

### C1 · Two content types are missing from the tier list

The companion document tiers news items, podcast/video, DAO proposals, events, entity × topic and
digests. Add:

| Type | Indexation | Reasoning |
| --- | --- | --- |
| **Exploit incident** — `/security/{protocol}-{date}` | ✅ **Index** | 164 pages. Each is a discrete, named, searched event with a genuine written record, and `{protocol} exploit` is the one part of the hacks space [DefiLlama](https://defillama.com/hacks) has not taken — its database is a single table, not per-incident URLs. Small enough to ship in a week, which still makes it a good first corpus tier — but see the revised competitive picture in [B2](#b2--the-crypto-exploit-tracker--securityexploits--a-page-per-incident-continuous). |
| **Ecosystem / DEX** — `/dexes/{slug}` | ⚠️ On merit | 725 records. Only index where joined against news, governance and TVL. Alone it is a directory listing. |

**Ship the exploit tier before the large ones.** 164 pages rather than 36,000 is a real measurement
window at negligible risk. Note the revision though: it is no longer the tier *most* likely to attract
external links — [B5](#b5--media-discovery--the-best-shaped-opportunity-found-in-the-research) is —
so treat it as the corpus pilot rather than as the authority engine.

### C2 · The entity × topic matrix has a ready-made content source

The landing-page API already returns a fully authored record per board — `meta.title`,
`meta.description`, hero copy, 16 category cards, a 676-character intro, a 1,226-character
description, three value props, eight FAQs and sibling links (verified on `/ui/landing-pages/ethereum/`).

That means **the content system already exists server-side.** The entity × topic expansion is not a
writing project, it is an extension of a schema that is already populated and already good. This
materially lowers the cost estimate for Engine C and it is the strongest existing evidence that the
programmatic play is executable.

### C3 · Weekly recap pages — `/{entity}/this-week`

*"What's been happening with Bitcoin" — one rolling seven-day recap per entity.*

An earlier draft of this section proposed causal pages (*"why is bitcoin up today"*) at one evergreen
URL per asset. SERP research on 31 Aug corrected two claims in that proposal, and the recap framing
replaced it. Both corrections are recorded here because they are the reason the design changed.

#### What the research changed

| Earlier claim | What is actually true |
| --- | --- |
| These are news SERPs; you would need Google News and Top Stories eligibility | **Overstated.** [Mudrex](https://mudrex.com/learn/bitcoin-down-today/), [BeInCrypto](https://beincrypto.com/why-is-the-crypto-market-down-today/) and [Coinpedia](https://coinpedia.org/crypto-live-news/why-bitcoin-price-usd-is-down-today/) all hold positions with dateless evergreen URLs, and none is a news publisher — Mudrex is an exchange's learn section. **The evergreen-URL architecture is validated by live evidence.** |
| The long tail is uncontested — CoinDesk will never cover Injective | **Wrong, and this one changed the plan.** The top result for `why is injective down today` is [CoinMarketCap's CMC AI price-analysis page](https://coinmarketcap.com/cmc-ai/injective/price-analysis/). [CMC AI launched in May 2025](https://www.theblock.co/press-releases/354872/coinmarketcap-launches-first-phase-of-cmc-ai) with pre-generated answers across all major token pages. They built the causal-explanation page at full asset coverage, over a year ago, on far more authority. |

The causal tier therefore fails the listicle filter in [§5](#the-filter-that-found-most-of-these): its
incumbent is not a stale hand-written list, it is a better-resourced version of the same idea.

#### Why the recap framing is the right replacement

*"What's been happening with X"* beats *"why is X up"* on every axis:

- **No causal claim**, so no YMYL exposure and nothing to be publicly wrong about. The entire risk
  profile of the earlier proposal disappears.
- **It is honestly what the data is.** A digest of indexed items in a window is what Alphaday can
  actually produce. A causal explanation was always interpretation dressed as fact.
- **It is not head-on against CMC AI.** Theirs is price-explanation shaped; this is editorial-recap
  shaped, and nobody serves it.
- **It is LLM-query shaped.** "What's been happening with X this week" is much closer to what people
  type into ChatGPT and Perplexity than into Google. **This is an AEO play more than an SEO play**,
  which fits audience one better than the causal pages ever did.

Trade-off worth stating: as an exact Google string it is low-volume conversational phrasing. Write
the `h1` conversationally, name the page tightly — *Bitcoin this week*.

#### Why a child URL, and not a panel on the existing landing page

The 66 pages at `alphaday.com/{slug}` are **sales landing pages for the dashboards** — that is why
there are exactly 66, one per published dashboard. Their job is to pitch and convert to
`app.alphaday.com/b/{slug}`.

That rules out putting the recap on them. **A recap panel on a conversion page cannibalises its own
CTA** — it answers the question the click-through was supposed to answer. Two intents, two pages.

The decisive argument is coverage: **a child URL breaks the 66 ceiling.** Landing pages are capped at
the number of published dashboards. Recap pages are capped by data density instead, so
`/injective/this-week` can exist without an Injective dashboard ever being built. That decouples
content coverage from product coverage.

The funnel gets cleaner rather than diluted:

| Page | Job | CTA |
| --- | --- | --- |
| `/{entity}/this-week` | Top of funnel. Earns the links and the model citations. | → the landing page |
| `/{entity}` | Mid funnel. Sells the dashboard. | → the app |
| `app.alphaday.com/b/{entity}` | Conversion | — |

Someone who has just read what happened this week and wants it continuously is precisely the person
for the dashboard. The recap feeds the pitch instead of competing with it. It also fits the
`/{entity}/{topic}` namespace the corpus will want later, where `this-week` sits alongside
`/{entity}/governance` and `/{entity}/podcasts`.

#### The specification

| Decision | Call |
| --- | --- |
| **URL** | One per entity: `/{entity}/this-week`. Dateless, permanent. |
| **Window** | **Rolling seven days**, not calendar week. A calendar week is near-empty on Monday and stale by Sunday; a rolling window always holds a full seven days, and it removes the week boundary that would otherwise invite an archive. |
| **Other windows** | 24h / 7d / 30d as an **in-page control that does not change the URL**. Views, not pages — three URLs per entity would be the dated-archive problem at smaller scale. |
| **Archive** | **None.** No `/{entity}/2026-w35`. The evergreen URL accumulates authority; a dated graveyard sheds it. |
| **Content** | The evidence panel: items indexed in the window, grouped by type and ranked by volume — news across the 49 outlets, podcast and video coverage, governance activity, events, any exploit. Plus the durable context that lets the page rank when the window is quiet. |

#### Two things that would break it

**1 · The recap content must be server-rendered. A client-side fetch cannot be the source.**

This is the single most important implementation constraint. If the recap arrives via a browser fetch
to `api.alphaday.com`, then GPTBot, ClaudeBot, PerplexityBot and CCBot see an empty div — and those
are exactly the crawlers for the AEO play that is this page's main justification. It is finding #2
in the companion document, reproduced on a new page. It also puts `x-app-secret` back in the public
bundle (#20).

Under the ISR decision in [seo-strategy.md §1.3](./seo-strategy.md#13-rendering-strategy-ssr--stale-while-revalidate-at-the-edge): the recap
lives **in the ISR-cached HTML**, regenerated on a revalidation window. A client fetch on top is fine
as a top-up for a user with the tab open — it just cannot be where the content comes from. Crawlers
get complete HTML; users get live data.

Suggested revalidation, matched to volume rather than applied globally: hourly for the handful of
high-volume entities, six-hourly or daily for the rest. Revalidating a thin page hourly when nothing
changed is waste, and it produces exactly the churning `lastmod` the companion document warns about.

**2 · "Updated at = now" is a trust and ranking problem.**

Three timestamps get conflated here, and only two should ever be visible:

- **The data window** — *"7 days to 31 Aug 2026, 14:00 UTC"*. This is what the reader needs, and it
  should be prominent.
- **Last regeneration** — set `dateModified` and sitemap `lastmod` **only when the content actually
  changed**, not on every render.
- **Render time** — meaningless. Never show it.

A timestamp that always reads *today* regardless of whether anything changed is the visible version
of the `lastmod`-on-every-build problem already flagged in the companion document, and Google
discounts `lastmod` once it proves unreliable. It is also a reader-trust problem: "updated today" on
a page whose newest item is four days old teaches people not to believe the page. On a rolling window
this resolves itself honestly — bitcoin will update most days, a thin entity rarely — and that
difference is itself a useful signal.

#### The density gate, measured

Seven-day news volume by tag, from the live API on 31 Aug 2026:

| Tag | 7-day items | Tag | 7-day items |
| --- | --- | --- | --- |
| `bitcoin` | 785 | `sui` | 21 |
| `ethereum` | 222 | `aptos` | 11 |
| `solana` | 182 | `arbitrum` | 8 |
| `base` | 69 | `polygon` | 0 |
| `optimism` | 22 | `avalanche` · `celestia` | 0 |

Two findings.

**The cliff is steep.** After the top three it falls off fast, and below roughly 20 items a week there
is not enough for a recap worth landing on. Build the page only above that threshold, and handle the
runtime case — a rolling window that comes back nearly empty must either widen itself and say so, or
fall back to `noindex`. Given these numbers that will happen often.

**The tag layer is broken, and fixing it is a prerequisite rather than a detail.** `polygon`,
`avalanche` and `celestia` returning zero is not absent coverage — it is a slug mismatch, the same as
`injective`, which returns 0 all-time despite obviously being covered. The trending-keywords endpoint
files "Cronos" under a `crypto-com` tag, so tag slugs demonstrably do not track project names.
**Until the tag audit is done the tier cannot even be sized.** Best estimate afterwards: 15–30
entities, not 66 and not hundreds.

Sector slugs are the pleasant surprise. `/gamefi/this-week`, `/nft/this-week` and `/ai/this-week` are
recap-shaped, carry no price mechanics, and CMC has nothing sector-level keyed to media coverage.

#### Sequencing

Still one page first. **Ship `/bitcoin/this-week`** — the entity with 785 items in the window, so the
page is guaranteed to have something to say — and measure it for a month before building the tier.
It is the cheapest decision-grade experiment available, and the head of this query class is genuinely
more open than the tail, which is the reverse of the earlier assumption.

### C4 · Where the corpus should sit in the queue

After Engine B has been running for a quarter. Not because the pages are wrong, but because the
indexation rate of a large programmatic corpus is a function of domain authority, and Engine B is
what produces domain authority. Shipping C first means paying full production cost for pages that
get crawled at a trickle.

---

## 7. The blog decision

The companion document recommends migrating blog.alphaday.com to `alphaday.com/blog` with 301s.
Agreed, and it is worth doing purely to stop the footer exporting authority twelve times per
pageview.

**But do not read that as an instruction to write more of it.** The existing twelve articles —
*What is Bitcoin?*, *How To Set Up Ethereum Wallet*, *How to Read Crypto Charts* — are a strategic
dead end under the current audience priority:

- They target audience three, the lowest priority.
- They compete against Coinbase, Binance, Investopedia and Wikipedia, all of whom have a decade of
  links on those exact terms.
- Their conversion path to an API call or an MCP install is zero.
- They are the genre most saturated by AI-generated content since 2023, which means both the
  competition and the quality bar have moved permanently against them.

**Migrate them, 301 them, keep them, and stop.** Redirect the editorial budget into Engine B and the
recipes tier. The blog's future output should be engineering and data writing — the governance
report, exploit post-mortems, "how we index 118 podcast feeds" — which reaches audiences one and two
and reinforces the infrastructure positioning the homepage is built on.

---

## 8. How a page is written

The audience for a growing share of this content is not a person reading a page. It is a model
answering a question about you. Both are served by the same discipline.

**Answer in the first two sentences.** No throat-clearing, no "in the fast-moving world of crypto."
The first paragraph should be independently quotable and should contain the claim.

**Every claim carries a number.** The specific counts in
[apiSurface.js](../src/data/apiSurface.js) — 49 outlets, 133 blogs, 118 podcast feeds, 121 channels,
51 DAOs, 59 forums — are worth more than any adjective, because they are verifiable and repeatable.
Vague breadth claims are not reproduced by models; numbers are.

**Tables over prose for anything comparative.** Comparison, pricing and capability information is
extracted far more reliably from a table.

**Show working code, not code-shaped decoration.** Per
[CLAUDE.md](../CLAUDE.md)'s design principles, and per finding #22 in the companion document — the
`curl` commands currently on `/api` do not resolve. A broken command on a developer page is worse
than no command, because it is the first thing both a prospect and a model will try.

**One page, one query.** If a page is trying to rank for two clusters it will rank for neither.

**Date and version everything.** Recurring reports need a visible "last updated" and a stable URL.
Models weight recency signals they can see.

---

## 9. Distribution — where audience one actually is

Google is not the primary discovery surface for agent builders. Ranked by reach per hour of effort:

| Channel | Effort | Why |
| --- | --- | --- |
| **MCP registries** — official servers list, mcp.so, Smithery, Glama, PulseMCP | Days | Covered in the companion document. Still the single highest reach-per-hour item. Gated on the MCP URL resolving. |
| **`public-apis` on GitHub** | Hours | Its inclusion criteria are effectively *free, documented, no auth required*. Alphaday matches exactly. The repo has enormous reach and is scraped into training data and model answers constantly. |
| **`awesome-mcp-servers` and adjacent lists** | Hours | Same mechanism, target audience one directly. |
| **APIs.guru / OpenAPI directory** | Hours | Requires only the `/openapi.json` the companion document already recommends publishing. |
| **Postman public workspace** | A day | Ranks on its own, and gives evaluators a zero-setup way to try the API. |
| **Data PR for Engine B** | Ongoing | Governance report and exploit tracker to research desks at The Block, Blockworks, DL News, Decrypt. This is the actual link engine. |
| **Hacker News** | One shot each | Show HN works for the exploit tracker or the governance report. It does not work for "we made an API." Lead with the dataset. |
| **Farcaster, r/ethdev, r/LLMDevs, delegate forums** | Ongoing | Where the audiences read. The delegate forums are also indexed by Alphaday, which closes a nice loop. |

Note the pattern: **almost none of the highest-value distribution is a webpage.** Budget for it as
its own workstream, not as an afterthought to publishing.

---

## 10. Cadence and ownership

Sized for a small team. The point of Engine B being queries rather than essays is that this is
sustainable at this headcount.

| Cadence | Output | Owner |
| --- | --- | --- |
| Continuous | Exploit tracker updates on new incident | Automated, human review before publish |
| Weekly | Narrative Index | Automated + 200 words of interpretation |
| Weekly | One recipe or one tool page | Engineering, rotating |
| Monthly | Governance Report | Automated + 800 words of interpretation |
| Monthly | Media-discovery rankings refresh (B5) — re-rank on the last 90 days of publishing | Automated, dated on the page |
| Monthly | Prune: `noindex` anything with zero impressions at 90 days | Automated job, reviewed |
| Quarterly | Refresh comparison pages; re-run the model-citation check in §11 | Marketing |

**One-time build:** the Engine B pipeline — query, chart, page, publish. Estimate one engineering
week. Everything after that is interpretation, and interpretation is where the human writing budget
should go.

**The rule that keeps this honest:** no recurring report ships without a human paragraph explaining
what changed and why. That paragraph is the difference between a dashboard and something worth
citing, and it is roughly thirty minutes of work.

---

## 11. Measurement by engine

The companion document's [§7](./seo-strategy.md#7-measurement) covers indexation and cohort
measurement for the corpus. Add per-engine outcome metrics, because the three engines fail in
different ways and a shared dashboard hides that.

| Engine | Primary metric | Leading indicator |
| --- | --- | --- |
| **A · Proof** | First API call, MCP installs | Page → `curl`-copy rate |
| **B · Authority** | **Referring root domains, net new per month** | Unlinked brand mentions; press pickups per report |
| **C · Corpus** | Indexed / submitted, per tier | Impressions by publish cohort |

**Referring domains is the number that is missing from the current plan entirely, and it is the
number that determines whether Engine C works.** Track it monthly, on the domain, with a target.

### A cheap model-citation tracker

There is no rank tracker for language models, so build the minimum viable one. Fix a list of twenty
queries — *"best MCP server for crypto data"*, *"free crypto news API no signup"*, *"how do I give
Claude live crypto data"*, *"where can I get DAO governance data"* — and run them monthly against
ChatGPT, Claude and Perplexity. Log whether Alphaday appears, in what position, and what it is
described as.

Half an hour a month. It is the only direct read on the highest-leverage part of the programme, and
"what it is described as" catches positioning drift long before anything else will.

---

## 12. Kill list

Things that will be proposed and should be refused.

- **More "What is X?" explainer content.** §7. Wrong audience, unwinnable competition, zero
  conversion.
- **Price prediction pages.** Real traffic, and they would poison the brand for the exact audience
  the company is prioritising. Agent builders evaluating an infrastructure vendor who also publishes
  ETH price predictions draw the obvious conclusion.
- **Per-article news pages, indexed.** The companion document is right that this is the fastest route
  to a manual action. It is worth restating because it is the tier with the most records and it will
  keep getting proposed.
- **Dated weekly digest archives, indexed.** 52 thin pages per entity per year, splitting authority
  52 ways. Evergreen URL, `noindex` the archive.
- **Prose generated from an entity name.** Generating over retrieved records is fine. Generating over
  a string is what gets domains removed.
- **Token unlock calendars.** No unlock data in the API, and
  [DefiLlama, CryptoRank, CoinGlass, Tokenomist and DropsTab](https://cryptorank.io/token-unlock) are
  all established. Checked 31 Aug; it will get proposed because it looks adjacent to the events play.
- **Price and airdrop queries.** [`bitcoin price today` is roughly 10M searches/month](https://www.fortismedia.com/en/articles/crypto-keywords/)
  and permanently CoinGecko's; airdrops are a spam SERP and there is no airdrop data. Exchange and
  DEX comparison is the same story — affiliate-driven, and locked by CoinGecko and DefiLlama.
- **Asserting causation you cannot verify.** This is why C3 is a recap and not an explanation. Report
  the evidence and timestamp it; let the reader draw the causal link. A wrong "because" published at
  scale is a brand problem, not just a ranking one.
- **Any page whose only differentiator is that it exists.** If stripping the template leaves nothing
  a person would have wanted, the page is a liability at scale, not an asset.

---

## 13. First 90 days

Sequenced against the companion document's phases. Content work only; the technical prerequisites are
in [seo-strategy.md §8](./seo-strategy.md#8-build-sequence) and gate everything below.

> **Resequenced 31 Aug** after the SERP research in
> [B5](#b5--media-discovery--the-best-shaped-opportunity-found-in-the-research) and the revised
> exploit picture in [B2](#b2--the-crypto-exploit-tracker--securityexploits--a-page-per-incident-continuous).
> Media discovery moves ahead of the exploit tracker: lower risk, weaker incumbents, and no
> dependency on a data backfill.

### Weeks 1–2 · Unblock

- [ ] Fix the `curl` commands on `/api` so they resolve — gates every developer page and every model
      citation
- [ ] Fix `/berachain`: it is featured on the homepage and has no landing-page record (§14)
- [ ] Set the referring-domains baseline and run the first model-citation check
- [ ] Pull the Ahrefs export for the media-discovery cluster — the one number B5 turns on
- [ ] **Audit the news tag slugs.** `polygon`, `avalanche`, `celestia` and `injective` return zero
      tagged news despite obvious coverage. This blocks C3, and it silently degrades every tagged
      surface in the product, not only SEO
- [ ] Start the `amount_usd` / `chain` backfill on the 164 exploit records. It no longer gates the
      first shipped asset, but it still gates B2

### Weeks 3–6 · Engine A + the first Engine B asset

- [ ] **Ship media discovery (B5) first** — the podcast, YouTube-channel and news-outlet rankings,
      data-ranked and dated. Lowest risk, weakest incumbents, fastest to rank
- [ ] `/mcp` and the four client pages *(companion doc)*
- [ ] Six recipe pages
- [ ] Twelve tool pages, plus `get_exploits` as the thirteenth
- [ ] **Ship `/bitcoin/this-week`** as a SERP probe — rolling seven-day evidence panel, dateless URL,
      server-rendered, window shown rather than a render timestamp. One page, not a tier. Measure for
      a month before building the rest (C3)
- [ ] Registry, `public-apis` and awesome-list submissions

### Weeks 7–12 · Engine B at cadence

- [ ] Governance Report #1, with press outreach
- [ ] Events calendar with `Event` schema — the second listicle SERP on the list
- [ ] **Ship the exploit tracker** once the amounts are backfilled — hub plus 164 incident pages,
      aimed at `{protocol} exploit` and the news join, not at out-ranking DefiLlama's table
- [ ] Narrative Index weekly from week 8
- [ ] Blog migration and 301s; no new explainer content
- [ ] Comparison pages
- [ ] Measure indexation on the exploit tier before committing to the entity × topic generator

**Deliberately not in the first 90 days:** the 30–100 pages/day corpus. It ships in month four, after
a small tier has proved indexation and Engine B has produced a quarter of link growth. Shipping it
earlier does not make it rank faster — it makes it rank less.

---

## 14. Corrections to the companion document

Verified against the live API on 31 Aug 2026. All minor, all worth fixing before the numbers get
quoted in a deck.

> **Re-measured 8 Sep 2026.** Two of the unblock items in the combined checklist were audited against
> the live API rather than estimated, and both moved.
>
> **The tag audit is worse than "four slugs".** It is 14 of 66 boards, and the cause is not missing
> coverage — it is that the board slug is used verbatim as the tag filter while the taxonomy uses a
> different one. Polygon's tag is still `matic-network` (pre-rebrand; the token is now `POL`),
> Avalanche is `avalanche-2`, and five more are simply unhyphenated. Worldcoin alone hides 5,173
> articles under `world`. `celestia`, named in the original four, in fact returns 285 and is fine.
> **This breaks the dashboards, not just SEO** — each of those boards renders an empty feed today.
> The mapping is recovered in `scripts/audit-tag-coverage.mjs`, but the fix belongs on the
> landing-page record so one source drives the dashboard, the recap and the sitemap alike. Logged as
> finding 23.
>
> **C3 can now be sized: 16 of 66 boards clear 20 news items a week** — 6 over 100/wk, 10 between 20
> and 100, 20 below 20, 30 at zero. That lands inside this document's own "expect 15–30 entities, not
> 66", which the estimate got right. Sized against the broken slugs it would have read 13.
>
> **The exploit backfill has not started, and the gap is widening.** `amount_usd` is 27/175 (15.4%,
> from 15.2%) and `chain` is 4/175 (2.3%, from 2.4% — coverage *fell*, because 11 new incidents
> arrived and none carried a chain). The number that decides the tier is the intersection, not either
> field: **3 of 175 records (1.7%) have both**, so the 164-page tracker currently has three publishable
> pages. The week-4 gate asks whether this is visibly converging; measured, it is moving the other
> way. Track it with `scripts/audit-exploit-backfill.mjs`.

1. **There are 66 published landing pages, not 70.** `/ui/landing-pages/` returns 66, all published.
   `/ui/views/` returns 67. The sitemap claims 70. The drift flagged as #9 is real and now
   measured.
2. **`oceanprotocol` is the specific orphan.** It is a view with no landing-page record, so the
   sitemap submits a URL that renders a 404 body at HTTP 200.
3. **`berachain` is worse.** It is in `CONFIG.featuredBoards`
   ([config.js:41](../src/config.js#L41)) and linked from the homepage, but it exists in neither the
   views nor the landing-pages set — `/ui/landing-pages/berachain/` returns 404. **The homepage links
   to a broken page.** Not in the companion document, and a one-line fix.
4. **`boards.js` requests the wrong URL shape.** `/ui/landing-pages/{slug}` without a trailing slash
   returns a `301`; the API wants `/ui/landing-pages/{slug}/`
   ([boards.js:26](../src/api/boards.js#L26)). Every landing page pays an extra round trip.
5. **"500k+ indexed items" is conservative.** The seven content types sum to 582,188.
6. **The 66 landing pages are not redirects.** `alphaday.com/ethereum` returns 200 with zero
   redirects and renders the full marketing page; it is `/b/{slug}` that redirects to the app
   ([App.jsx:50](../src/App.jsx#L50)). Easy to conflate, and it matters — their job is to *sell the
   dashboard*, which is why [C3](#c3--weekly-recap-pages--entitythis-week) puts the recap on a child
   URL rather than on them.
7. **`/tvl/*` returns `401` with app credentials.** Yields, stablecoins and fees sit behind a
   different auth tier, so any content plan that assumes access to them needs that resolved first.

### Still unverified

Unchanged from the companion document: current index coverage (no Search Console access), and
keyword volumes (no keyword tool from here — Ahrefs is verified on the domain, so this is one export
away). No volume figures appear in this document for that reason, with one exception noted in §12.

The single most useful export to pull first is **the media-discovery cluster** — whether
`best crypto podcasts` and its siblings are as affiliate-thin and as high-volume as the SERP suggests.
B5's position at the front of the queue turns on that one number.

**Closed on 31 Aug** by SERP research: the competitive picture for exploits (B2), events (B4) and
media discovery (B5) was checked against live results rather than assumed. That research produced one
correction — B2's original claim that the structured hacks slot was unclaimed — which is now recorded
in place.

The market-move SERP question raised in an earlier draft is **also closed**, and it produced the two
corrections now recorded in [C3](#c3--weekly-recap-pages--entitythis-week): the Top Stories barrier
was overstated, and the long tail is held by CoinMarketCap's CMC AI rather than being uncontested.
C3 was rewritten around that finding.

**Still open:** whether the recap framing carries enough classic search volume to justify the tier
beyond the AEO case. The `/bitcoin/this-week` probe in [§13](#13-first-90-days) is the cheapest way to
find out, and it should report before the tier is built.
