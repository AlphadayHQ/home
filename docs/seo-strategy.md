# Alphaday — Technical SEO Implementation

**Scope:** rendering, infrastructure, URL architecture, indexation mechanics, crawl budget and
migration.
**Companion:** [seo-content-strategy.md](./seo-content-strategy.md) — what to publish, which content
types sit in which indexation layer, editorial standards and distribution. This document does not
cover any of it.

The split: **this document decides how a page is served and whether it can be indexed. The content
document decides whether a page should exist and whether it deserves to be.**

---

## Decisions

| Area | Decision |
| --- | --- |
| **Framework** | TanStack Start — TanStack Router + Vite, file-based routing |
| **Rendering** | SSR, cached at the edge with `stale-while-revalidate` |
| **Caching** | CloudFront only — no origin cache layer |
| **CDN** | CloudFront, origin = the instance directly. No ALB, no nginx |
| **Compute** | Single EC2 `t4g.micro`, ARM64, Amazon Linux 2023, eu-west-1, in an ASG at min=max=1 |
| **Estimated cost** | ~$12/month at launch — see [Appendix A](#appendix-a--cost-model) |
| **URL scheme** | Path-prefixed (`/projects/`, `/governance/`, `/security/`, `/events/`), 301s from the current root slugs |
| **Indexation** | Three-layer mechanism — promoted / on-merit / substrate |
| **Capacity assumption** | 10k–36k pages within a year, per the content plan |

One decision deliberately deferred: **image optimisation** (§2.6). It is a launch blocker, not a
nice-to-have.

---

## Contents

1. [Architecture](#1-architecture)
2. [Infrastructure](#2-infrastructure)
3. [URL architecture](#3-url-architecture)
4. [Indexation control](#4-indexation-control)
5. [SEO requirements](#5-seo-requirements)
6. [Machine readability](#6-machine-readability)
7. [Measurement](#7-measurement)
8. [Build sequence](#8-build-sequence)
- [Appendix A — Cost model](#appendix-a--cost-model)
- [Appendix B — Regression guard](#appendix-b--regression-guard)
- [Appendix C — Migration and URL preservation](#appendix-c--migration-and-url-preservation)

---

## 1. Architecture

### 1.1 The requirement

The site must serve **complete, server-rendered HTML to clients that do not execute JavaScript.**
This is not a performance preference. Googlebot renders JS on a queued second pass; Bingbot is
weaker at it; and **GPTBot, ClaudeBot, PerplexityBot, CCBot and Google-Extended do not execute
JavaScript at all.**

Per [CLAUDE.md](../CLAUDE.md), audience one is AI agent builders — people who find tools by asking a
model. Being unreadable to model crawlers is the most expensive possible failure mode for this
business, and it is the current state of production.

### 1.2 Why TanStack Start

- **Route count stays constant.** The corpus lives behind dynamic segments (`$slug`), so there are
  25 route files (§3.2) regardless of whether the site has 66 pages or 100,000. Build time never
  scales with content — which is why build-time static generation was rejected.
- **Vite builds in seconds** where a comparable Next.js App Router build would grind.
- **Materially lighter runtime than Next App Router** — no RSC machinery, no large resident route
  manifest. On a 1 GB instance that headroom is the difference between comfortable and marginal.
- **No vendor-specific build output.** It is a Node server, deployable anywhere, with no OpenNext-style
  community reimplementation in the dependency path.
- **Type-safe routing** makes the invariants in [§5](#5-seo-requirements) enforceable at compile time
  rather than by convention.

### 1.3 Rendering strategy: SSR + stale-while-revalidate at the edge

TanStack Start has no ISR primitive. That capability comes from the CDN instead, which suits this
corpus better than framework-level ISR would.

Next.js ISR revalidates on a schedule, regenerating pages nobody requested. With a long tail of item
pages that are never visited, that is pure waste. **CloudFront regenerates only on
request-after-expiry, so pages nobody asks for cost nothing.**

```
Client → CloudFront (SWR cache) → Node (TanStack SSR) → api.alphaday.com
```

| Layer | Responsibility |
| --- | --- |
| CloudFront | Edge cache for HTML and assets, SWR revalidation, TLS, the 1 TB free-tier egress allowance |
| Node | Render only on cache miss |
| API | Data, called only on render |

**There is no origin cache layer.** An earlier draft placed nginx `proxy_cache` between CloudFront
and Node on the assumption that CloudFront could not do stale-while-revalidate. That assumption was
wrong — [CloudFront has supported `stale-while-revalidate` and `stale-if-error` since May
2023](https://aws.amazon.com/about-aws/whats-new/2023/05/amazon-cloudfront-stale-while-revalidate-stale-if-error-cache-control-directives/),
in all edge locations, at no additional cost. A second cache layer would add a second place for stale
content to hide and a second process to operate, for no capability the edge does not already provide.

### 1.4 Render volume

Only cache misses reach Node. Note that **crawlers dominate render volume**, because they
systematically walk the long tail where edge hit ratio is worst — human traffic concentrates on a
small hot set that caches well.

| Traffic | Human misses | Bot requests / misses | Renders/month | Sustained vCPU | vs 0.2 baseline |
| --- | --- | --- | --- | --- | --- |
| 100k PV | ~30% | 300k / ~50% | ~180,000 | 0.007 | 4% |
| 1M PV | ~15% | 1M / ~50% | ~650,000 | 0.025 | 13% |
| 5M PV | ~10% | 2M / ~50% | ~1,500,000 | 0.058 | 29% |

A `t4g.micro` serves 5M pageviews/month plus heavy crawl at under a third of its CPU baseline, with
burst credits on top.

**CPU is not the only ceiling, and probably not the first one.** Each render blocks on
`api.alphaday.com`, so a single Node process is bounded by in-flight concurrency and upstream latency
as much as by CPU: at ~100 ms of CPU against a ~300 ms upstream call, two thirds of each render's
wall-clock is waiting, and the practical limit is how many concurrent render contexts fit in memory
rather than how many CPU-seconds are available.

**This is the real reason the design survives on one small instance, and it is worth stating
plainly:** SWR means almost every render is a *background revalidation*, not a user waiting. Nobody
is blocked on the queue, so upstream latency degrades throughput rather than user-visible TTFB. Take
SWR away and the concurrency ceiling becomes the binding constraint immediately.

> **The ~100 ms/render figure is asserted, not measured, and the whole instance-sizing argument rests
> on it.** Calibrate it against a real page during Phase 2 — render one project page under load and
> measure CPU time and wall-clock separately. If CPU per render is materially above ~100 ms, or
> upstream latency above ~500 ms, revisit §2.7 before launch rather than after.

Miss rates are pitched conservatively because CloudFront caches **per edge location**: a page fetched
from twenty different edges produces twenty origin fetches, where a single origin cache would have
produced one. That fan-out is real, but SWR defuses it — those are background revalidations while
users are served stale instantly, so it is a small cost rather than a latency event. If it ever stops
being small, Origin Shield collapses it globally (§2.5).

---

## 2. Infrastructure

### 2.1 Instance

`t4g.micro` — 2 burstable vCPU at a 0.2 vCPU baseline, 1 GB RAM, Amazon Linux 2023, ARM64.

**Run it in an Auto Scaling Group at min=max=1**, with an EC2 health check. This costs nothing and
buys automatic instance replacement: a dead instance is rebuilt in minutes without anyone waking up,
and CloudFront serves stale from `stale-if-error` in the meantime. It is the cheapest resilience in
the whole design.

**Enable T4g Unlimited, and set a billing alarm on it.** Unlimited is the correct safety valve for
crawler bursts, but Graviton surplus credits bill at $0.04/vCPU-hour — a runaway process pinning both
vCPUs for a month costs ~$58, roughly ten times the instance. The alarm matters more than the
setting.

### 2.2 Memory discipline

1 GB is workable but not generous. Three rules:

- **Never build on the instance.** A production build needs multiples of the available RAM. Build in
  CI, ship the artifact.
- **Cap the V8 heap explicitly:** `NODE_OPTIONS=--max-old-space-size=700`. Without it V8 sizes its
  heap from total system memory and walks into the OOM killer under load.
- **Budget for the OS** (~120 MB) before sizing anything else. With no origin cache process, Node has
  the rest of the box to itself.

### 2.3 Cache headers

The application emits `Cache-Control` per route; CloudFront honours it. This is the ISR equivalent,
and it is the only caching configuration in the system.

```
Cache-Control: public, max-age=0, s-maxage=3600,
               stale-while-revalidate=86400, stale-if-error=604800
```

- `max-age=0` — browsers always revalidate, so a user never holds a stale page.
- `s-maxage` — how long the edge treats the page as fresh. Tune per tier: minutes for digests and
  trending pages, hours for entity hubs, days for editorial and tool pages.
- `stale-while-revalidate` — the edge serves the cached copy **instantly** and refreshes behind it.
  This is what keeps render volume low and TTFB flat.
- `stale-if-error` — the edge serves stale when the origin errors. This is what makes a deploy or an
  instance replacement invisible. Set it generously; a week of stale beats an error page.

Two behaviours worth knowing, both confirmed against
[a published behavioural test](https://dev.classmethod.jp/en/articles/cloudfront-stale-if-error-origin-timeout-behavior/):

1. **`stale-if-error` waits for the origin fetch to fail before serving stale**, unlike
   `stale-while-revalidate`, which serves stale immediately. A Node restart refuses connections
   instantly so it resolves fast — but a *slow* origin blocks until CloudFront's origin timeout. See
   §2.5.
2. **The stale window is bounded.** Once age exceeds `s-maxage + stale-if-error`, CloudFront returns
   a 504 rather than stale content.

### 2.4 Storage

10 GB gp3 — OS, application artifact and logs only. With caching at the edge there is no page cache
on disk.

### 2.5 CloudFront

Origin points at the instance directly. No ALB at launch — it would add ~$25/month for high
availability a single-instance deployment does not have anyway. The ASG in §2.1 covers instance
death; §2.7 covers the upgrade path.

**Tune the origin timeouts down from their defaults.** Because `stale-if-error` waits for the fetch
to fail, the origin timeout *is* the worst-case latency when the instance is throttled or wedged.
Connection timeout 2–3 s rather than the default 10 s; response timeout ~10 s rather than 30 s. A
throttled origin should degrade to stale quickly instead of hanging.

**Cache static assets aggressively** with content-hashed filenames and a long `max-age`. These are
immutable and should never reach the origin twice.

**Do not invalidate for routine content updates.** CloudFront allows 1,000 invalidation paths per
month free, then charges $0.005 per path — at 30–100 updated pages/day that is roughly $10/month
plus minutes of propagation latency per purge. Let `s-maxage` expire and SWR refresh naturally.
Reserve invalidations for urgent corrections.

**Origin Shield is the escape hatch, not the default.** CloudFront collapses simultaneous requests
per edge location, not globally, so a page expiring across many edges produces many origin fetches.
SWR makes those background revalidations rather than blocking requests, so it should stay a minor CPU
cost. Enable Origin Shield only if the render volume in §1.4 turns out materially worse in practice —
it adds a per-request charge.

### 2.6 Images

TanStack Start has no `next/image` equivalent, and **page weight is the dominant cost lever above
~1.2M pageviews/month**: at 800 KB per pageview the CloudFront free tier covers ~1.2M pageviews; at
300 KB it covers ~3.3M.

This needs a decision before launch. Either a CloudFront image handler behind an `/img/` path prefix,
or a third-party image CDN. Raw `<img src>` with unoptimised originals is not an acceptable outcome —
it is the single largest controllable line in the infrastructure bill.

### 2.7 Deploys and the upgrade path

Single instance means a brief origin gap on restart. Node refuses connections instantly while it is
down, so CloudFront falls through to `stale-if-error` quickly and the gap is largely invisible.

An ALB does **not** solve this on its own — it is a router, not a cache, and with one target it has
nowhere to route. The real fix is two instances with rolling deploys, which is a different design at
a different price:

| | **Design A — chosen** | Design B |
| --- | --- | --- |
| Shape | 1 × `t4g.micro`, ASG min=max=1 | 2 × `t4g.micro` + ALB |
| Cost | ~$12/mo | ~$50/mo |
| Deploys | Brief gap, absorbed by `stale-if-error` | Rolling, zero gap |
| Instance failure | Auto-replaced in minutes, stale served meanwhile | Transparent |
| AZ failure | Down until replaced | Survives |

Design A is chosen because for a marketing site behind a CDN with `stale-if-error`, a few seconds of
origin gap on deploy is genuinely invisible, and $38/month buys availability not yet needed. Move to
B when deploy frequency or a real outage makes it concrete.

> **If you go to Design B, keep the instances in *public* subnets** with security groups locked to
> the ALB. Private subnets require a NAT gateway to reach `api.alphaday.com` — ~$32/month plus data
> processing, which more than doubles the cost of the whole design.

---

## 3. URL architecture

### 3.1 Path prefixes

The current site serves project pages at root-level slugs (`alphaday.com/ethereum`). **The rebuild
moves these under path prefixes**, with 301s from the old URLs.

Two reasons, both structural:

1. **A root-level catch-all is fragile.** It is why `/dashboards` currently resolves to a 404 body at
   HTTP 200 — any unmatched single-segment path falls into the project matcher.
2. **Segmentation is mandatory at this volume.** Path prefixes are what make it possible to measure
   each content tier separately in Search Console, and to quarantine a tier that underperforms
   without touching `/api`, `/mcp` or the homepage.

Sixty-six 301s is a trivial, well-understood operation. Blocking clean segmentation permanently to
avoid it is not a good trade. See [Appendix C](#appendix-c--migration-and-url-preservation).

### 3.2 Route map

Prefixes are allocated per content type so each is separately measurable and separately
quarantinable. Which types exist and what goes on each page is the content document's decision; this
is the routing surface that supports them.

```
src/routes/
  __root.tsx                       →  shared shell, base head config
  index.tsx                        →  /
  api.index.tsx                    →  /api
  api.docs.tsx                     →  /api/docs
  api.tools.$tool.tsx              →  /api/tools/{tool}
  mcp.index.tsx                    →  /mcp
  mcp.$client.tsx                  →  /mcp/{client}
  recipes.$slug.tsx                →  /recipes/{slug}
  dashboards.tsx                   →  /dashboards
  projects.$slug.index.tsx         →  /projects/{slug}
  projects.$slug.$topic.tsx        →  /projects/{slug}/{topic}
  projects.$slug.this-week.tsx     →  /projects/{slug}/this-week
  security.exploits.tsx            →  /security/exploits
  security.$incident.tsx           →  /security/{protocol}-{date}
  governance.$id.tsx               →  /governance/{id}
  research.$slug.tsx               →  /research/{slug}
  events.index.tsx                 →  /events
  events.$id.tsx                   →  /events/{id}
  media.$id.tsx                    →  /media/{id}
  news.$id.tsx                     →  /news/{id}
  blog.index.tsx                   →  /blog
  blog.$slug.tsx                   →  /blog/{slug}
  compare.$slug.tsx                →  /compare/{slug}
  mobile.tsx                       →  /mobile
  privacy.tsx                      →  /privacy
```

Twenty-five files covering an unbounded corpus.

Two things in this map are load-bearing and easy to break:

- **`security.exploits.tsx`, not `security.index.tsx`.** Dots are path separators; `.index` resolves
  to the directory root, so `security.index.tsx` would serve `/security`, not `/security/exploits`.
- **`projects.$slug.this-week.tsx` and `projects.$slug.$topic.tsx` both match
  `/projects/{slug}/this-week`.** It resolves correctly because TanStack Router ranks static segments
  above dynamic ones — but that precedence is doing real work here. If the digest route ever stops
  resolving, this is why. Cover it with a route test rather than trusting the convention.

**Route ownership.** This document allocates the routing surface; it does not commission the pages.
`/mcp`, `/mcp/{client}`, `/api/tools/{tool}`, `/recipes/{slug}`, `/compare/{slug}`,
`/security/exploits`, `/research/{slug}` and `/events` are all owned by
[the content document](./seo-content-strategy.md#13-first-90-days). Its §13 currently marks `/mcp`
and the client pages as *"(companion doc)"* — that reference is now stale and points back here; it
needs updating so `/mcp` has exactly one owner. **Given CLAUDE.md makes MCP the wedge for audience
one, an unassigned `/mcp` is the most consequential gap in either plan.**

---

## 4. Indexation control

Publishing a page and indexing a page are separate operations, and the system must be able to do the
first without the second. **This section is the mechanism. Which content types sit in which layer is
[the content document's §6](./seo-content-strategy.md#6-engine-c--corpus-captures-demand).**

### 4.1 Three layers

| Layer | `noindex` | In sitemap | Linked from hubs |
| --- | --- | --- | --- |
| **Promoted** | no | yes | yes |
| **On merit** | until the gate passes | once promoted | yes |
| **Substrate** | always | never | yes — this is its only job |

**Substrate is discovery scaffolding and nothing more.** An earlier draft justified it as providing
"crawlable link targets and freshness signals for the tiers above." The second half of that is wrong
and the correction matters, because it was holding up a whole architectural layer.

Google treats a long-lived `noindex` page as effectively `noindex, nofollow` — once the page settles
into that state, its outbound links stop passing signal. So substrate can route a crawler *inward*
for a while, but it cannot push freshness or equity *upward* to hubs, ever. It is a decaying asset.

That changes the cost-benefit sharply, because §4.4 already names crawl budget as the binding
constraint. **Prefer no URL over a `noindex` URL** wherever a page has no purpose independent of
being crawled: link straight to the source instead, and keep the crawl budget for pages that can
rank. Reserve substrate for cases where the page genuinely needs to exist for users and merely must
not be indexed.

The policy call — which content types warrant a URL at all — belongs to
[the content document](./seo-content-strategy.md#6-engine-c--corpus-captures-demand). This is the
mechanism note it should be decided against: a `noindex` news-item tier at several hundred thousand
URLs would be close to pure crawl-budget cost.

### 4.2 Implementation

- **Every page carries an explicit index state**, computed by the generator, not inferred at render
  time. Default to `noindex`; promotion is an action, not an absence.
- **Emit both `<meta name="robots">` and the `X-Robots-Tag` header.** The header is what non-HTML
  responses and some crawlers actually honour.
- **The sitemap builder reads the same field.** It cannot include a page the generator marked
  substrate. This is the invariant that prevents the current site's failure mode, where the sitemap
  and the page set are derived from different sources and drift.
- **Promotion and demotion are a scheduled job**, not a manual review. It reads Search Console
  performance data and moves pages between layers against the thresholds the content document sets.

  **Use the bulk data export, not per-URL API calls.** The URL Inspection API is rate-limited to
  around 2,000 queries/day, which cannot cover a 36,000-page corpus on any useful cycle. Configure
  the Search Console bulk export to BigQuery and query it in aggregate. This adds a small recurring
  cost — see [Appendix A](#appendix-a--cost-model).

### 4.3 Pruning

**Demote on evidence of failure, not on absence of evidence.** The obvious rule — "no impressions
after 90 days, return to `noindex`" — is a logic bug in an unattended job, because a page can have
zero impressions for two entirely different reasons:

1. It was crawled, indexed, and nobody wants it. Demoting is correct.
2. **It was never crawled at all.** Demoting removes it from the sitemap and marks it `noindex`,
   which guarantees it is never crawled. The job manufactures the outcome it was measuring.

At 10k–36k pages against a crawl budget §4.4 already identifies as the binding constraint, case 2 is
the common case, not the edge case. So the rule needs a precondition:

> Demote only pages that were **crawled and indexed** and then earned no impressions for 90 days.

Crawl status comes from CloudFront access logs (§7) — a verified Googlebot fetch is the cleanest
signal available and costs nothing extra. Index status comes from the bulk export. A page that was
never fetched is a **crawl-budget problem**, and the response is internal linking, not demotion.

Pruning is a standing automated job, not a periodic cleanup. **Stand it up before the corpus passes
~5,000 pages** — it is much harder to retrofit onto a corpus already too big to reason about.

### 4.4 Crawl budget

Discovery stops being automatic at five figures of URLs.

- **Sitemap index files.** 50,000 URLs and 50 MB per file, split by content type so each tier is
  separately measurable in Search Console.
- **Honest `lastmod`**, reflecting actual content change rather than build time. Google schedules
  recrawls off it, and a `lastmod` that updates on every build is worse than none.
- **Hub architecture carries discovery.** Entity hubs link to their topic pages, topic pages link to
  their items, everything links back. Google will not crawl tens of thousands of pages on the
  strength of a sitemap alone at alphaday.com's current authority.
- **Crawl budget is a function of domain authority**, which is the content document's Engine B. The
  technical work here makes the corpus *crawlable*; it does not make it *crawled*.

---

## 5. SEO requirements

Non-negotiable invariants for the build. Each corresponds to a verified failure in the current
production site — see [Appendix B](#appendix-b--regression-guard).

### 5.1 Canonical is a required field

Every route's head configuration **must** declare a canonical URL. Make it a required property in the
shared head helper's type signature so that omitting it fails the build.

The current site defaults a missing canonical to the homepage, which means `/api` — the primary
conversion target for audience one — currently tells Google it is a duplicate of the homepage. Type
enforcement is the fix that cannot regress.

### 5.2 Real HTTP status codes

- Unmatched routes return **HTTP 404**, not 200 with 404 content.
- TanStack Router's `notFound()` must be verified to propagate a real status through the SSR handler.
- Redirects return **301**, server-side. No `window.location.replace()` for anything a crawler should
  follow.

### 5.3 Per-route metadata

Every indexable route emits a unique `<title>`, unique meta description, canonical, OG and Twitter
tags, and route-appropriate JSON-LD. No route inherits a site-wide default title.

### 5.4 Structured data

- `Organization` + `WebSite` + `sameAs` on the homepage.
- `FAQPage` wherever an FAQ renders, including the homepage.
- `SoftwareApplication` + `BreadcrumbList` on project pages.
- `Event` on event pages — this is what earns rich results for the events tier.

### 5.5 Streaming discipline

If streaming SSR is used, **everything SEO-relevant lands in the first flush** — head, canonical,
`h1`, main content, JSON-LD, internal links. Googlebot handles streamed HTML; the LLM crawlers that
matter most here are much simpler clients. Stream live market data below the fold; never stream the
shell.

### 5.6 One `h1` per page

Enforced by lint. The current `/mobile` page ships two — a `md:hidden` one and a `hidden md:flex` one,
both in the DOM.

### 5.7 Sitemaps

Generated from **the same data source that serves the pages**, so the two cannot drift, and gated on
the index state field from §4.2. Structure and `lastmod` rules are in §4.4.

### 5.8 Internal linking

Hub architecture per §4.4. Every page must be reachable from a hub in server-rendered HTML — not via
a client-side fetch, which is how 59 of the current project pages became orphans.

### 5.9 robots.txt

- Served as `text/plain` from **both** `alphaday.com` and `app.alphaday.com`. The app domain
  currently returns its SPA shell for `/robots.txt`, meaning it has no robots file at all.
- Model crawlers named explicitly as allowed — see §6.1.
- `app.alphaday.com` either `noindex`es its shell or canonicals `/b/{slug}` to the corresponding
  `alphaday.com` page.

### 5.10 Server-side data fetching

All API calls happen server-side. No API credentials reach the browser. The current build ships
`VITE_X_APP_SECRET` in the public bundle.

**Request the correct URL shape.** `/ui/landing-pages/{slug}` without a trailing slash returns a
`301`; the API wants the trailing slash. Every landing page currently pays an extra round trip on
every render — which on a cache miss is latency the user sees.

---

## 6. Machine readability

Audience one finds tools by asking a model. §1.1 is the prerequisite — no model crawler executes
JavaScript. These are the static artifacts that make the site legible to them. **Content and
distribution for this audience are in
[the content document's §9](./seo-content-strategy.md#9-distribution--where-audience-one-actually-is).**

### 6.1 Crawler allowances

Name the model crawlers explicitly as allowed in `robots.txt`: **GPTBot, OAI-SearchBot, ClaudeBot,
PerplexityBot, CCBot, Google-Extended.**

The current file permits them by default, but it is one careless edit from cutting off the audience
the business is built around, and an explicit allow makes the intent legible to whoever edits it
next.

If bot management is introduced later, the distinction is: block scrapers, keep this list allowed.

### 6.2 llms.txt

Publish `/llms.txt` and `/llms-full.txt` — what Alphaday is, what the API returns, the MCP endpoint,
working commands, rate limits. Static files, generated at build from the same source as the API
surface so they cannot drift from reality.

### 6.3 OpenAPI

Serve the spec at `/openapi.json`, statically. `docs-spec.generated.js` already exists; this is a
build-step export. It lets agents consume the API surface directly rather than parsing marketing copy
about it, and it is the prerequisite for the API directory listings in the content plan.

---

## 7. Measurement

Technical health only. Per-engine content and authority metrics are in
[the content document's §11](./seo-content-strategy.md#11-measurement-by-engine).

- **Search Console on both properties.** `app.alphaday.com` is currently unmonitored and is where the
  duplicate-content risk lives.
- **Indexed-over-submitted, per tier.** Segmented on the §3.1 path prefixes. Sitewide averages hide
  everything that matters — a collapsing item tier and a growing hub tier net out to "flat".
- **CloudFront cache hit rate**, from the distribution's cache statistics and the `CacheHitRate`
  CloudWatch metric. The capacity model in §1.4 rests on it. Alarm if it drops — a falling hit rate is
  the leading indicator that the origin is about to exceed its CPU baseline.
- **CPU credit balance** on the instance. A declining balance means §1.4's assumptions are wrong.
- **Origin 5xx rate and TTFB** at the edge. Slow origins get less crawl budget, which is the worst
  possible outcome for a large corpus.
- **Core Web Vitals**, from the Search Console report rather than lab tooling.
- **Crawl stats** in Search Console — requests per day, average response time, and the breakdown by
  response code. This is where soft 404s and crawl waste show up first.

### 7.1 Model-crawler access — the thesis metric

§1.1 asserts that being unreadable to model crawlers is the most expensive possible failure mode, and
§6 builds artifacts specifically for them. Nothing above measures whether those crawlers actually
arrive, which would mean shipping §6 with no way to know if it worked.

**Enable CloudFront standard access logs and segment by user-agent.** Track fetches, status codes and
bytes for GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, CCBot, Google-Extended and Bingbot,
separately from Googlebot. Cheap — S3 storage plus an Athena query — and it is the only direct read
on the highest-stated-priority work in the plan.

It pays for itself twice: verified Googlebot fetches are also the crawl-status signal the pruning job
in §4.3 depends on.

### 7.2 Alarm thresholds

"Sustained render volume grows → larger instance" is not an operable rule. Concrete triggers:

| Signal | Threshold | Means |
| --- | --- | --- |
| `CPUCreditBalance` | below 144 (50% of the 288 max) and declining over 24 h | Render volume is above baseline; §1.4 is wrong |
| `CPUUtilization` | above 20% sustained over 6 h | At or over the burstable baseline |
| `CacheHitRate` | below 80% | Origin exposure rising; check TTLs before resizing |
| Origin p95 TTFB | above 800 ms | Throttling, or upstream latency above the §1.4 assumption |
| Origin 5xx rate | above 0.5% over 1 h | `stale-if-error` is carrying the site; investigate now |

The first two firing together is the signal to move to Design B (§2.7) or a larger instance. Either
alone usually means a cache-configuration problem, not a capacity problem.

---

## 8. Build sequence

Technical work only. Content sequencing is
[the content document's §13](./seo-content-strategy.md#13-first-90-days) and depends on Phase 2 here.

### Phase 0 · Week 1 — Patch the live site

> **Status: implemented — 11 of 12 items.** The outstanding item (`robots.txt` on
> `app.alphaday.com`) lives in the `alphaFront` repo and is not actionable from here. `yarn build`
> runs green from a clean environment; the sitemap emits 72 URLs (6 static, 66 landing pages, each
> with a real `updated_at`). Everything below the checklist records decisions taken during the work
> that were not in the original plan — read those before changing any of it.

The rebuild takes months; production bleeds throughout. These are hours of work on the existing SPA.

**Enabling change, do this first:** add a `robots` prop to `seo.jsx` — currently the tag is hardcoded
to `index, follow` with no override (finding #4), so nothing below that needs `noindex` is possible
without it.

Then, in dependency order:

- [x] Add the `robots` prop to `seo.jsx`; default `index, follow`, overridable — **gates the two
      `noindex` items below**
- [x] Make `canonical` required in the SEO component and pass it on every page — fixes findings #1
      and #6 together, since `/mobile` and `/privacy` self-canonicalise through the same default
- [x] Remove the app-level `<Seo>` from `App.jsx` so each page owns its head tags exactly once
      (finding #5)
- [x] **Switch the sitemap source to `/ui/landing-pages/`** — this one change also drops
      `oceanprotocol` automatically, because it is not in that set. Do not hand-patch the
      views-based sitemap; that reintroduces the drift
- [x] Add `/api`, `/api/docs`, `/mobile`, `/privacy` to the sitemap's static links
- [x] Set a real `lastmod` per URL from the record's own updated timestamp, not build time
      (finding #13)
- [x] Delete or regenerate the committed root `sitemap.xml` — it is malformed and dated 2022
      (finding #12)
- [x] `noindex` on the 404 component — **Googlebot only.** It is emitted by Helmet after hydration
      on an HTTP 200, so the JS-blind crawlers of §1.1 (GPTBot, ClaudeBot, PerplexityBot, CCBot)
      still see `index, follow` and the home page's title in the static head. A real status code
      is Phase 2 (§5.2); this closes the Google half now
- [ ] Real `robots.txt` on `app.alphaday.com`; `noindex` or canonical the app shell —
      **the only Phase 0 item not done here**: it lives in the `alphaFront` repo, which has no
      `robots.txt` at any path (verified)
- [x] Fix `berachain` — **separate from the sitemap work**: it is a homepage link, not a sitemap
      entry, so switching the source does not touch it
- [x] Fix the `href="#"` dead link on the homepage (finding #19)
- [x] Add the trailing slash in `boards.js` to stop the 301 on every landing page render

**Implementation notes — decisions taken during the work, not in the original plan:**

1. **`canonical` is enforced by indexability, not by presence.** A `noindex` page emits no canonical
   at all, because `noindex` plus a canonical is a conflicting instruction: it asks Google to drop
   the page and to consolidate it onto a target in the same breath. The dev-time throw therefore
   fires only on indexable pages, which is what let the 404 component opt out cleanly.
2. **The production canonical fallback changed from the site root to the page's own URL.** Requiring
   the prop fixes today's pages; changing the fallback means the *next* forgotten canonical is a
   harmless self-reference rather than a silent duplicate-of-`/` claim. The class of bug is closed,
   not just its current instances.
3. **The `sitemaps` npm package was removed.** It emits `link.lastmod || <build time>`, so there was
   no way to express "no known modification date" through it — the honest-`lastmod` requirement was
   unimplementable without replacing it. It is now ~20 lines of local XML emission.
4. **`is_published` is filtered.** The `/ui/landing-pages/` list carries the flag; all 66 records are
   currently published, but an unpublished slug in the sitemap is a soft 404 submitted on purpose,
   and this script runs unattended.
5. **Static routes carry no `lastmod`.** There is no record behind them, and the only available
   substitutes are build time (the false signal being removed) or git commit dates (wrong under a
   shallow CI checkout). An absent signal is correct here.
6. **`ErrorState` is `noindex` too, not just the 404 — and the fetch now retries.** A fetch failure
   rendered a 200 carrying `index.html`'s static head — home page title, home page description,
   `index, follow`, no canonical — so an API outage turned all 66 project URLs into indexable
   near-duplicates of `/`. That is finding #1 resurfacing in the one state no page passed a
   canonical for.

   The two failures are not equivalent, but neither is the `noindex` side cheap. `noindex` is an
   **explicit removal directive**: recovery requires a recrawl, and on a domain whose crawl budget
   §4 already describes as authority-constrained, recrawl latency is the thing least worth relying
   on. Duplicate-title clustering is a **soft heuristic** Google reverses on its own without being
   told. So the rule is not "the downside is small" — it is *the cheaper failure, and we reduce how
   often it fires*.

   Reducing how often it fires is why `boards.js` now retries. It previously entered the error
   state on the first non-`ok` response, including 429 — and the moment we are most likely to be
   rate-limited is Googlebot working briskly through all 66 project URLs, which is precisely when a
   removal directive costs the most. Three attempts with exponential backoff on `408/429/500/502/
   503/504` and on network-level failures; `404` still returns `null` on the first try because it
   is an answer, not a failure; `Retry-After` is honoured but capped at 2s so a server asking for
   two minutes cannot hang the render. Worst case is 1.2s added on plain backoff, 4s with a long
   `Retry-After`.
7. **`yarn build` needs `--env-file-if-exists=.env.local`.** Node does not read `.env` files, and
   Vite only loads them into `import.meta.env` for the bundle — so the sitemap step failed for
   anyone outside CI, where the workflows set the variables as step-level `env`. The flag is
   correct in both places: CI ignores the missing file and uses the real environment.
8. **`meta[name="robots"]` joined `MANAGED_META`.** The dedupe hook existed to stop `index.html`'s
   static tags from colliding with Helmet's, but `robots` was not in its selector — so a `noindex`
   page shipped two conflicting directives. `noindex` wins today only because Google resolves
   conflicts by taking the most restrictive; §5.9's app shell needs the markup to be right, not
   the tiebreak to be lucky.

**Found in review, after the first pass was called done.** Recorded because each one was invisible
to a build that passed:

- **`yarn build` was broken outside CI.** Node does not read `.env` files and Vite only loads them
  into `import.meta.env`, so the sitemap step failed for anyone whose shell had not exported the
  variables. It had been verified in a shell that sourced `.env.local` by hand — the environment was
  made to fit the test instead of the reverse.
- **`ErrorState` had no `<Seo>` at all** — the one render path nobody passed a canonical for.
- **`meta[name="robots"]` was missing from `MANAGED_META`**, so a `noindex` page shipped two
  conflicting directives and won only on Google's most-restrictive tiebreak.
- **The 404 `noindex` is Googlebot-only**, which a bare `[x]` concealed in a document whose §1.1
  argues JS-blind crawlers are the point.
- **The sitemap's root `<loc>` disagreed with `canonicalFor("/")`** on the trailing slash — harmless
  under RFC 3986, but `canonical.js` exists to end exactly that drift.
- **`ErrorState` fired on the first failed request**, with the `noindex` above attached to it.

**Verified against the live API during implementation:**

- `/ui/landing-pages/` returns exactly `{ slug, name, is_published, updated_at }`, 66 records, all
  published, all with a parseable `updated_at`.
- `berachain` is confirmed **absent** from the landing-pages set — the homepage link was live and
  broken. `oceanprotocol` is likewise absent, and dropped automatically by the source switch.
- The 7 remaining `featuredBoards` slugs all resolve to published records.

### Phase 1 · Weeks 2–6 — Static machine-readable artifacts

Shippable on the current site, no rebuild dependency.

- [ ] `/llms.txt`, `/llms-full.txt`, `/openapi.json`
- [ ] Explicit crawler allowances in `robots.txt`
- [ ] `Organization`, `WebSite`, homepage `FAQPage` schema
- [ ] CloudFront access logs enabled and the §7.1 user-agent segmentation queryable — **before** §6
      ships, so there is a before-and-after
- [ ] **Decide** the image optimisation approach (§2.6). It is a choice, not a build; only the
      implementation belongs in Phase 2

### Phase 2 · Weeks 4–12 — The rebuild

Runs in parallel with Phase 1. **This phase gates the entire content programme.**

- [ ] **Calibrate the §1.4 render cost** against a real project page under load — CPU time and
      wall-clock measured separately. Do this early; it validates or invalidates the instance sizing
- [ ] Implement the image optimisation approach decided in Phase 1 (§2.6)
- [ ] TanStack Start scaffold, route map per §3.2, CI build pipeline
- [ ] Route test asserting `/projects/{slug}/this-week` resolves to the digest route, not `$topic`
- [ ] `t4g.micro` provisioned in an ASG (min=max=1); per-route `Cache-Control` per §2.3; CloudFront
      origin timeouts tuned per §2.5; origin cut over
- [ ] Shared head helper with **compile-time-required canonical** (§5.1)
- [ ] Real 404s and 301s verified end to end (§5.2)
- [ ] Index state field, `X-Robots-Tag` emission, and sitemap gating (§4.2)
- [ ] Sitemap index infrastructure, split by tier, honest `lastmod` (§4.4)
- [ ] Migrate the 66 project pages; 301 map deployed and verified (Appendix C)
- [ ] `/dashboards` hub and server-rendered internal linking (§5.8)
- [ ] Blog migrated to `/blog` with 301s from Substack
- [ ] Server-side data fetching; `VITE_X_APP_SECRET` retired (§5.10)

### Phase 3 · Month 3 onward — Corpus infrastructure

- [ ] Generator emits index state per page against the content document's gates
- [ ] Promotion / demotion job reading Search Console data (§4.2)
- [ ] Pruning job live **before** the corpus passes ~5,000 pages (§4.3)
- [ ] Per-tier sitemap segmentation verified in Search Console before the first large tier ships

---

# Appendix A — Cost model

AWS list prices, eu-west-1, no Savings Plans. Modelled, not measured — Cost Explorer was unreachable
from the audit environment. Verify in the AWS Pricing Calculator before committing budget.

### Launch configuration

| Line | Monthly |
| --- | --- |
| `t4g.micro` on-demand | ~$6.15 |
| Public IPv4 address | ~$3.65 |
| 10 GB gp3 | ~$0.80 |
| Route 53 | ~$1.00 |
| Auto Scaling Group | $0 |
| CloudFront *(incl. SWR / stale-if-error)* | $0 — within the 1 TB / 10M request free tier |
| **Subtotal, launch** | **≈ $12/month** |
| CloudFront access logs to S3 (§7.1) + Athena | ~$1–5 |
| Search Console bulk export to BigQuery (§4.2) | ~$5–20 |
| **Total once §4 and §7 are operating** | **≈ $18–37/month** |

Current production (S3 + CloudFront static) is effectively $0–5/month, almost entirely Route 53. The
comparison starts from approximately free; this is a real increase in percentage terms and a trivial
one in absolute terms.

**Two caveats on the free tiers.** The CloudFront 1 TB / 10M request allowance is **per AWS account,
not per distribution**, and the existing production distribution is already consuming some of it —
check current usage before treating it as headroom. And **EC2→internet egress** to
`api.alphaday.com` is billable if that API is off-account or reached over the public internet: 100 GB
free per month, then ~$0.09/GB. At ~1.5M renders against ~50 KB responses that is ~75 GB — under the
allowance, but not by a comfortable margin, and it scales with render volume.

### Scaling

| Traffic | Compute | CloudFront | Total |
| --- | --- | --- | --- |
| 100k PV/mo | ~$12 | $0 *(free tier)* | **~$12** |
| 1M PV/mo | ~$12 | $0 *(free tier)* | **~$12** |
| 5M PV/mo | ~$13 | ~$319 | **~$332** |

CloudFront egress dominates completely above the free tier. Compute is a rounding error at every
volume, because the edge absorbs the large majority of requests before they reach Node.

### The two levers

**Page weight, above ~1.2M pageviews.** The free tier is 1 TB. At 800 KB/pageview that is ~1.2M
pageviews; at 300 KB it is ~3.3M, and the 5M-pageview egress line falls from ~$319 to roughly $60.
Nothing else in this model is remotely as sensitive. This is why §2.6 is a launch blocker.

**Cache hit rate, below it.** Every point of hit rate is a point of render volume. Instrument it from
day one (§7).

### Upgrade path

Triggers are the §7.2 thresholds, not judgement calls.

| Trigger | Move | Cost |
| --- | --- | --- |
| Deploy gaps or AZ risk unacceptable | Design B — 2 × `t4g.micro` + ALB, two AZs | ~$50/mo |
| `CPUCreditBalance` < 144 declining **and** `CPUUtilization` > 20% sustained | `t4g.small` (0.4 baseline vCPU, 2 GB) | +$6/mo |
| `CacheHitRate` < 80% | Fix TTLs first; Origin Shield only if fan-out is proven | per-request charge |
| Egress passes ~1 TB/month | Attack page weight (§2.6), not instance size | — |

Same artifact throughout, so none of the launch work is wasted.

### Not included

- **`api.alphaday.com` itself** — unpriced here, and where the real infrastructure decision sits.
- **WAF / bot management** — roughly $40–70/month at high request volumes. Block scrapers, keep the
  §6.1 list allowed.
- **Image optimisation compute**, pending §2.6.

---

# Appendix B — Regression guard

Verified failures in the current production site, retained as acceptance criteria. Production
responses captured 31 Aug 2026; API findings verified against `api.alphaday.com/v1` the same day.

```
GET alphaday.com/                          200  3,452 b  text/html
GET alphaday.com/ethereum                  200  3,452 b  byte-identical to /
GET alphaday.com/api                       200  3,452 b  byte-identical to /
GET alphaday.com/nonexistent-page-xyz-999  200  3,452 b  byte-identical to /
GET app.alphaday.com/robots.txt            200  3,252 b  text/html — the SPA shell
GET app.alphaday.com/b/ethereum            200  3,252 b  byte-identical to the above
```

| # | Failure | Guarded by |
| --- | --- | --- |
| 1 | `canonical \|\| domain` at `seo.jsx:21` points every page without an explicit canonical at the homepage — including `/api` | §5.1 |
| 2 | Zero server-rendered content; landing-page content arrives via a client-side authenticated fetch | §1.1, §1.3 |
| 3 | Every URL returns 200, including nonexistent ones | §5.2 |
| 4 | **`seo.jsx` cannot express `noindex` at all** — the robots meta is hardcoded to `index, follow, …` at `seo.jsx:27` with no prop to override it. Nothing on this domain can currently be excluded from the index | §4.2, §5.9 |
| 5 | `/api` and `/api/docs` mount **two** `<Seo>` components — the app-level one at `App.jsx:77` and the page's own. Helmet dedupes, so which canonical survives is decided by nesting order rather than ownership | §5.1 |
| 6 | `/mobile` and `/privacy` inherit the app-level `<Seo>`'s site-wide default title and description — and with no canonical passed, **self-canonicalise to the homepage**, the same failure as #1 | §5.1, §5.3 |
| 7 | `/mobile` ships two `h1` elements — `md:hidden` and `hidden md:flex`, both in the DOM | §5.6 |
| 8 | `/api` and `/api/docs` absent from the sitemap | §5.7 |
| 9 | Sitemap built from `/ui/views/` (67 records) while pages serve from `/ui/landing-pages/` (66 records); the sitemap claims 70 | §4.2, §5.7 |
| 10 | `oceanprotocol` is a view with no landing-page record — a submitted URL that renders a 404 body at HTTP 200 | §4.2 |
| 11 | `berachain` is in `CONFIG.featuredBoards` and linked from the homepage, but exists in neither set — **the homepage links to a broken page** | §5.2, §5.8 |
| 12 | **The committed root `sitemap.xml` is stale and malformed** — one URL, a `lastmod` of 2022-08-12, and a bare `<script/>` element inside `<urlset>`. The build writes to `dist/`, so whether it ships depends on the deploy, but it is invalid XML at the exact path Google fetches | §5.7 |
| 13 | `build-sitemap.js` sets no `lastmod`; the library injects build time instead, so every URL claims to have changed on every deploy | §4.4 |
| 14 | `boards.js` omits the trailing slash, so every landing page render pays a 301 round trip | §5.10 |
| 15 | `/b/{slug}` and `/blog` redirect via `window.location.replace()` (`App.jsx:50`, `:56`) — a crawler sees a 200 shell, never a redirect | §5.2 |
| 16 | 59 of 66 project pages are unreachable from any server-rendered link. `CONFIG.featuredBoards` lists 8, but `berachain` has no record, so only 7 resolve. `/dashboards` is in the sitemap but is not a route | §5.8 |
| 17 | `app.alphaday.com` has no robots.txt, no sitemap, no meta description, and a duplicate title on every route | §5.9 |
| 18 | No `Organization`, `WebSite` or homepage `FAQPage` schema | §5.4 |
| 19 | Homepage "Coming soon" product card is `href="#"` (`productsData.jsx:52`) — a dead link on the page §5.8 designates as the discovery root | §5.8 |
| 20 | `VITE_X_APP_SECRET` shipped in the public bundle | §5.10 |
| 21 | ~~`index.html` ships `<link rel="icon" href="/src/favicon.svg">`, a dev-server path~~ — **false positive, withdrawn.** Vite rewrites HTML asset references at build; the production bundle emits `/assets/favicon-<hash>.svg` and the icon resolves correctly | n/a |

Findings 9–11 and 14 were verified against the live API by the content document's §14 and supersede
earlier estimates in this document. Findings 4, 5, 12, 13, 15 and 19 were missed by the original
audit and found on review.

**Finding 4 is a prerequisite, not a line item.** Phase 0 asks for `noindex` on the 404 component and
§5.9 asks for it on the app shell; neither is possible until the robots prop exists. It is the same
shape of bug as #1 — a hardcoded default with no override — and it blocks the entire indexation
mechanism in §4.

---

# Appendix C — Migration and URL preservation

### 301 map

Every current URL must resolve. Project pages move from root slugs to `/projects/{slug}`:

| From | To |
| --- | --- |
| `/{slug}` × 66 | `/projects/{slug}` |
| `/oceanprotocol` | resolve first — publish the record or drop the URL |
| `/berachain` | resolve first — currently broken and linked from the homepage |
| `/blog` | `/blog` — now a real page, not a client-side redirect |
| `/api`, `/api/docs`, `/mobile`, `/privacy` | unchanged |
| `blog.alphaday.com/p/{slug}` | `alphaday.com/blog/{slug}` |

Generate the map from the same data source the pages are built from. Verify every entry returns a
real 301 before cutover — not a 200 with client-side navigation.

### Verification before cutover

- [ ] Every URL in the current sitemap resolves to a 200 or a 301 to a 200
- [ ] `curl` with JS disabled returns complete content for a project page, `/api` and `/mcp`
- [ ] Unmatched paths return a genuine 404
- [ ] Every indexable route has a unique title, description and canonical
- [ ] Substrate-layer pages emit `noindex` in both the meta tag and the header, and appear in no
      sitemap
- [ ] CloudFront `CacheHitRate` meets the §1.4 assumption under load
- [ ] `stale-if-error` verified end to end: stop Node, confirm cached pages still serve 200

### After cutover

- [ ] Submit the new sitemap index in Search Console; keep the old sitemap live for ~30 days
- [ ] Watch indexed-over-submitted daily for two weeks
- [ ] Confirm the 66 migrated pages retain impressions; a 301 should hold essentially all equity, and
      a drop means a redirect is wrong

### Still unverified

1. **Current index coverage** — inferred from served HTML, not observed. Needs Search Console.
2. **Real traffic and current AWS spend** — DNS was unavailable during the audit, so Cost Explorer and
   the CloudFront API could not be reached. Appendix A is modelled, not measured. Two numbers make it
   exact: monthly pageviews from GA4 (`G-ZT80HRR0MD`) and average page weight.
3. **`/tvl/*` returns `401`** with app credentials — a different auth tier. Any route that plans to
   render yields, stablecoins or fees needs that resolved first.
