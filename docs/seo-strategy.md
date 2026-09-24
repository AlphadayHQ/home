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
- [Appendix D — CloudFront access logs](#appendix-d--cloudfront-access-logs)

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

> **Measured 2026-09-22, and the case is stronger than this section states.** §1.1 argues from model
> crawlers, which execute no JavaScript at all. Three months of Search Console data show the failure
> reaching *classic* search as well, where Googlebot's queued second pass was supposed to cover for
> the shell.
>
> The site ranks on page one for 47 URLs and converts them at 0.91%. Three of those — `/orbs`
> (position 6.66), `/dfinity` (6.89) and `/aave` (9.73) — take **zero clicks from 3,192
> impressions**. The homepage, the only route whose `<title>` and description are static in the
> 3,452-byte shell every URL currently serves, converts at **2.15% from a worse position**.
> `/avalanche` and `/solana` do get rendered — their board titles appear in Search Console — and
> reach ~1%.
>
> **The second pass is not a safety net.** It runs sometimes, and which pages it reaches is not
> predictable from anything the team controls. Full reading in
> [the content document's §11](./seo-content-strategy.md#the-2026-09-22-baseline).

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
| 100k PV | ~30% | 300k / ~50% | ~180,000 | 0.00015 | 0.08% |
| 1M PV | ~15% | 1M / ~50% | ~650,000 | 0.00056 | 0.3% |
| 5M PV | ~10% | 2M / ~50% | ~1,500,000 | 0.0013 | 0.6% |

**These figures are measured, not modelled** — see the calibration below. A `t4g.micro` serves 5M
pageviews/month plus heavy crawl at well under **1%** of its CPU baseline. CPU is not a constraint on
this workload at any traffic level the site will plausibly reach.

**CPU is not the only ceiling, and probably not the first one.** Each render blocks on
`api.alphaday.com`, so a single Node process is bounded by in-flight concurrency and upstream latency
as much as by CPU: at ~100 ms of CPU against a ~300 ms upstream call, two thirds of each render's
wall-clock is waiting, and the practical limit is how many concurrent render contexts fit in memory
rather than how many CPU-seconds are available.

**This is the real reason the design survives on one small instance, and it is worth stating
plainly:** SWR means almost every render is a *background revalidation*, not a user waiting. Nobody
is blocked on the queue, so upstream latency degrades throughput rather than user-visible TTFB. Take
SWR away and the concurrency ceiling becomes the binding constraint immediately.

**Calibrated — the ~100 ms/render figure was wrong by two orders of magnitude.**
`scripts/calibrate-render.js` builds the real project-landing tree as an SSR bundle and renders 30
distinct production payloads in a loop, reporting CPU and wall-clock separately.

| | Measured |
| --- | --- |
| CPU per render | **0.74 ms** (0.70–0.74 across five runs of 1,000) |
| Wall-clock | 0.59 ms median, 1.00 ms p95, 3.32 ms p99 |
| Throughput | ~1,400 renders/sec on one core |
| Output | 59.1 KB HTML per page |
| Process heap | ~119 MB after 1,000 renders |

Measured on Apple-silicon arm64, not the Neoverse N1 of a `t4g.micro`. Allowing a conservative 3×
for the slower core puts a real render at **~2.2 ms** — the number the table above uses. The
assertion was ~45× too pessimistic even after that adjustment.

**The sizing decision in §2.1 survives, but not for the reason it was made.** The instance was
justified on CPU headroom; CPU turns out to be irrelevant. What actually bounds this box is memory
and in-flight concurrency, exactly as the paragraph above suspected. `t4g.micro` stays the right
choice because 1 GB is the smallest sensible Node footprint, not because 0.2 vCPU was needed —
`t4g.nano` is rejected on its 0.5 GB, not on its CPU.

> **The corollary is that a CPU-hungry misconfiguration now has nothing to hide behind.** Render is
> 0.74 ms; there is no headroom argument left to absorb something that costs 30. See §2.3 on
> compression, which is the specific instance of this.

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

**Compress at quality 4, never quality 11.** Measured on the same 59 KB render (§1.4):

| Setting | CPU | Output | Cost vs one render |
| --- | --- | --- | --- |
| gzip level 6 | 0.30 ms | 11.6 KB | 0.4× |
| **brotli quality 4** | **0.29 ms** | **9.9 KB** | **0.4×** |
| brotli quality 11 | 31.0 ms | 8.3 KB | **42×** |

Brotli 4 strictly dominates gzip 6 — smaller output for the same CPU, so there is no reason to
prefer gzip. Brotli 11 buys 1.6 KB (16%) for **42 times the render's entire CPU cost**, which would
make compression 97% of the per-request CPU and single-handedly invalidate the sizing in §1.4. Many
Node compression middlewares default to the library maximum; this one must be set explicitly.

Better still, **let CloudFront compress at the edge** and have the origin emit uncompressed HTML.
The edge does it once per cached object rather than once per origin render, and it costs the origin
nothing.

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

**Decision: build-time optimisation in the Vite pipeline. No runtime image service.**

The original framing — CloudFront image handler or third-party image CDN — assumed a dynamic image
workload. Measuring the actual one shows there mostly is not one:

| Source | Weight | Notes |
| --- | --- | --- |
| Build assets (`src/images`, `src/assets`) | **5,950 KB** across 61 files | Every one known at build time |
| — of which base64-encoded rasters wrapped in `.svg` | **1,783 KB** across 4 files | See below |
| API-supplied project icon | 44 KB PNG | Per landing page |
| API-supplied dashboard screenshot | 204 KB **WebP** | Already optimised upstream |

A runtime handler exists to resize images that are not known until request time. Here 96% of the
weight is static build assets, and the dynamic remainder is ~250 KB per landing page already served
as WebP. Paying per-request for a service to re-optimise two already-reasonable files, while the
5.9 MB of build assets goes untouched, would be solving the wrong problem at a recurring cost.

Build-time optimisation also survives Phase 2: §1.2 chose TanStack Start partly because it is Vite,
and a Vite image plugin carries across the rebuild unchanged. A runtime service would be new
infrastructure to operate, on a design whose entire premise (§2.7) is that $38/month buys
availability not yet needed.

**The specific defect to fix first.** Four contributor portraits ship as base64-encoded raster data
inside an `<svg><image>` wrapper: `pierre` 532 KB, `anthony` 504 KB, `jordi` 444 KB, `mariano`
312 KB. This is the worst available packaging — base64 inflates the bytes by ~33% over the raw
image, and wrapping a bitmap in SVG defeats format negotiation, `srcset`, and every CDN resize path
simultaneously. It is not a compression problem; it is a file-format mistake. `logo-white.svg` at
216 KB for five paths is a separate, smaller instance of the same neglect and wants SVGO.

Converting those four to AVIF/WebP at display resolution is the single largest weight reduction
available on the site, and it needs no infrastructure decision at all.

**Revisit this** if the API begins serving arbitrary user- or editor-supplied imagery at volume — a
per-project hero image uploaded through a CMS, say. That is the workload a runtime handler is for,
and it does not exist yet.

**Implemented — `scripts/optimize-images.js`.** Bundled assets went from **6,280 KB to 2,231 KB, a
64% reduction**, with no change to any rendered dimension.

| | Before | After | |
| --- | --- | --- | --- |
| Four contributor portraits | 1,783 KB | **28.8 KB** | −98.4% |
| `logo-white.svg` | 218 KB | **71 KB** | −67% |
| 53 bundled rasters → WebP | 3,597 KB | 1,446 KB | −60% |

Three notes on how this was done, because each was a judgement call:

- **Converted at the source, not in a Vite plugin.** These are marketing assets that change a few
  times a year; re-encoding all 53 on every CI build would spend deploy time producing byte-identical
  output, and would put a native encoder (`sharp`) in the critical path of every deploy. Converting
  once puts the result in the diff where a human can see it. The script is idempotent, so it stays
  usable when someone adds an image. `sharp` is a `devDependency`, not a build dependency.
- **Fidelity was measured, not assumed.** Every conversion was compared against its original from
  git: median **41.1 dB PSNR**, worst **35.2 dB** — imperceptible to good across the set. The two
  files where WebP came out larger were left as they were.
- **Dimensions were preserved.** Downscaling needs each asset's display size, which the script has no
  way to know; it reports oversized candidates instead of guessing. The contributor portraits are the
  one exception — their 80 px display size was read off the markup first, so 400×400 (and one
  790×796) became 240×240. Three assets remain wider than 2,000 px and are flagged for a human:
  `alpha-notifications` (2607×1449), `superfeed-transparent` and `superfeed` (both 2048×1152).

**The circular avatar crop moved from the asset to CSS.** The old portraits were bitmaps wrapped in
an SVG whose rounded `<rect>` supplied the circle. A plain WebP is square, so `rounded-full` had to
be added at both call sites — without it the avatars would have silently become squares. This is the
kind of thing that makes format changes riskier than they look.

**Separately: 610 KB of raster files in `src/images` are imported by nothing.** Vite does not bundle
them, so they cost nothing at runtime and this is repo hygiene rather than page weight — but
`on-the-go.jpg` alone is 445 KB. The script lists them; deleting them is a call for whoever knows
whether they are coming back.

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
  api.data.$capability.tsx         →  /api/data/{capability}
  mcp.index.tsx                    →  /mcp
  mcp.$client.tsx                  →  /mcp/{client}
  cookbook.index.tsx               →  /cookbook
  cookbook.$recipe.tsx             →  /cookbook/{recipe}
  dashboards.tsx                   →  /dashboards
  projects.$slug.index.tsx         →  /projects/{slug}
  projects.$slug.$topic.tsx        →  /projects/{slug}/{topic}
  projects.$slug.this-week.tsx     →  /projects/{slug}/this-week
  $slug_.this-week.tsx             →  /{slug}/this-week  → 301
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

> **Two prefixes changed when the content shipped, 14–21 Sep** — both are the content document's
> calls, recorded here because this map is the routing contract:
>
> - **`api.tools.$tool.tsx` → `api.data.$capability.tsx`.** A page per *capability* (22), not per
>   *tool* (57). Rationale in
>   [the content document's §4](./seo-content-strategy.md#4-engine-a--proof-converts).
> - **`recipes.$slug.tsx` → `cookbook.$recipe.tsx`**, plus a `cookbook.index.tsx` hub. `/recipes/` would
>   have collided with the shipped AlphaRecipes product.
>
> **Twenty-seven allocated, seventeen built.** `src/routes/` holds 20 files: those seventeen plus three
> this map never listed — `$slug.tsx` (the 301 shim for the legacy root slugs, Appendix C), `b.$.tsx`
> (the app redirect) and `dashboard.tsx`. Ten allocated routes are unbuilt: `security.exploits`,
> `security.$incident`, `governance.$id`, `research.$slug`, `events.index`, `events.$id`, `media.$id`,
> `news.$id`, `blog.$slug` and `compare.$slug` — `blog.index.tsx` does exist. **The map is an
> allocation, not an inventory**, which is the point of §3.2: the prefix is reserved so the content
> document can commission the page without renegotiating the URL.

Two things in this map are load-bearing and easy to break:

- **`security.exploits.tsx`, not `security.index.tsx`.** Dots are path separators; `.index` resolves
  to the directory root, so `security.index.tsx` would serve `/security`, not `/security/exploits`.
- **`projects.$slug.this-week.tsx` and `projects.$slug.$topic.tsx` both match
  `/projects/{slug}/this-week`.** It resolves correctly because TanStack Router ranks static segments
  above dynamic ones — but that precedence is doing real work here. If the digest route ever stops
  resolving, this is why. Cover it with a route test rather than trusting the convention.

- **`$slug_.this-week.tsx` needs its trailing underscore**, and the reason is not cosmetic. Written
  `$slug.this-week.tsx` the flat-route convention nests it under the existing `$slug.tsx`, which
  promotes that leaf into a **parent layout whose loader runs first** — so it redirects
  `/bitcoin/this-week` to `/projects/bitcoin`, dropping the segment, and its async redirect beats the
  child's synchronous `notFound()`. The observed symptom was `/ethereum/this-week` answering `301` to
  a landing page instead of `404`. The underscore opts out of the nesting. Asserted in
  `src/__tests__/route-precedence.test.ts`, because deleting one character reintroduces all of it
  silently.

**Route ownership.** This document allocates the routing surface; it does not commission the pages.
`/mcp`, `/mcp/{client}`, `/api/data/{capability}`, `/cookbook/{recipe}`, `/compare/{slug}`,
`/security/exploits`, `/research/{slug}` and `/events` are all owned by
[the content document](./seo-content-strategy.md#13-first-90-days). ~~Its §13 currently marks `/mcp`
and the client pages as *"(companion doc)"* — that reference is now stale and points back here; it
needs updating so `/mcp` has exactly one owner. **Given CLAUDE.md makes MCP the wedge for audience
one, an unassigned `/mcp` is the most consequential gap in either plan.**~~

> **Closed 14–21 Sep.** The circular reference is gone: §13 now owns `/mcp` and the eight client
> pages outright, and they are built. The ownership gap this paragraph called the most consequential
> in either plan has been replaced by a different one — **nobody owns re-verifying the 38 shipped
> pages**, every one of which carries a dated verification claim. Logged in
> [the content document's §10](./seo-content-strategy.md#10-cadence-and-ownership).

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

> **Measured 2026-09-22: impressions are not a health signal, and every rule here reads them as one.**
>
> The precondition above fixes the false negative — a page demoted for never having been crawled. The
> data exposes the opposite case, which the rule cannot see: `/orbs` earns 1,559 impressions at
> position 6.66 and **zero clicks**; `/dfinity` 1,069 at 6.89, zero; `/aave` 564 at 9.73, zero. All
> three are crawled, indexed and accumulating impressions, so all three read as healthy under any
> rule keyed on impressions — and all three are failing completely.
>
> The rule stays correct as a *demotion* gate: a page with a broken listing needs the listing fixed,
> not `noindex`. What is missing is a second output. **Track click-through rate per tier as a
> diagnostic** and alarm on an indexed page holding a page-one position while earning no clicks.
> That signature is a rendering or metadata failure, and it is invisible to every metric in §7 as
> written.

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

**Measured 2026-09-22, and it is a layer worse than written: the served HTML carries no canonical at
all.** `curl` on `alphaday.com/base` and on `www.alphaday.com/base` returns the same 3,452-byte shell
with no `<link rel="canonical">` anywhere in it. The tag is written by the client during render, so
the homepage default described above is what *renderers* eventually see, and every non-rendering
crawler — the §1.1 audience — sees no canonical whatsoever. That is also why `www` currently
duplicates the entire site with nothing to resolve it (Appendix C).

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
- `FAQPage` wherever an FAQ renders, including the homepage. **Do not expect SERP changes from
  this.** Google restricted FAQ rich results to government and health sites in August 2023, so the
  markup earns no visual treatment on a commercial domain. It ships for the machine-readability
  reason §6 argues — an answer engine parsing the page gets question/answer pairs it does not have
  to infer — and §7 should not be read as a failure when no FAQ rich result appears.
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

> **Implemented**, plus `ChatGPT-User`, `Claude-User` and `Bingbot` — the two user-initiated agents
> matter because they are what fetches a page when someone asks a model about Alphaday directly.

The current file permits them by default, but it is one careless edit from cutting off the audience
the business is built around, and an explicit allow makes the intent legible to whoever edits it
next.

If bot management is introduced later, the distinction is: block scrapers, keep this list allowed.

> **Check `api.alphaday.com/robots.txt` against this policy.** It applies the same named-allow
> pattern — GPTBot, ClaudeBot, PerplexityBot and six others explicitly `Allow: /` — above a closing
> `User-agent: * / Disallow: /`. Googlebot is therefore excluded and the model crawlers are admitted
> to the whole API host, **`/admin/` included**. Search Console shows
> `api.alphaday.com/admin/login/` indexed URL-only, which is what happens when Google sees links to a
> path it is not allowed to fetch.
>
> Probably an unintended consequence of copying the marketing site's file rather than a decision. The
> allow-list is right for `/docs/`; it should not extend to an admin login. Worth a `Disallow:
> /admin/` ahead of the named groups, since a group's rules are read in isolation and a later
> wildcard `Disallow` does not reach a crawler matched by its own group.

### 6.2 llms.txt

Publish `/llms.txt` and `/llms-full.txt` — what Alphaday is, what the API returns, the MCP endpoint,
working commands, rate limits. Static files, generated at build from the same source as the API
surface so they cannot drift from reality.

> **Implemented** — `scripts/build-llms.js`. The index file carries the access surface, the 16 data
> collections and all 57 MCP tools; `llms-full.txt` adds per-endpoint parameters, response models
> and field lists for all 59 endpoints. Both derive from `docs-spec.generated.js` and a live
> `tools/list` call, so neither can drift from what `/api/docs` shows. Rate limits are stated as
> unpublished rather than invented.

### 6.3 OpenAPI

Serve the spec at `/openapi.json`, statically. `docs-spec.generated.js` already exists; this is a
build-step export.

> **Implemented** — but "already exists" was the trap. The module existed; the URL feeding it had
> been dead long enough for the API to change major spec versions underneath it. See Phase 1's notes
> in §8. The spec is emitted to `public/openapi.json` with a `servers` block added, since upstream
> omits one. It lets agents consume the API surface directly rather than parsing marketing copy
about it, and it is the prerequisite for the API directory listings in the content plan.

---

## 7. Measurement

Technical health only. Per-engine content and authority metrics are in
[the content document's §11](./seo-content-strategy.md#11-measurement-by-engine).

- **Search Console on both properties** — **connected 2026-09-22** on a domain property covering
  `*.alphaday.com`, so `app.`, `blog.`, `www.` and `api.` report alongside the marketing site. The
  first export is the pre-cutover baseline:
  [the content document's §11](./seo-content-strategy.md#the-2026-09-22-baseline). The duplicate-content
  risk this bullet placed on `app.alphaday.com` is measurably small — **16 impressions, 0 clicks** in
  three months. **`www.alphaday.com` is the live duplicate**, and it was not on this list; see the 301
  map in [Appendix C](#appendix-c--migration-and-url-preservation).
- **Click-through rate per tier**, not impressions alone. §4.3 explains why: an indexed page earning
  impressions at a page-one position and no clicks is a rendering failure that every impression-keyed
  metric reports as healthy.
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

**What the logs do not measure — and a cheap way to close it.** Access logs record that a model
crawler fetched a URL and what status it got. They say nothing about *what the response contained*,
which for a shell-serving SPA is the entire question: a 200 that returns 3,452 bytes of empty
document is indistinguishable in a log from a 200 that returns a rendered page. §1.1's premise is
about content, and the only instrument pointed at it counts requests.

**Run Ahrefs Site Audit with JavaScript rendering disabled** and read what it reports for `<title>`
across the URL set. Its crawler fetches HTML the way GPTBot, ClaudeBot and CCBot do, so what it
extracts is the closest free proxy available for what those crawlers receive:

- If it reports the same title on every URL, that is a direct read on audience one — currently
  asserted in §1.1 and measured nowhere — and it should be re-run after cutover as the pass/fail.
- If it reports per-page titles, then Ahrefs is rendering after all, and the unexplained 2-keyword
  reading in [the content document's §11](./seo-content-strategy.md#the-2026-09-22-baseline) needs a
  different explanation than any yet offered.

Either outcome is worth the run, which is why it is here rather than in a backlog. Free tier, one
crawl. **Do not read the rest of that audit as a task list before cutover** — against the current
build it will report one root cause seventy times.

**Live since 2026-09-04** on `alphaday.com` (`E1QZ56RJ904M5R`), queryable as
`cf_logs.cf_logs_alphaday`. Configuration, corrections and cost: [Appendix D](#appendix-d--cloudfront-access-logs).
Reproducible as [`templates/cloudfront/access_logs.yaml`](https://github.com/AlphadayHQ/infrastructure/blob/main/templates/cloudfront/access_logs.yaml).

**A three-year baseline also exists.** `app.alphaday.com` (`E3OO04R68QCILU`) has logged since
**2023-06-05**, which supersedes an earlier claim in this document that no crawler data was
recoverable — true of `alphaday.com`, wrong about the account.

#### The baseline result — §1.1's premise, measured

Queried 2026-09-04 against the full `app.alphaday.com` history (2023-06-05 onward, ~1 GB scanned,
$0.005). **Model crawlers have been arriving for three years, and the premise holds.**

| Crawler | 2023 | 2024 | 2025 | 2026 YTD | First seen |
| --- | --- | --- | --- | --- | --- |
| ClaudeBot | 25 | 432 | 4,153 | 2,123 | 2023-11-13 |
| GPTBot | 113 | 1,859 | 3,260 | 1,311 | 2023-08-16 |
| Meta-External | 0 | 160 | 3,095 | 2,831 | 2024-07-24 |
| OAI-SearchBot | 0 | 115 | 1,410 | 1,667 | 2024-09-06 |
| ChatGPT-User | 27 | 43 | 55 | 495 | 2023-06-12 |
| Perplexity (bot + user) | 0 | 1 | 96 | 519 | 2024-12-07 |
| CCBot | 28 | 96 | 115 | 303 | 2023-09-19 |
| Claude-User | 0 | 0 | 4 | 144 | 2025-09-08 |
| *Googlebot (reference)* | *4,940* | *29,221* | *18,601* | *9,440* | *2023-06-05* |
| *"Google-Extended" — **not a real crawler**, see below* | *0* | *0* | *0* | *102* | *2026-05-31* |

> **The `Google-Extended` row is excluded from the totals.** Google-Extended is a **robots.txt
> control token, not a fetching user-agent** — Google's ordinary crawl infrastructure does the
> fetching, and the token only governs how the crawled data may be used. It cannot appear in an
> access log. Those 102 requests are therefore something else wearing the string: most likely an SEO
> scanner probing robots handling, or a spoofed agent. Worth pulling the raw user-agent values
> behind them and either relabelling the row or dropping it. It is ~1% of the total, so no
> conclusion below moves either way. Keeping `Google-Extended` in `robots.txt` (§6.1) remains
> correct — that is the one place the token *is* meaningful.

Annualising 2026, model crawlers total **~13,900 fetches/year against Googlebot's ~14,000**. On this
host they now fetch about as often as Googlebot does. **Zero 4xx/5xx** across every one of them.

That parity is two-sided, and worth stating precisely before anyone quotes it: since 2024 model
crawlers are **+413%** while Googlebot is **-52%**. The convergence is mostly real growth, but about
a third of it is Googlebot pulling back.

**The composition shift matters more than the total, and it is the finding.** The pre-training
crawlers are flat-to-down annualised — ClaudeBot -24%, GPTBot -41% — while the *user-initiated*
agents are climbing steeply: ChatGPT-User +1,230%, Claude-User +5,220%, Perplexity +699%. Those fire
when a person asks a model about Alphaday and it goes and looks. That is not a proxy for audience
one; it is audience one, observed directly, on a subdomain that has nothing to offer them.

**What they actually fetched is the other half of the finding.** `/robots.txt` accounts for 7,487
model-crawler fetches and `/sitemap.xml` a further 2,475 — **about 40% of their entire budget spent
asking for directives.** Across all crawlers, `/robots.txt` on this host has returned `text/html` on
an HTTP 200 **34,294 times**, still today, plus 7,830 more as a 301. It has served `text/plain` only
8,894 times ever, and not since 2023-12-11. §5.9 identified that defect; this quantifies the cost of
it, and it is the strongest available argument for landing Phase 0's `chore/seo-app-shell-noindex`
branch, which is committed but not merged.

**That last date has a cause, and it changes how the fix should be read.** This was never "the app
had no robots.txt" — it *regressed*. `robots.txt` has never existed in the `alphaFront` repository
at any commit before `chore/seo-app-shell-noindex`, so whatever served `text/plain` until
2023-12-11 was uploaded to the S3 bucket by hand. Four days earlier:

```
f94d729  2023-12-07  ops: Add back --delete in zetta and prod deployment (skip-ci) (#170)
```

The prod deploy syncs `dist/` to S3 with `--follow-symlinks --delete`. Re-adding `--delete` meant
the next deploy removed every object not present in `dist/` — including a hand-placed `robots.txt`.
The gap between the workflow change and the last correct response is exactly one deploy cycle.

This **validates the Phase 0 fix rather than merely explaining the past**: the file now lives in
`packages/frontend/public/`, so it is built into `dist/`, so `--delete` cannot remove it. The
regression is structurally prevented, not patched. It also means the 34,294 HTML responses have a
specific, dated, non-recurring cause — worth knowing before assuming a CloudFront rewrite is
shadowing the path.

Read it with two caveats. This is the app subdomain, which has no useful content for a model crawler
and never had an `llms.txt` — so these numbers are a **floor**, not a ceiling, and certainly not
proof of what `alphaday.com` will see once §6 ships. Given that 40% of the budget went on a
`robots.txt` that was never served correctly, the post-§6 numbers on the main host should be
materially higher. And Phase 0 sets this host to `noindex`, so the series changes meaning from that
deploy onward: **this is the last clean read of it.**

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

> **Status: complete — 12 of 12 items.** The last one shipped in the `alphaFront` repo on branch
> `chore/seo-app-shell-noindex` (commit `57d91d8`), branched from `dev`; it is committed but not
> pushed or merged. `yarn build` runs green from a clean environment in both repos; the sitemap
> emits 72 URLs (6 static, 66 landing pages, each with a real `updated_at`). Everything below the
> checklist records decisions taken during the work that were not in the original plan — read those
> before changing any of it.

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
- [x] Real `robots.txt` on `app.alphaday.com`; `noindex` or canonical the app shell — done in the
      `alphaFront` repo, branch `chore/seo-app-shell-noindex` off `dev`. **Chose `noindex` over
      canonical**, see below
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
8. **The app shell is `noindex`, not canonicalled — §5.9 offered both.** Every route on
   `app.alphaday.com` returns the same 3,252-byte contentless shell with HTTP 200, including
   `/robots.txt` and `/sitemap.xml`. A canonical would have been the more surgical option, but it
   fails twice here: it needs JavaScript to vary per route, which the model crawlers of §1.1 do not
   run, and its only sensible target — `alphaday.com/{slug}` — does not exist for every board that
   has a dashboard on the app (`berachain` being the known case). Canonicalling to a URL that
   returns a soft 404 is worse than not canonicalling at all. A static `noindex, follow` in
   `index.html` costs nothing, since the shell has no indexable content for any crawler, and works
   without JavaScript.

   **`robots.txt` deliberately allows crawling.** `Disallow` blocks crawling, not indexing: a
   crawler that cannot fetch the page never reads the `noindex`, and Google still lists blocked URLs
   it finds linked elsewhere as bare entries with no snippet — strictly worse than either
   alternative. Crawling must stay open for the directive in the HTML to be readable. Once Search
   Console shows the URLs dropped out (weeks, not days), a `Disallow` can be added to save crawl
   budget; adding it now would freeze them in the index in their current state.

   **Verify after deploy** that `https://app.alphaday.com/robots.txt` returns `text/plain` and not
   the shell. Files in `public/` reach S3 and are served ahead of the SPA fallback — confirmed via
   `/favicon.ico`, which returns its real content type — but a CloudFront Function or Lambda@Edge
   rewrite on that distribution could still intercept the path, and that could not be checked
   without AWS access.

9. **`meta[name="robots"]` joined `MANAGED_META`.** The dedupe hook existed to stop `index.html`'s
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

> **Status: complete — 5 of 5 items.** `yarn build` emits `/llms.txt`, `/llms-full.txt`,
> `/openapi.json`, `/robots.txt` and `/sitemap.xml`, all generated from live sources; CloudFront
> access logs went live 2026-09-04 and are queryable; the three-year crawler baseline is recorded in
> §7.1. **The premise Phase 2 rests on is now evidenced rather than assumed** — model crawlers fetch
> `app.alphaday.com` about as often as Googlebot does (+413% since 2024, against Googlebot's -52%),
> and the retrieval-time agents that represent audience one are growing fastest.

Shippable on the current site, no rebuild dependency.

- [x] `/llms.txt`, `/llms-full.txt`, `/openapi.json` — generated by `scripts/build-llms.js` and
      `scripts/build-api-docs.js` from the live spec and a live MCP `tools/list` call
- [x] Explicit crawler allowances in `robots.txt`
- [x] `Organization`, `WebSite`, homepage `FAQPage` schema — plus `FAQPage` on `/mobile`, which
      renders a *different* ten-question set and had none (§5.4 says wherever an FAQ renders)
- [x] CloudFront access logs enabled and the §7.1 user-agent segmentation queryable — **live
      2026-09-04** on `E1QZ56RJ904M5R`, v2 logging, Hive-partitioned, verified at 1,342 bytes
      scanned for a single-day query. Setup cost $0.02; steady state ~$0.08/month. Captured as two
      CloudFormation stacks and an Athena SQL file in the infrastructure repository (two stacks because the delivery API is
      us-east-1-only while the buckets are eu-west-1). The three-year `app.alphaday.com` baseline is
      recorded in §7.1 — it was captured **before** `chore/seo-app-shell-noindex` deploys, which is
      what makes it a clean before-picture
- [x] **Decide** the image optimisation approach (§2.6). It is a choice, not a build; only the
      implementation belongs in Phase 2 — **decided: build-time Vite optimisation, no runtime image
      service.** Rationale and measurements in §2.6

**The build was shipping a stale API surface.** `build-api-docs.js` fetched Swagger 2.0 from
`https://api.alphaday.com/docs/?format=openapi`. That URL now returns **404**: the API moved to
**OpenAPI 3.0.3** at `https://api.alphaday.com/openapi.json`. The script's failure path keeps the
last generated module and exits 0, so every build since the move has been green while serving a
cached spec of unknown age. Three consequences, all fixed:

1. **The transform read the wrong shape.** OpenAPI 3 puts models in `components.schemas` (not
   `definitions`) and response schemas under `responses[].content[mediaType].schema` (not
   `responses[].schema`). Pointed at the new spec unchanged, it would have produced 59 endpoints
   with an empty `returns` on every one — and looked like a successful build. There is now a
   version guard that refuses a non-v3 document outright.
2. **Two presentational regressions the v3 shape introduced.** `drf-spectacular` emits no `summary`,
   folding it into the first paragraph of `description` — so headings had to be split back out. And
   the pagination wrapper is now a *named* schema behind a `$ref`, so detecting it requires
   resolving the ref first; without that every list endpoint degraded to a bare object with no item
   fields. Both fixed: 59/59 endpoints now carry real response fields, 58/59 a heading.
3. **Silence was the actual bug.** The stale fallback now prints a boxed warning naming the URL, the
   error and the cached copy's age, and **fails the build** once the cache is more than 7 days old.
   A transient blip should not break a deploy; a dead source URL should not survive one.

The surface grew from the stale 53 endpoints / 15 categories to **59 / 16** — a `tags` category that
had been missing entirely, plus new market, TVL and coins endpoints.

**Sources, and what was deliberately not used.** `/llms.txt` is generated from
`src/api/docs-spec.generated.js` — the same module that renders `/api/docs`, so the two cannot
disagree — and from a live MCP `tools/list` call. It is **not** generated from
`src/data/apiSurface.js`, which carries a standing `!! PENDING API-TEAM SIGN-OFF !!` warning that its
commands do not match the spec. That warning is correct, and now measured (below). Publishing those
commands into the one file agent builders will execute verbatim would be the worst place on the site
to be wrong.

**Verified against the live API, resolving the pending sign-off:**

| Claim | Result |
| --- | --- |
| `https://api.alphaday.com/mcp` | **Real.** Streamable HTTP, protocol `2024-11-05`, server `alphaday` v1.29.1, **57 tools**, no credentials |
| "Free API & MCP, no signup" | **True.** `curl https://api.alphaday.com/items/news/` returns 200 with no headers |
| Spec declares `tokenAuth`/`cookieAuth` on all 59 ops | Optional, not required: `/items/*/bookmarks/` returns 401 anonymously, public collections return 200 |
| `curl .../search?project=arbitrum` | 301 → `/search/` (missing trailing slash) |
| `curl .../news?tags=arbitrum` | **404.** The real path is `/items/news/?tags=…` |
| `curl .../get-started` | 301 → `/get-started/` |
| `API_TOOLS` names | 11 of 12 real; `get_market_coin` should be **`get_market_coins`** |
| "12 tools at launch" | The MCP server exposes **57** |

`apiSurface.js` was left unchanged — it is marked as approved launch copy, and rewriting it is a
content decision, not a technical one. But the sign-off it is waiting on now has evidence.

**Found in review, after the first pass was called done.** Both were the same defect this phase's
own headline is about — a degraded artifact shipping behind a green build:

- **`/openapi.json` vanished on the stale-fallback path.** `reportStaleFallback()` returned before
  the spec was written, so a single fetch blip shipped a site where `/openapi.json` 404s while
  `llms.txt` still advertises it as the first thing to fetch — and the warning banner claimed the
  opposite, saying the spec would ship "from this cached copy". There was no cached copy of the
  spec, only of the flattened module. The fallback now requires **both** artifacts to exist and
  fails otherwise; the banner says what actually happens.
- **`build-llms.js` documented a fallback it did not have.** The docstring promised the tool section
  would be preserved when MCP was unreachable. It was not: `llms.txt` dropped from 11.5 KB to
  3.3 KB, all 57 tools replaced by a stub, exit 0. The tool list is the single most valuable thing
  in the one file written for audience one. It now falls back to a committed cache
  (`src/api/mcp-tools.generated.json`) and **fails the build** if there is no cache either.

Both fallbacks depend on the artifacts being in git, so `public/llms.txt`, `public/llms-full.txt`,
`public/openapi.json` and both `.generated.json` caches are committed. A cache that only exists on
the machine that wrote it is not a fallback. `llms.txt` records a date rather than a timestamp so
the committed diff churns once a day at most.

A third pass caught the asymmetry the second one introduced: **the MCP cache had no staleness
ceiling.** `build-api-docs` refuses to ship a cached spec older than seven days; `build-llms`
computed the cache's age, printed it, and shipped anyway — so a permanently moved MCP endpoint would
publish a frozen tool list indefinitely, exiting 0 behind a warning nobody reads in CI. That is
precisely the failure the sibling's guard exists to prevent, one script over.

Both now share `scripts/staleness.js`, because two scripts holding independent copies of the same
policy is how they diverged in the first place. Extracting it also closed a hole that was in **both**
of them: an unreadable or missing timestamp was treated as fresh, when a cache whose age cannot be
established is exactly the one least worth trusting. Unknown age now fails.

Two smaller ones: `build-llms.js` regex-parsed `API_DOCS` out of the generated **JS** module,
coupling two scripts to a third artifact's serialisation — `build-api-docs` now emits
`docs-spec.generated.json` beside it and the regex is gone. And `robots.txt` covered only the
well-known half of the crawler list; if the point is that a future wildcard `Disallow` cannot
silently cut off audience one, the list has to be complete to do that job. Added
`Applebot-Extended`, `meta-externalagent`, `Meta-ExternalFetcher`, `Amazonbot`, `Bytespider`,
`cohere-ai`, `Diffbot`, `YouBot`. The `bingbot` entry's comment was also wrong — it is the search
crawler, and Copilot grounds on the Bing index with no separate token, so unlike `Google-Extended`
it is not an AI opt-in control.

**Implementation notes:**

1. **`/openapi.json` is served with a `servers` block added.** Upstream omits it, which leaves every
   path relative and the base URL a guess. An agent cannot call an endpoint it cannot address, so
   the production server URL is injected at build. This is the only modification made to the
   upstream document.
2. **`llms.txt` claims only what was probed.** The authentication section states the anonymous-200
   result and the 401-on-bookmarks result explicitly, rather than asserting "no auth required" and
   leaving an agent to discover the personalised endpoints the hard way.
3. **Tool descriptions needed the same paragraph split as the OpenAPI ones.** MCP descriptions use
   `Heading\n\nBody`; flattening whitespace before splitting welds them together
   ("Coin prices & market data Continuously-updated snapshots…"). Same bug shape as (2) above,
   found the same way — by reading the output rather than the exit code.
4. **`robots.txt` gives each model crawler its own group.** A crawler obeys the single most specific
   group matching its token and ignores the wildcard entirely, so an explicit per-crawler `Allow`
   means a future `Disallow` added to `User-agent: *` cannot silently cut off audience one — which
   is the failure §6.1 is guarding against.

**Verified against the live API during implementation:**

### Phase 2 · Weeks 4–12 — The rebuild

> **Status 21 Sep: 10 of 13 items. The framework landed; the origin has not.** TanStack Start is
> merged (`ac5ee60`, `#222`) and every application-layer item below is done — index state,
> `X-Robots-Tag`, sitemap gating, canonical enforcement, real 404s and 301s, server-side fetching,
> the credential retirement.
>
> **Two of the three open items need AWS access and nothing else** — the `t4g.micro` origin with the
> CloudFront cutover, and deploying the verified 301 map. Routing and verification for both are done in
> the repo (`$slug.tsx`, `scripts/verify-301-map.mjs`). The third, the blog migration, is a content task
> and sits in [the content document's Weeks 7–12](./seo-content-strategy.md#weeks-712--engine-b-at-cadence).
>
> **The origin cutover is the programme gate.** Until it lands, SSR exists in the repo and not on the
> internet — so the **38 Engine A pages now merged to `dev` are not crawlable by anything**, and the
> content document's §13 cannot report a result on any of them. *"This phase gates the entire content
> programme"* has stopped being a forecast and become the current state: **the content is built and
> waiting on the infrastructure, not the other way round.**

Runs in parallel with Phase 1. **This phase gates the entire content programme.**

- [x] **Calibrate the §1.4 render cost** — `scripts/calibrate-render.js`. Result: **0.74 ms CPU per
      render**, not the asserted 100 ms. §1.4 and §2.3 updated. The instance sizing survives on
      memory grounds; the CPU argument behind it did not
- [x] Implement the image optimisation approach decided in Phase 1 (§2.6) —
      `scripts/optimize-images.js`. **6,280 KB → 2,231 KB of bundled assets (64% smaller)**
- [x] TanStack Start scaffold, route map per §3.2, CI build pipeline
- [x] Route test asserting `/projects/{slug}/this-week` resolves to the digest route, not `$topic` —
      `src/__tests__/route-precedence.test.ts`
- [ ] `t4g.micro` provisioned in an ASG (min=max=1); CloudFront origin timeouts tuned per §2.5;
      origin cut over. **Cache-Control per §2.3 is done** (`server.mjs`); the rest needs AWS access
- [x] Shared head helper with **compile-time-required canonical** (§5.1) — `src/seo/head.ts`
- [x] Real 404s and 301s verified end to end (§5.2) — asserted in `scripts/verify-ssr.mjs`
- [x] Index state field, `X-Robots-Tag` emission, and sitemap gating (§4.2) — `src/seo/indexState.ts`
- [x] Sitemap index infrastructure, split by tier, honest `lastmod` (§4.4) — `scripts/build-sitemap.mjs`
- [ ] Migrate the 66 project pages; 301 map deployed and verified (Appendix C). **Routing is done** —
      `/{slug}` 301s to `/projects/{slug}` generically; deployment and verification need the cutover
- [x] `/dashboards` hub and server-rendered internal linking (§5.8) — all 66 pages linked, server-rendered
- [ ] Blog migrated to `/blog` with 301s from Substack
- [x] Server-side data fetching; `VITE_X_APP_SECRET` retired (§5.10) — `src/server/landingPages.ts`

**The rebuild is built and verified locally.** `scripts/verify-ssr.mjs` asserts every testable
finding in [Appendix B](#appendix-b--regression-guard) against real HTTP responses from the running
server — **43/43 pass**, against a live SPA that fails almost all of them. Run it with the server up:

```
yarn build && yarn start          # terminal 1
node scripts/verify-ssr.mjs       # terminal 2
```

What the migration actually changed, measured on `/projects/ethereum`:

| | Live SPA | Rebuild |
| --- | --- | --- |
| Server-rendered words | 0 | **1,420** |
| Unknown URL | `200` | **`404`** |
| `/api` canonical | `https://alphaday.com/` | **`https://alphaday.com/api`** |
| Project pages linked from a hub | 7 | **66** |
| `/blog`, `/b/{slug}` | JS `location.replace()` | **`301`** |
| `X-Robots-Tag` | absent | on every response |
| App secret in client bundle | present | **absent** |

Three things worth recording because they are not obvious from the checklist:

- **The head helper enforces §5.1 with a discriminated union, not a runtime check.**
  `seoHead({ index: true })` requires `canonical`; `seoHead({ index: false })` types it as `never`.
  Omitting a canonical on an indexable route fails the build, and pairing `noindex` with a canonical
  — the conflicting signal — is equally unrepresentable. There is no fallback left to get wrong.
- **`noindex` is the default, at the root.** `__root.tsx` emits `noindex, follow`, and indexable
  routes override it. Anything that reaches a client without having declared itself indexable is
  excluded rather than included, which is §4.2's "promotion is an action, not an absence" made
  structural.
- **The sitemap imports the same module the routes do.** `scripts/build-sitemap.mjs` calls
  `belongsInSitemap` from `src/seo/indexState.ts` — Node strips the types on import, so it is one
  definition rather than a copy of the rule. The live site's sitemap and page set drift because they
  are derived separately; these cannot.

Two JSON-LD defects were introduced and caught by extending the guard rather than by reading the
code: the site graph was emitted twice (the shared builder already prepends `Organization` and
`WebSite`, and they were passed in again), and route-level structured data shipped as a bare array
with no `@context`, which parses as HTML, validates as markup, and is silently ignored by every
consumer. Both are now asserted against.

**SSR blockers found while building the calibration harness** — each one crashed or corrupted a
server render, and all three are now fixed:

- **`useCookieChoice` reads `localStorage` unguarded on every render**
  ([`src/utils/CookieContext.jsx:15`](../src/utils/CookieContext.jsx)). There is no `localStorage`
  on the server, so this throws before any HTML is produced. Guarding it is necessary but not
  sufficient: the server cannot know a consent choice, so it must render the unconsented state and
  let the client correct it after hydration — which means the consent-gated `<script>` tags in
  `<Seo>` are a hydration mismatch waiting to happen unless they are client-only by construction.
- **`<Seo>`'s canonical fallback reads `window.location`**
  ([`src/components/seo.jsx`](../src/components/seo.jsx)). Under SSR there is no `window`, so the
  fallback path throws rather than falling back. §5.1 makes canonical a required field precisely to
  delete this path — the migration should remove the fallback, not port it.
- **`Navbar` reads `window.pageYOffset`** ([`src/components/navbar/Navbar.jsx`](../src/components/navbar/Navbar.jsx)),
  inside a handler rather than at render, so it is survivable — but it is the same class of thing
  and wants an audit pass rather than a one-off fix.

`ProjectLandingContainer` is gone. The rendered tree became
`src/components/landing/ProjectLandingPage.jsx`, taking data as a prop; the fetch moved to a server
function. `LoadingState` and `ErrorState` survive as the route's `pendingComponent` and
`errorComponent` — they are still reached on a client-side navigation, which is the only place a
loading state exists now that the first render is server-side.

**Still blocking merge: the deploy.** The build no longer produces a static tree — it produces
`dist/client` plus `dist/server`, run by `server.mjs`. The S3 sync step in all three workflows would
publish a client tier with no origin to render it, so it is disabled behind `if: ${{ false }}` with
the reason inline. The workflows also now read `API_APP_ID` / `API_APP_SECRET` from GitHub secrets
instead of carrying `VITE_X_APP_SECRET` in plaintext — **those secrets do not exist yet and must be
created, and the old credential should be rotated, because it is in the git history of this repo.**

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
| CloudFront access logs to S3 (§7.1) + Athena | **~$0.08** — measured, see Appendix D |
| Search Console bulk export to BigQuery (§4.2) | ~$5–20 |
| **Total once §4 and §7 are operating** | **≈ $17–32/month** |

Current production (S3 + CloudFront static) is effectively $0–5/month, almost entirely Route 53. The
comparison starts from approximately free; this is a real increase in percentage terms and a trivial
one in absolute terms.

> **Measured, August 2026.** CloudFront across the whole account: 267k requests / 2.56 GB in June,
> 359k / 5.09 GB in July, 609k / 10.37 GB in August — **$0.04 total**, inside the free tier by three
> orders of magnitude. Requests are up 128% and egress 305% since June, so the trend is real but the
> absolute numbers are nowhere near any threshold in this appendix. The §7.1 logging line was
> originally modelled at $1–5/month and measured at **$0.08**; every other figure here is still
> modelled and should be treated as an upper bound until it is checked the same way.

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
| 20 | `VITE_X_APP_SECRET` shipped in the public bundle. **Code side fixed** — data fetching is server-side, credentials are unprefixed, and the guard now greps every client asset for the literal *value* (the name check alone was false comfort, since Vite inlines the value with no name near it). **The exposure is not fixed and cannot be fixed in code:** the credential is live and has sat in this **public** repository's `.github/` workflows across **209 commits since 2023-05-09**. Rotate it. Verified separately that nothing the site reads needs it — `/ui/landing-pages/` and the item collections all answer anonymously; only `/ui/views/` is auth-gated — so credentials are now optional rather than fatal, and the site runs with none | §5.10 |
| 21 | ~~`index.html` ships `<link rel="icon" href="/src/favicon.svg">`, a dev-server path~~ — **false positive, withdrawn.** Vite rewrites HTML asset references at build; the production bundle emits `/assets/favicon-<hash>.svg` and the icon resolves correctly | n/a |
| 22 | ~~**All four `curl` commands on `/api` are wrong**~~ — **fixed 8 Sep 2026.** Two were outright 404s (`/news?tags=arbitrum`, `/news/trending?limit=3` — the collections live under `/items/`); the other two omitted the trailing slash, so they 301'd and printed nothing when pasted verbatim. Also fixed alongside: `get_market_coin` was not a live MCP tool name (it is `get_market_coins`), and `/api` hardcoded the trending command in its desktop variant while the mobile variant read the shared string, so the two disagreed on the same screen. Guarded by `src/__tests__/api-surface.test.js` | §5.10, content §9 |
| 23 | **15 of 66 boards render an empty feed** — in the product, not only in SEO. **Re-diagnosed 13 Sep 2026; the original entry here was wrong.** The cause is not that the taxonomy uses a different slug: the board slug usually *does* exist as a tag, but carries **zero keywords**, so it is never attached to an item, while a keyworded twin of the same name holds the content (`polygon` has none; `matic-network` has 1,932). 860 of 17,403 tags are keyword-less and 335 shadow a working twin. The earlier claim that *"Worldcoin alone hides 5,173 articles"* is **false** — that figure came from the `world` tag, whose only keyword is the word "world", so it collects the FIFA World Cup and the Ironman World Championship; Worldcoin's real coverage is 981 items under `worldcoin-org`. **The fix needs no merge and no mapping table:** resolve a board to its slug-matched tag *plus* every tag named the board slug, and query them together — measured at 18 boards improved, 0 regressed, 3 manual pairings left. See `docs/tag-taxonomy-fix.md`; audited by `scripts/audit-tag-resolution.mjs` and `scripts/audit-tag-taxonomy.mjs` | §5.8, content C3 |
| 24 | **`/ui/landing-pages/` is readable with no credentials at all.** Confirmed anonymously on the live API. This is what makes finding 20's rotation cheap — nothing on this site depends on the secret. But if that endpoint is *intended* to be authenticated, it is an access-control gap in its own right and the two findings pull in opposite directions: one wants it open, the other wants it closed. Needs an owner's ruling, not a code change | §5.10 |

Findings 9–11 and 14 were verified against the live API by the content document's §14 and supersede
earlier estimates in this document. Findings 4, 5, 12, 13, 15 and 19 were missed by the original
audit and found on review.

Finding 22 was carried over from the content document, which numbered it `P1-3` under a phase-based
scheme that no longer exists. **Appendix B is now the single finding register** — the content
document's `P0-2`, `P1-1`, `P1-3` and `P2-4` are findings 2, 9, 22 and 20 here, and its references
have been rewritten to match. Verified against the live API 7 Sep 2026: the corrected calls are
`/items/news/?tags=arbitrum`, `/items/news/trending/?limit=3`, `/search/?project=arbitrum` and
`/get-started/`, all of which return 200.

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
| `/oceanprotocol` | **resolved: 404.** It is in `/ui/views/` but has no landing-page record, so the old sitemap published a URL with no page. A genuine 404 drops it cleanly; the current site answers 200 with a 404 body |
| `/berachain` | **resolved: 404**, and no longer linked — removed from `CONFIG.featuredBoards`. It exists in neither `/ui/views/` nor `/ui/landing-pages/` |
| `/blog` | `/blog` — now a real page, not a client-side redirect |
| `/api`, `/api/docs`, `/mobile`, `/privacy` | unchanged |
| `blog.alphaday.com/p/{slug}` | `alphaday.com/blog/{slug}` |
| `www.alphaday.com/*` | `alphaday.com/*` — **added 22 Sep; this map did not cover it.** `www` currently serves the whole site at 200 with no redirect and no canonical (§5.1), so every URL exists twice, and Search Console has `www.alphaday.com/berachain` indexed with 28 impressions. The apex is canonical |

Generate the map from the same data source the pages are built from. Verify every entry returns a
real 301 before cutover — not a 200 with client-side navigation.

### Verification before cutover

- [x] Every URL in the current sitemap resolves to a 200 or a 301 to a 200 —
      `scripts/verify-301-map.mjs`, **76 URLs, 0 problems**
- [ ] `curl` with JS disabled returns complete content for a project page, `/api` and `/mcp` —
      **project pages and `/api` verified** (1,420 words server-rendered on `/projects/ethereum`).
      `/mcp` does not exist yet; it is owned by the content document and is still unassigned
- [x] Unmatched paths return a genuine 404
- [x] Every indexable route has a unique title, description and canonical
- [x] Substrate-layer pages emit `noindex` in both the meta tag and the header, and appear in no
      sitemap — asserted end to end: every sampled sitemap URL is fetched and checked for `index`
- [ ] CloudFront `CacheHitRate` meets the §1.4 assumption under load
- [ ] `stale-if-error` verified end to end: stop Node, confirm cached pages still serve 200
- [x] **Ahrefs' linked-URL set reconciled against the 301 map — 23 Sep 2026, and it is clean.** The
      map is generated from the sitemap, i.e. the pages *this project* knows about; Ahrefs lists the
      URLs *other sites link to*, which is a different set and the one carrying the referring domains.
      Both risk buckets came back empty: **"Redirects to implement" (Best by links, HTTP 404) returns
      0 pages**, so nothing linked is broken, and of 49 linked URLs only seven are on the apex —
      the homepage (771 referring domains), its `http://`, `www.` and three `?ref=` variants, and
      `/mobile` (1). **Nothing links to any `/{slug}` project page**, so the 66-page migration, which
      is the bulk of this map, carries no link equity at all.

      This also closes a blind spot worth naming. `$slug.tsx` resolves the old URL by asking the API
      for a landing-page record and throws `notFound()` when there is none — so a linked slug the API
      has since dropped would 404 after cutover, and `verify-301-map.mjs` could not detect it, because
      it sources its URL list from that same API. The failure mode is real; there is simply nothing in
      it. Re-check if the link profile changes materially before cutover

### After cutover

- [ ] Submit the new sitemap index in Search Console; keep the old sitemap live for ~30 days
- [ ] Watch indexed-over-submitted daily for two weeks
- [ ] Confirm the migrated pages retain impressions — **against the ten URLs below, not a sitewide
      average.** They carry 86% of the domain's search impressions and most of the remaining 52 carry
      single digits, so an average will absorb one broken redirect without showing it. A 301 should
      hold essentially all equity; a drop on any of these means a redirect is wrong

| URL | impressions | position |
| --- | ---: | ---: |
| `/` | 2,702 | 9.74 |
| `/polygon` | 1,892 | 12.39 |
| `/base` | 1,758 | 12.01 |
| `/orbs` | 1,559 | 6.66 |
| `/dfinity` | 1,069 | 6.89 |
| `/arbitrum` | 861 | 12.34 |
| `/aave` | 564 | 9.73 |
| `/ethereum` | 483 | 15.92 |
| `/solana` | 334 | 9.16 |
| `/avalanche` | 328 | 8.50 |

Baseline 2026-06-20 → 2026-09-19, Search Console, `alphaday.com` only. Note that four of these are
already at zero clicks, so the check after cutover is **impressions retained and clicks gained** —
holding impressions while CTR stays at zero means the redirect worked and the render did not.

### Still unverified

1. ~~**Current index coverage** — inferred from served HTML, not observed. Needs Search Console.~~
   **Resolved 2026-09-22.** Search Console is connected on a `*.alphaday.com` domain property and
   three months are exported (2026-06-20 → 2026-09-19). Coverage is observed rather than inferred,
   and what it showed changed two arguments in this document from principled to measured: the
   rendering requirement (§1.1) and the demotion rule's blind spot (§4.3). Reading in
   [the content document's §11](./seo-content-strategy.md#the-2026-09-22-baseline).
2. **Real traffic and current AWS spend** — ~~DNS was unavailable during the audit~~. **Resolved
   2026-09-04**: Cost Explorer and the CloudFront API were reached, and the §7.1 logging line in
   Appendix A is now measured rather than modelled. Everything else in Appendix A is still modelled.
   Two numbers would make the rest exact: monthly pageviews from GA4 (`G-ZT80HRR0MD`) and average
   page weight.
3. ~~**`/tvl/*` returns `401`** with app credentials — a different auth tier. Any route that plans to
   render yields, stablecoins or fees needs that resolved first.~~ **Resolved 2026-09-18, and the
   premise was wrong: `/tvl/*` returns `200` unauthenticated.** The 401 was caused by *sending* app
   credentials to an endpoint that wants none. No auth tier blocks yields, stablecoins or fees, and
   `/api/data/tvl-yields` renders against them today. Corrected in
   [the content document's §14 item 7](./seo-content-strategy.md#14-corrections-to-the-companion-document).

---

# Appendix D — CloudFront access logs

**Status: live since 2026-09-04** on `alphaday.com` (`E1QZ56RJ904M5R`), delivering to
`s3://alphaday-cf-logs-v2` and queryable as `cf_logs.cf_logs_alphaday`.

Reproducible as three files. Note the deploy order — **CloudFormation is single-region, but the
CloudWatch Logs delivery API only accepts CloudFront sources in `us-east-1` while the buckets are in
`eu-west-1`, so this cannot be one stack:**

| File | Region | What |
| --- | --- | --- |
| [`templates/cloudfront/log_storage.yaml`](https://github.com/AlphadayHQ/infrastructure/blob/main/templates/cloudfront/log_storage.yaml) | eu-west-1 | Buckets. Deploy **first** |
| [`templates/cloudfront/access_logs.yaml`](https://github.com/AlphadayHQ/infrastructure/blob/main/templates/cloudfront/access_logs.yaml) | us-east-1 | The three delivery resources |
| [`queries/athena/cloudfront_logs.sql`](https://github.com/AlphadayHQ/infrastructure/blob/main/queries/athena/cloudfront_logs.sql) | eu-west-1 | Both tables and the thesis query |

> **How to read this appendix.** It was originally written blind — AWS was unreachable from the
> authoring environment — and **every substantive step in it was wrong**. It is preserved as a
> corrected record rather than rewritten clean, because the errors are more instructive than the
> procedure. The table below is the whole of it:
>
> | Original said | Reality |
> | --- | --- |
> | `create-bucket` + `BucketOwnerPreferred` ACL | Bucket already existed; v2 needs no ACL, AWS writes the bucket policy |
> | `update-distribution` read-modify-write with `ETag` | Wrong API — `put-delivery-source` → `put-delivery-destination` → `create-delivery`, in **us-east-1** |
> | Partition projection over `cf/${day}/` | No such path. Real layout is Hive `key=value` segments |
> | `skip.header.line.count = 2` | **`1`** for v2 plain — otherwise it silently drops rows |
> | Standard-IA lifecycle transition | No-op at 1,773-byte objects; would bill at the 128 KB minimum if it did fire |
> | "Logs appear within about an hour" | ~3 minutes |
> | Athena cost ~$1–5/month, "partitioning is the cost control" | ~$0.08/month; partitioning saves ~2¢ and is for query latency |
> | The thesis query itself | Did not run. `WHERE crawler <> 'other'` cannot reference a `SELECT` alias; needs a CTE |
>
> **The header count is the one that mattered**, and it is a different class from the rest. The
> others fail loudly — a wrong API errors, a wrong path returns nothing. `skip.header.line.count=2`
> against a v2 plain file, which carries **one** bare column-name header row rather than legacy's
> `#Version:`/`#Fields:` pair, discards the first real log line of every file with no error at all.
> At ~7 lines per file that is **~14% of all rows**, silently. Every crawler count would have been
> understated by roughly a seventh, and the numbers would have looked entirely plausible.
>
> An appendix built to measure something would have quietly corrupted that measurement. "Untested"
> on the label did not prevent that; it only moved the debugging cost onto whoever ran it.

### What exists

| | |
| --- | --- |
| v2 log bucket | `alphaday-cf-logs-v2` (eu-west-1), 180-day expiry, `DeletionPolicy: Retain` |
| Legacy log bucket | `alphaday-cloudfront-logs` (eu-west-1) — **historical only, do not deliver here** |
| Athena results | `alphaday-athena-results` (eu-west-1), 30-day expiry |
| `alphaday.com` / `www` | `E1QZ56RJ904M5R` — **v2 logging live 2026-09-04** |
| `app.alphaday.com` | `E3OO04R68QCILU` — legacy logging since **2023-06-05** (three-year baseline) |
| Athena tables | `cf_logs.cf_logs_alphaday` (partitioned), `cf_logs.cf_logs_app_history` (legacy, flat) |

**The two buckets must stay separate.** The obvious economy — pointing v2 delivery at the existing
`alphaday-cloudfront-logs` under a new prefix — quietly destroys the baseline. `cf_logs_app_history`
uses that bucket's **root** as its `LOCATION`, and Athena reads a `LOCATION` recursively, so any new
prefix pulls a second distribution and a second log format into the pre-`noindex` crawler series and
raises the scan cost of every query against it. The legacy bucket also has no expiration rule, so
logs delivered there accumulate indefinitely.

Actual key layout:

```
AWSLogs/aws-account-id=<acct>/CloudFront/distributionid=E1QZ56RJ904M5R/year=2026/month=09/day=04/E1QZ56RJ904M5R.2026-09-04-07.43e2d1fb.gz
```

Fully Hive-compatible, so projection needs no crawler, no `MSCK REPAIR`, no `ALTER TABLE`. A verified
single-day query scanned **1,342 bytes**.

### Athena table

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS cf_logs.cf_logs_alphaday (
  `date` DATE, time STRING, location STRING, bytes BIGINT, request_ip STRING,
  method STRING, host STRING, uri STRING, status INT, referrer STRING,
  user_agent STRING, query_string STRING, cookie STRING, result_type STRING,
  request_id STRING, host_header STRING, request_protocol STRING,
  request_bytes BIGINT, time_taken FLOAT, xforwarded_for STRING,
  ssl_protocol STRING, ssl_cipher STRING, response_result_type STRING,
  http_version STRING, fle_status STRING, fle_encrypted_fields INT,
  c_port INT, time_to_first_byte FLOAT, x_edge_detailed_result_type STRING,
  sc_content_type STRING, sc_content_len BIGINT,
  sc_range_start BIGINT, sc_range_end BIGINT
)
PARTITIONED BY (distributionid STRING, year INT, month INT, day INT)
ROW FORMAT DELIMITED FIELDS TERMINATED BY '\t'
LOCATION 's3://alphaday-cf-logs-v2/AWSLogs/aws-account-id=<acct>/CloudFront/'
TBLPROPERTIES (
  -- ONE, not two. v2 plain emits a single bare column-name row; legacy emits
  -- #Version: and #Fields:. Using 2 here drops the first real record of every
  -- file and reports no error.
  'skip.header.line.count'='1',
  'projection.enabled'='true',
  'projection.distributionid.type'='enum',
  'projection.distributionid.values'='E1QZ56RJ904M5R',
  'projection.year.type'='integer',  'projection.year.range'='2026,2035', 'projection.year.digits'='4',
  'projection.month.type'='integer', 'projection.month.range'='1,12',     'projection.month.digits'='2',
  'projection.day.type'='integer',   'projection.day.range'='1,31',       'projection.day.digits'='2',
  'storage.location.template'='s3://alphaday-cf-logs-v2/AWSLogs/aws-account-id=<acct>/CloudFront/distributionid=${distributionid}/year=${year}/month=${month}/day=${day}'
);
```

Two details in that statement are load-bearing and easy to lose in a tidy-up. The partition columns
are **`INT`, not `STRING`** — they pair with `projection.*.type=integer`, and the `digits` properties
are what reconcile an `INT` value of `9` with the zero-padded `month=09` in the path. And **`date`
needs backticks**, not double quotes: Athena's Hive DDL parser rejects `"date"` here, and the error it
returns points at `EXTERNAL` on line 1 rather than at the column, which sends you looking in the wrong
place entirely.

The three-year `app.alphaday.com` history is in the **legacy flat layout** and needs a separate
unpartitioned table with `skip.header.line.count='2'`. Roughly 1 GB, so a full scan is under a cent.

### The thesis query

Fetches, status mix and bytes per crawler — the direct read on whether §6 worked:

```sql
WITH tagged AS (
SELECT status, bytes, uri, time_to_first_byte,
  CASE
    WHEN ua LIKE '%GPTBot%'             THEN 'GPTBot'
    WHEN ua LIKE '%OAI-SearchBot%'      THEN 'OAI-SearchBot'
    WHEN ua LIKE '%ChatGPT-User%'       THEN 'ChatGPT-User'
    WHEN ua LIKE '%ClaudeBot%'          THEN 'ClaudeBot'
    WHEN ua LIKE '%Claude-User%'        THEN 'Claude-User'
    WHEN ua LIKE '%PerplexityBot%'      THEN 'PerplexityBot'
    WHEN ua LIKE '%CCBot%'              THEN 'CCBot'
    WHEN ua LIKE '%Google-Extended%'    THEN 'Google-Extended'
    WHEN ua LIKE '%Perplexity-User%'    THEN 'Perplexity-User'
    WHEN ua LIKE '%Applebot-Extended%'  THEN 'Applebot-Extended'
    WHEN ua LIKE '%meta-externalagent%' OR ua LIKE '%Meta-ExternalFetcher%'
                                        THEN 'Meta-External'
    WHEN ua LIKE '%Bytespider%'         THEN 'Bytespider'
    WHEN ua LIKE '%Googlebot%'          THEN 'Googlebot'
    WHEN ua LIKE '%bingbot%'            THEN 'Bingbot'
    ELSE 'other'
  END AS crawler
FROM (SELECT *, url_decode(user_agent) AS ua FROM cf_logs.cf_logs_alphaday
      WHERE year = 2026 AND month = 9)          -- projection prunes on this
)
SELECT crawler,
  COUNT(*) AS fetches,
  COUNT_IF(status >= 400) AS errors,
  COUNT(DISTINCT uri) AS distinct_uris,
  ROUND(SUM(bytes) / 1048576.0, 1) AS mb,
  ROUND(AVG(time_to_first_byte), 3) AS avg_ttfb
FROM tagged
WHERE crawler <> 'other'
GROUP BY crawler ORDER BY fetches DESC;
```

**The CTE is not stylistic.** An earlier form of this query put the `CASE` directly in the `SELECT`
list and filtered with `WHERE crawler <> 'other'` in the same statement. Athena rejects that —
`COLUMN_NOT_FOUND: Column 'crawler' cannot be resolved` — because a `SELECT` alias is not in scope in
its own `WHERE`. The tagging has to happen in a subquery or CTE before it can be filtered on.

The `year`/`month`/`day` predicate belongs **inside** the CTE, where it can prune, not outside it.

Two follow-ups worth saving:

- **Are the §6 artifacts being fetched?** Filter `uri IN ('/llms.txt', '/llms-full.txt',
  '/openapi.json', '/robots.txt')`, group by crawler. If §6 shipped and nothing fetches it, that is
  the answer, and it is worth knowing early.
- **Which URLs has Googlebot actually crawled?** `SELECT DISTINCT uri` filtered to Googlebot — the
  crawled-and-indexed precondition §4.3's pruning job depends on, and why §7.1 pays for itself twice.

Fetches are not citations. Logs show GPTBot pulling `/llms.txt`; nothing here shows whether Alphaday
was recommended in an answer. `ChatGPT-User` and `Claude-User` are retrieval-time fetches — someone
asked and the model went to look — which is a materially better signal than a training crawl, and
worth separating for that reason.

### Bucket hygiene

**The legacy bucket**, `alphaday-cloudfront-logs`, has `abort-incomplete-multipart`,
noncurrent-version expiry, and an intelligent-tiering transition. **That last rule cannot fire**: the
bucket carries `TransitionDefaultMinimumObjectSize: all_storage_classes_128K` and the average log
object is **1,773 bytes**. It wants a 180-day expiration and no tiering rule — merged with the
existing rules, since `put-bucket-lifecycle-configuration` replaces the whole configuration.

Not urgent: three years of unmanaged logs (325,402 objects, 1.06 GB) currently cost **$0.024/month**.
This is hygiene, not savings. The v2 bucket already has the 180-day rule, set by its stack.

**The bucket policy is AWS-managed and outside CloudFormation.** AWS attaches the `s3:PutObject`
grant itself when a delivery is created, and does **not** remove it when one is deleted — the stale
statement is scoped by `aws:SourceArn` to the dead delivery source, so it grants nothing, but it
accumulates one statement per delete/recreate cycle. Neither stack creates or cleans it. Check
`get-bucket-policy` after any recreate; one orphan was removed by hand on 2026-09-04. This is the
one part of the setup that IaC does not actually cover, which is worth knowing before trusting the
templates to describe the whole system.

### Cost — measured

Calibrated against `app.alphaday.com`'s August output: **158,606 requests → 9,607 log objects,
16.2 MiB gzipped** — 107 gzipped bytes and 0.061 log files per request. eu-west-1 list prices from
the Pricing API: PUT $0.005/1,000, Standard $0.023/GB-mo, Athena $5.00/TB.

| Scenario | Requests/mo | Log GB/mo | Total/month |
| --- | --- | --- | --- |
| `alphaday.com` today | 231,973 | 0.02 | **$0.05 – $0.08** |
| + `app.alphaday.com` | 390,579 | 0.04 | $0.05 – $0.13 |
| 100k PV/mo | 1.2M | 0.13 | $0.07 – $0.38 |
| 1M PV/mo | 12M | 1.29 | $0.40 – $3.82 |
| 5M PV/mo | 60M | 6.44 | $2.00 – $19.09 |

Setup day cost **$0.02** — six queries, ~4.2 GB scanned.

The range widens with scale because **S3 PUTs are the only line that matters**, and their scaling is
not pinned: file count is driven by edge fan-out and flush interval rather than request volume, so it
grows sub-linearly — but with no published ceiling on file size, the high column assumes linear
growth.

> **Re-measure in a week.** The first v2 file held **7 log lines in ~1.8 KB**. If v2 keeps writing
> files that small, the PUT-per-request ratio lands near the **top** of the range above rather than
> the bottom — the extrapolation is from the legacy distribution and may not carry. Check against a
> full month before treating the low column as the estimate.

Delivery to S3 is free. The CloudWatch Logs destination is metered beyond 750 bytes per request, and
Parquet output carries vended-log charges — neither is used.
