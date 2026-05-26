# Project Landing Pages — Implementation Plan

SEO-oriented landing pages at `alphaday.com/{slug}` for every public Alphaday dashboard. Marketing-only — no live data, no widgets, no interactivity. Visitors click the CTA and are sent to the live dashboard at `app.alphaday.com/b/{slug}`.

## Approach: CSR (phase 1)

Add a catch-all slug route to the existing Vite + React SPA. On mount, fetch board metadata from the Alphaday API and render the marketing sections from the response.

**Why CSR first:** ships fast, reuses existing tooling (Vite, react-helmet-async, Tailwind), no build pipeline changes.

**Known tradeoff:** Google can index CSR pages (executes JS), but social unfurl crawlers (Twitter, Slack, LinkedIn) cannot — shared links will show the default Alphaday OG card until we add SSG. Acceptable for v1; SSG is the documented follow-up.

## API findings

Single endpoint covers everything we need:

```
GET https://api.alphaday.com/ui/views/resolve/?slug={slug}
Headers: x-app-id, x-app-secret  (already in home/.env.local as VITE_X_APP_ID / VITE_X_APP_SECRET)
```

Base URL switches by env (already wired in `src/config.js`):
- prod → `api.alphaday.com`
- dev  → `api.zettaday.com`

### Response shape (relevant fields, from `slug=avalanche`)

```jsonc
{
  "name": "Avalanche",
  "slug": "avalanche",
  "icon": "https://.../Avalanche_KWRMPYp.png",
  "description": "Build anything you want, any way you want on the lightning fast, scalable blockchain...",
  "keywords": [...],
  "categories": [                       // ecosystem taxonomy — NOT widget-type
    { "slug": "general_widget_category", "name": "General" },
    { "slug": "nfts_widget_category",    "name": "NFTs" },
    { "slug": "defi_widget_category",    "name": "DeFi" }
  ],
  "widgets": [
    { "widget": { "slug": "news_widget",        "name": "News",       "categories": [...] } },
    { "widget": { "slug": "market_widget",      "name": "Market" } },
    { "widget": { "slug": "metadata_avalanche_30f0b6", "name": "Token Metrics for Avalanche" } },
    { "widget": { "slug": "forum_widget",       "name": "Forum" } },
    { "widget": { "slug": "video_widget",       "name": "Videos" } },
    { "widget": { "slug": "podcast_widget",     "name": "Podcasts" } },
    { "widget": { "slug": "reddit_widget",      "name": "Reddit" } },
    { "widget": { "slug": "discord_widget",     "name": "Discord Announcements" } },
    { "widget": { "slug": "calendar_widget",    "name": "Calendar" } },
    { "widget": { "slug": "blog_widget",        "name": "Blog" } },
    { "widget": { "slug": "avalanche_dapps_ecosystem_widget" } },
    { "widget": { "slug": "avalanche_dev_resources_widget" } },
    /* ...20 widgets total */
  ]
}
```

### Critical: widget-category mapping is by widget slug, not widget.categories

The plan's category grid lists 10 marketing card types (News, Price, Governance, On-Chain, Social, Events, Videos, Podcasts, Blog, Token). The API's `widget.categories[]` field uses **ecosystem taxonomy** (`defi_widget_category`, `nfts_widget_category`, `layer_2_widget_category`, etc.) — wrong axis.

The right derivation is **widget slug → marketing card**:

| Widget slug | Marketing card |
|---|---|
| `news_widget`, `news_summary` | News |
| `market_widget` | Price & Market Data |
| `metadata_*` (prefix) | Token Metrics |
| `forum_widget` | Governance |
| `reddit_widget`, `discord_widget`, `twitter_widget` | Social |
| `video_widget`, `*_media_widget` | Videos |
| `podcast_widget` | Podcasts |
| `calendar_widget` | Events |
| `blog_widget` | Blog & Forum |
| *(none observed yet)* | On-Chain Analytics |

Note: a single dashboard's slug coverage may not hit all 10 cards. Avalanche has ~9 of 10 — On-Chain Analytics is absent. That's fine: per the plan, "if a dashboard has no governance widgets, the governance card does not appear."

Lookup lives in [src/components/landing/widgetCategoryMap.js](../src/components/landing/widgetCategoryMap.js).

### Token ticker — not in the response

There is **no top-level `token` / `symbol` / `ticker` field**. The "Token Metrics" widget's settings reference a `coin_id` (e.g. 348 for AVAX), and the actual ticker would require a second call to a coin-detail endpoint.

**Decision (per feedback):** use dummy data for now, flag for backend follow-up.

Implementation:
- Function `getToken(board)` returns `null` when the ticker cannot be derived.
- Card copy with `{token}` placeholder falls back gracefully — e.g. "Price, volume, market cap..." instead of "AVAX price, volume, market cap...".
- TODO comment + a `TOKEN_OVERRIDES` const map (`{ avalanche: "AVAX", arbitrum: "ARB", ... }`) so we can hand-fill the common ones today without waiting on backend.

**Backend follow-up:** add a `token_symbol` (or similar) field to the view model, derived from the primary coin association.

## File-by-file implementation

### 1. `src/api/boards.js` *(new)*
Tiny fetch client. One exported function:
```js
fetchBoardBySlug(slug) → Promise<Board | null>
```
- Uses `VITE_API_BASE_URL`, `VITE_X_APP_ID`, `VITE_X_APP_SECRET` from `import.meta.env`.
- Returns `null` on 404, throws on other errors.

### 2. `src/components/landing/widgetCategoryMap.js` *(new)*
Two exports:
- `WIDGET_SLUG_TO_CARD` — lookup table per the table above.
- `deriveCards(board)` — iterates `board.widgets`, returns ordered, deduped array of marketing-card IDs present on the board.

Slug matching supports both exact (`news_widget`) and prefix (`metadata_*`).

### 3. `src/components/landing/categoryCards.js` *(new)*
The 10 card definitions from the plan (id, heading, description template, lucide-react icon). Description strings use `{project}` and `{token}` placeholders, resolved at render time.

### 4. `src/components/landing/` section components *(new)*
- `Hero.jsx` — H1, subheading, CTA button, project logo.
- `CategoryGrid.jsx` — takes `cardIds[]` + `{ project, token }`, renders matching cards.
- `DashboardScreenshot.jsx` — generic static image + caption with `{project}` substitution.
- `ValueProps.jsx` — three static blocks with `{project}` substituted.
- `BottomCTA.jsx` — CTA → `app.alphaday.com/b/{slug}`.
- `LandingFooter.jsx` — "Powered by Alphaday" + social links.

All Tailwind, reuse existing tokens from `src/assets/css/alphaday.css` and the `.btn-primary` class.

### 5. `src/containers/ProjectLandingContainer.jsx` *(new)*
Owns the data lifecycle:
```js
const [state, setState] = useState({ status: "loading", board: null });
useEffect(() => { fetchBoardBySlug(slug)... }, [slug]);
```
States:
- `loading` → minimal skeleton (logo placeholder + grid shimmer).
- `not-found` → `<Error404 />`.
- `error` → generic error message + link home.
- `ready` → render `<Seo>` with per-project meta + JSON-LD, then the 6 sections.

Derived values: `project = board.name`, `slug = board.slug`, `logo = board.icon`, `token = getToken(board)`, `cardIds = deriveCards(board)`.

### 6. `src/App.jsx` *(edit)*

Current logic (lines 45-58): unsupported paths either redirect (`/b/*`, `/blog`) or 404. Insert a new branch *before* the 404:

```jsx
const slugMatch = path.match(/^\/([a-z0-9-]+)$/);
if (slugMatch) {
  return (
    <HelmetProvider>
      <CookieProvider>
        <ProjectLandingContainer slug={slugMatch[1]} />
        <CookieDisclaimer />
      </CookieProvider>
    </HelmetProvider>
  );
}
```

Existing `/b/*` and `/blog` redirects stay untouched. Reserved paths (`/privacy`, `/mobile`, `/api`) are already caught earlier by `supportedPaths.includes(path)`.

### 7. SEO

Reuse existing [src/components/seo.jsx](../src/components/seo.jsx) with per-project props:
- `title`: `{project} — News, Price, Governance & Analytics Dashboard`
- `description`: `Your all-in-one {project} dashboard. Track {token} price, news, governance, on-chain data, community updates and more.` (Drop `{token}` cleanly if null.)
- `canonical`: `https://alphaday.com/{slug}`
- OG: same as title/description; OG image stays generic for v1.

JSON-LD: append a `<script type="application/ld+json">` block via `<Helmet>` with `@type: WebPage`, `name`, `description`, `url`.

## Open items / flagged for backend

| Item | Status | Action |
|---|---|---|
| `token` ticker derivation | Not in API | Use `TOKEN_OVERRIDES` map for top dashboards + null fallback. Request backend add `token_symbol`. |
| On-Chain Analytics card | No matching widget slug observed on Avalanche | Confirm whether a TVL/on-chain widget exists on other dashboards (e.g. ethereum, arbitrum). If not, omit the card from the map until one ships. |
| Per-project OG image | Plan says TBD | Ship with generic; per-project OG via `@vercel/og`-style endpoint is a follow-up. |
| Reserved-path collision | `/{slug}` could theoretically clash with future top-level pages | Keep the slug regex narrow (`^\/[a-z0-9-]+$`) and continue routing static pages via `supportedPaths` first. |

## Explicit non-goals (v1)

- SSG / prerendering — documented follow-up for SEO + social unfurls.
- Per-project OG images.
- Updating `scripts/build-sitemap.js` to emit `alphaday.com/{slug}` URLs (small follow-up, do once routes are live).
- Analytics events on landing-page CTAs.
- Per-project copy variants beyond `{project}` / `{token}` substitution.

## Rollout order

1. API client + widget map + token override map.
2. Section components in isolation (visual review against the plan).
3. `ProjectLandingContainer` + App.jsx route + Seo wiring.
4. Manual QA on 3–5 slugs (avalanche, ethereum, arbitrum, rocket-pool, bitcoin).
5. Update sitemap script.
6. Plan v2 (SSG) once v1 is in production.
