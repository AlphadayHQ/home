import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft } from "./apiFetch";
import {
  WINDOWS,
  WINDOW_DAYS,
  assessDensity,
  inWindow,
  soonestUpcoming,
} from "../data/digestWindow";

/**
 * The rolling digest behind `/projects/{entity}/this-week` (content doc C3).
 *
 * WHY THIS IS A SERVER FUNCTION AND NOT A CLIENT FETCH
 *
 * C3 names this the single most important implementation constraint, and it is
 * not a performance argument. The page's main justification is AEO: it exists to
 * be read by GPTBot, ClaudeBot, PerplexityBot and CCBot. If the recap arrives
 * via a browser fetch, every one of those sees an empty div — finding #2 on the
 * live site, reproduced on a new page — and `x-app-secret` goes back into the
 * public bundle with it (#20). The digest ships inside the HTML or the page has
 * no reason to exist.
 *
 * THE INVARIANT THIS FILE EXISTS TO HOLD
 *
 * **A section's headline count and its visible rows must come from the same
 * data.** The first version of this module broke that three separate ways and
 * every failure looked like working software: a card reading "24 events" above
 * two rows, "25 incidents" for a window that held 43, and "330 articles" above
 * "Nothing in this window" when one fetch of three failed. None of them throws,
 * none of them is visible in a test that only checks the happy path, and all of
 * them are exactly the "implying the window was quiet" failure the page's
 * freshness notice is supposed to prevent.
 *
 * There are two honest ways to satisfy it, and each feed uses exactly one:
 *
 *  - **API-counted** (`counts: "api"`). The endpoint supports `period`, returns
 *    newest-first, and the rows shown are a prefix of the window. `total` is
 *    authoritative and the rows agree with it by construction. News, project
 *    blogs, podcasts, video, forum and DAO proposals.
 *  - **Locally counted** (`counts: "local"`). The complete set for the widest
 *    window is fetched, and every count is derived from those rows. Used where
 *    `total` cannot be trusted to mean what the page says — events, whose
 *    `period` is forward-looking, and exploits, which support neither `period`
 *    nor `tags`. Correct *only* because the fetch is exhaustive; a capped fetch
 *    with local counts is bug #2 again.
 *
 * MEASURED FEED BEHAVIOUR (22 Sep 2026) — re-check before trusting it
 *
 * | feed     | order | `period` | window meaning        |
 * | -------- | ----- | -------- | --------------------- |
 * | news     | desc  | yes      | trailing              |
 * | blogs    | desc  | yes      | trailing              |
 * | podcasts | desc  | yes      | trailing              |
 * | videos   | desc  | yes      | trailing              |
 * | forum    | desc  | yes      | trailing              |
 * | dao      | desc  | yes      | trailing (`starts_at`)|
 * | events   | **asc** | yes    | **forward-looking**   |
 * | exploits | desc  | **no**   | n/a                   |
 *
 * Events is the lone exception on both axes and it is why this table exists.
 * `?period=1` on events returns rows dated from last week to **2027**, so it
 * selects recently-listed events rather than events in the trailing week — and
 * the rows arrive oldest-first, so a capped fetch truncates away the newest.
 * `?ordering=` and `?sort_by=` are silently ignored on the public API, so there
 * is no parameter that fixes either; the shape of the request has to change.
 */

/** C3: 24h / 7d / 30d, as an in-page control that does not change the URL. */
export type DigestWindow = "24h" | "7d" | "30d";

/**
 * `period` is an integer enum, not a duration string.
 *
 * Verified 18 Sep 2026: `0` is 24 hours, `1` a week, `2` a month, `3` a quarter.
 * Anything else — `?period=1d` included — returns 400 rather than falling back,
 * which is the good failure. (The published spec now documents this enum while
 * still declaring the parameter `"type": "string", "format": "date-time"`, which
 * is what made `1d` look plausible in the first place.)
 */
const PERIOD: Record<DigestWindow, number> = { "24h": 0, "7d": 1, "30d": 2 };

/**
 * Rows to pull per API-counted feed.
 *
 * The page shows at most six per section, so this only has to be deep enough
 * that narrowing to 24h still has rows. It is **not** a claim about how much
 * time 40 rows covers: at full ingest rate 40 `bitcoin` news rows span well
 * under two hours, so anyone widening the displayed window past 24h needs to
 * raise this or page — the counts stay right either way, but the list would
 * stop reaching the start of the window.
 */
const ITEMS_PER_FEED = 40;

/**
 * Hard ceiling on rows fetched for a locally-counted feed.
 *
 * These feeds must be fetched exhaustively for their counts to be true, so the
 * loop needs a stop that does not depend on the API being reasonable. If a feed
 * ever exceeds this the counts become a floor, so the cap is set far above the
 * measured maxima (62 events and 43 exploits in 30 days) and hitting it sets
 * `partial` rather than being assumed away.
 */
const MAX_LOCAL_ROWS = 400;
const LOCAL_PAGE_SIZE = 100;

/**
 * A feed is called stale when its newest row predates the window end by more
 * than this. Set above 24h deliberately: a quiet Sunday on a small feed is not
 * a defect, and flagging one would train the reader to ignore the flag.
 */
const STALE_AFTER_HOURS = 36;

type CountSource = "api" | "local";

interface FeedSpec {
  kind: string;
  label: string;
  path: string;
  /** What one row is called, for "3 proposals" rather than "3 items". */
  noun: [singular: string, plural: string];
  /**
   * Whether a gap in this feed means something is broken.
   *
   * News, blogs, podcasts, video and forum posts publish continuously, so a
   * four-day hole in one of them is a defect worth telling the reader about.
   * Proposals, conferences and exploits are episodic: "no exploit since Friday"
   * is good news, and "no conference started in four days" is a calendar, not an
   * outage. Flagging those as stale would report normal quiet as a fault and
   * teach the reader to ignore the notice — the same trust failure the notice
   * exists to prevent.
   */
  continuous: boolean;
  /** See the two strategies in this file's header. */
  counts: CountSource;
  /**
   * `true` for a feed whose rows are ahead of the window end rather than behind
   * it. Only events. The section carries this to the browser so the client-side
   * narrowing filters in the same direction the counts were computed in —
   * disagreeing about direction is how bug #1 rendered a count of 24 above two
   * rows.
   */
  upcoming: boolean;
  /**
   * Whether these rows are about the entity at all.
   *
   * `false` only for exploits, whose endpoint takes no `tags` — so the identical
   * ~43 incidents appear on all 16 pages. That matters in three places: the
   * density gate must not count them (a constant contribution makes a floor
   * unreachable), the volume ranking must not let them outrank the entity's own
   * coverage, and the prose must not describe them as the entity's.
   */
  entitySpecific: boolean;
}

/**
 * The evidence panel, in C3's terms: "news across the 49 outlets, podcast and
 * video coverage, governance activity, events, any exploit."
 *
 * Order here is the tie-break only — sections are ranked by volume at render, so
 * a quiet week reorders the page rather than leading with an empty block.
 *
 * Exported for `src/__tests__/this-week.test.ts`, which asserts the
 * classification on these values rather than on this file's formatting.
 */
export const FEEDS: FeedSpec[] = [
  { kind: "news", label: "News", path: "items/news", noun: ["article", "articles"], continuous: true, counts: "api", upcoming: false, entitySpecific: true },
  { kind: "blogs", label: "Project blogs", path: "items/blogs", noun: ["post", "posts"], continuous: true, counts: "api", upcoming: false, entitySpecific: true },
  { kind: "podcasts", label: "Podcasts", path: "items/podcasts", noun: ["episode", "episodes"], continuous: true, counts: "api", upcoming: false, entitySpecific: true },
  { kind: "videos", label: "Video", path: "items/videos", noun: ["video", "videos"], continuous: true, counts: "api", upcoming: false, entitySpecific: true },
  { kind: "forum", label: "Governance forum", path: "items/forum", noun: ["post", "posts"], continuous: true, counts: "api", upcoming: false, entitySpecific: true },
  { kind: "dao", label: "DAO proposals", path: "items/dao", noun: ["proposal", "proposals"], continuous: false, counts: "api", upcoming: false, entitySpecific: true },
  // Forward-looking and oldest-first — the exception documented in the header.
  { kind: "events", label: "Upcoming events", path: "items/events", noun: ["event", "events"], continuous: false, counts: "local", upcoming: true, entitySpecific: true },
];

/** Not in `FEEDS`: a different base path, and neither `tags` nor `period`. */
const EXPLOITS: FeedSpec = {
  kind: "exploits",
  /*
   * "across all protocols" is load-bearing, not padding. The rows are identical
   * on all 16 pages, so a bare "Security incidents" heading on `/optimism/this-week`
   * reads as Optimism incidents. The label is the only thing that stops it.
   */
  label: "Security incidents across all protocols",
  path: "security/exploits",
  noun: ["incident", "incidents"],
  // An exploit-free week is the best possible week, never a stale feed.
  continuous: false,
  counts: "local",
  upcoming: false,
  // The endpoint takes no `tags`, so these rows are the same on every page.
  entitySpecific: false,
};

export interface DigestItem {
  id: string;
  title: string;
  /** Absent on events, which carry no link. */
  url: string | null;
  /** ISO 8601. `published_at`, or `starts_at` on events and DAO proposals. */
  at: string;
  source: string | null;
  /** Events only. */
  location?: string | null;
}

export interface DigestSection {
  kind: string;
  label: string;
  noun: [string, string];
  /**
   * `null` where the count could not be established — a failed request, not a
   * quiet window. The page renders an em dash for it; rendering `0` would be the
   * same lie as bug #3.
   */
  counts: Record<DigestWindow, number | null>;
  items: DigestItem[];
  newestAt: string | null;
  /**
   * The **item** fetch failed, so there are no rows to show regardless of what
   * the counts say. Tracked on the item fetch alone and not on all-three-failed:
   * the case that misleads is precisely the partial one.
   */
  unavailable: boolean;
  continuous: boolean;
  upcoming: boolean;
  /** See `FeedSpec.entitySpecific`. Only exploits are `false`. */
  entitySpecific: boolean;
  /**
   * The fetch behind a locally-counted feed did not complete, so this section's
   * counts are a floor rather than a total. Rendered as a `+` on the count.
   */
  partial: boolean;
}

export interface Digest {
  tag: string;
  /**
   * The end of the data window — C3's "7 days to 31 Aug 2026, 14:00 UTC".
   *
   * This is the query time, and it is the *only* timestamp of the three C3
   * distinguishes that the page may show. Render time is meaningless and never
   * displayed; `dateModified` is `freshestAt` below, not this, so the page does
   * not claim to have changed merely because it was regenerated.
   */
  asOf: string;
  /** Newest row across every trailing section. The honest `dateModified`. */
  freshestAt: string | null;
  sections: DigestSection[];
  totals: Record<DigestWindow, number>;
  defaultWindow: DigestWindow;
  widened: boolean;
  thin: boolean;
  stale: Array<{ kind: string; label: string; newestAt: string }>;
}

interface FeedResponse {
  total?: number;
  results?: Array<Record<string, unknown>>;
  links?: { next?: string | null };
}

const qs = (params: Record<string, string | number>) =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

function normalise(row: Record<string, unknown>, kind: string): DigestItem | null {
  const title = asString(row.title) ?? asString(row.name);
  const at = asString(row.published_at) ?? asString(row.starts_at);
  if (!title || !at) return null;

  const source = row.source as { name?: string } | undefined;

  return {
    id: String(row.id ?? `${kind}-${at}-${title.slice(0, 24)}`),
    title,
    url: asString(row.url),
    at,
    source: asString(source?.name),
    ...(kind === "events" ? { location: asString(row.location) } : {}),
  };
}

/** Newest first, for trailing feeds. */
const byNewest = (items: DigestItem[]) =>
  [...items].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

/** Soonest first, for the upcoming-events calendar. */
const bySoonest = (items: DigestItem[]) =>
  [...items].sort((a, b) => (a.at > b.at ? 1 : a.at < b.at ? -1 : 0));

/**
 * Follow `links.next` until the set is exhausted or the cap is reached.
 *
 * Only for locally-counted feeds, where an incomplete fetch turns every count
 * into an undercount. `stop` lets a descending feed quit as soon as it has read
 * past the window instead of walking the whole archive.
 */
export async function fetchAllPages(
  first: string,
  stop?: (rows: Array<Record<string, unknown>>) => boolean
): Promise<{
  rows: Array<Record<string, unknown>>;
  failed: boolean;
  /**
   * The walk did not reach the end of what it was after, so every count derived
   * from these rows is a **floor rather than a total**.
   *
   * Two causes, one meaning. A page failing mid-walk used to set neither `failed`
   * (rows had already arrived) nor the row ceiling, so a partial fetch produced
   * an authoritative-looking undercount with no signal at all — precisely the
   * failure this module's header says the local-count strategy is "correct only
   * because the fetch is exhaustive" to avoid. Hitting `MAX_LOCAL_ROWS` with more
   * pages outstanding means the same thing to a reader, so it is the same flag.
   *
   * Stopping early because `stop()` said the window is covered is **not** partial:
   * that is the walk finishing successfully, just sooner than the archive ends.
   *
   * Exported only so `src/__tests__/this-week.test.ts` can drive the failure
   * paths, which are unreachable from a happy-path render: bitcoin's 62 events
   * and the exploit walk both finish in a single page today, so every branch
   * below except the first is latent until a feed grows.
   */
  partial: boolean;
}> {
  const rows: Array<Record<string, unknown>> = [];
  let next: string | null = first;
  let failed = false;
  let partial = false;

  while (next) {
    if (rows.length >= MAX_LOCAL_ROWS) {
      partial = true;
      break;
    }

    const body: FeedResponse | null = await fetchJsonSoft<FeedResponse>(next);
    if (!body) {
      // Nothing at all vs. some-then-broke. Both are reported, differently.
      if (rows.length === 0) failed = true;
      else partial = true;
      break;
    }

    const page = body.results ?? [];
    rows.push(...page);

    // A natural end: no more rows, or the window is already covered.
    if (page.length === 0 || (stop && stop(page))) break;

    next = body.links?.next ?? null;
  }

  return { rows, failed, partial };
}

/** The API-counted strategy: `period` totals, plus a newest-first prefix. */
async function loadApiCounted(spec: FeedSpec, tag: string): Promise<DigestSection> {
  const base = `${API_BASE}/${spec.path}/`;

  const [wide, day, week] = await Promise.all([
    fetchJsonSoft<FeedResponse>(
      `${base}?${qs({ tags: tag, period: PERIOD["30d"], limit: ITEMS_PER_FEED })}`
    ),
    fetchJsonSoft<FeedResponse>(
      `${base}?${qs({ tags: tag, period: PERIOD["24h"], limit: 1 })}`
    ),
    fetchJsonSoft<FeedResponse>(
      `${base}?${qs({ tags: tag, period: PERIOD["7d"], limit: 1 })}`
    ),
  ]);

  const items = byNewest(
    (wide?.results ?? [])
      .map((row) => normalise(row, spec.kind))
      .filter((item): item is DigestItem => item !== null)
  );

  return {
    kind: spec.kind,
    label: spec.label,
    noun: spec.noun,
    counts: {
      "24h": day?.total ?? null,
      "7d": week?.total ?? null,
      "30d": wide?.total ?? null,
    },
    items,
    newestAt: items[0]?.at ?? null,
    unavailable: wide === null,
    continuous: spec.continuous,
    upcoming: false,
    entitySpecific: spec.entitySpecific,
    // Never partial: an API-counted section's totals come from the API, not from
    // how many rows the item fetch happened to return.
    partial: false,
  };
}

/**
 * Events: the whole set, counted forward from today.
 *
 * `period=2` is the widest listing the API offers and it returns 62 rows for
 * `bitcoin`, so exhausting it is cheap. Counts are derived from those rows
 * because the endpoint's own `total` answers a different question than the page
 * asks — it counts recently-listed events, including ones in 2027.
 */
async function loadUpcoming(spec: FeedSpec, tag: string, asOf: Date): Promise<DigestSection> {
  const { rows, failed, partial } = await fetchAllPages(
    `${API_BASE}/${spec.path}/?${qs({
      tags: tag,
      period: PERIOD["30d"],
      limit: LOCAL_PAGE_SIZE,
    })}`
  );

  /*
   * Trimmed to the widest forward window before serialising.
   *
   * The listing is fetched whole because its counts are derived locally, but a
   * forward-only section can never render a past row — `itemsWithin` filters
   * ahead of `asOf` in every window. Keeping them would ship ~50 rows of dead
   * weight in the SSR payload and leave a 2026-08-26 date sitting in the HTML of
   * a page about this week, which is the sort of thing that reads as a bug to
   * anyone who looks.
   */
  const items = bySoonest(
    rows
      .map((row) => normalise(row, spec.kind))
      .filter((item): item is DigestItem => item !== null)
  ).filter((item) => inWindow(item.at, asOf, WINDOW_DAYS["30d"], true));

  const count = (days: number) =>
    items.filter((item) => inWindow(item.at, asOf, days, true)).length;

  return {
    kind: spec.kind,
    label: spec.label,
    noun: spec.noun,
    counts: { "24h": count(1), "7d": count(7), "30d": count(30) },
    items,
    /*
     * The next event, not the first row.
     *
     * `items[0]` was wrong and shipped that way: these rows are ascending and
     * include past events, so the first element is the oldest row in the listing
     * (measured: 2026-08-26) under a comment asserting it was the soonest
     * upcoming one. Nothing reads it today — `freshestAt` filters out upcoming
     * sections and `stale` requires `continuous` — which is precisely why a wrong
     * value behind a confident comment was worth fixing rather than leaving for
     * whoever reads it next.
     */
    newestAt: soonestUpcoming(items, asOf),
    unavailable: failed,
    continuous: spec.continuous,
    upcoming: true,
    entitySpecific: spec.entitySpecific,
    partial,
  };
}

interface ExploitRow {
  id?: number;
  protocol?: string | null;
  date?: string | null;
  attack_type?: { name?: string } | null;
}

/**
 * Exploits: paged until the window is covered, then counted locally.
 *
 * The endpoint takes neither `tags` nor `period`, so both the filter and the
 * counts happen here — and that only works if the fetch reaches past the 30-day
 * cutoff. A fixed `limit=25` does not: there were 43 incidents in the last 30
 * days and the 25th row was dated 2026-09-03, so the card claimed 25 for a
 * window holding 43 and the "30 days" it covered was really about 19. The
 * endpoint's `total` is no help — it is the all-time 195.
 *
 * Tags are deliberately not applied even though the window is: an exploit is
 * newsworthy to a Bitcoin reader whether or not the record carries a Bitcoin
 * tag, and C3 asks for "any exploit" rather than the entity's own.
 *
 * `amount_usd` and `chain` are deliberately not rendered. Coverage is ~14% and
 * ~2% respectively and falling, so a loss figure would be absent far more often
 * than present.
 */
async function loadExploits(asOf: Date): Promise<DigestSection> {
  const cutoff = asOf.getTime() - 30 * 86_400_000;

  const { rows, failed, partial } = await fetchAllPages(
    `${API_BASE}/${EXPLOITS.path}/?${qs({ limit: LOCAL_PAGE_SIZE })}`,
    // Descending by date: once a page ends older than the window, stop.
    (page) => {
      const last = page[page.length - 1] as ExploitRow | undefined;
      const date = last?.date;
      return typeof date === "string" && Date.parse(`${date}T00:00:00Z`) < cutoff;
    }
  );

  /*
   * Trimmed to the widest window, for the same reason as events: the walk reads
   * past the 30-day cutoff on purpose so the counts are exact, but a row older
   * than the widest window can never render and would only bloat the payload —
   * the 100-row walk reaches back to June for a page that shows 30 days.
   */
  const items = byNewest(
    (rows as ExploitRow[])
      .filter((row) => typeof row.date === "string")
      .map((row) => ({
        id: String(row.id ?? row.date),
        title: row.protocol
          ? `${row.protocol}${row.attack_type?.name ? ` — ${row.attack_type.name}` : ""}`
          : (row.attack_type?.name ?? "Unattributed incident"),
        url: null,
        // `date` is a bare day; anchor it at midnight so window maths is total.
        at: `${row.date}T00:00:00Z`,
        source: null,
      }))
  ).filter((item) => inWindow(item.at, asOf, WINDOW_DAYS["30d"], false));

  const count = (days: number) =>
    items.filter((item) => inWindow(item.at, asOf, days, false)).length;

  return {
    kind: EXPLOITS.kind,
    label: EXPLOITS.label,
    noun: EXPLOITS.noun,
    counts: { "24h": count(1), "7d": count(7), "30d": count(30) },
    items,
    newestAt: items[0]?.at ?? null,
    unavailable: failed,
    continuous: EXPLOITS.continuous,
    upcoming: false,
    entitySpecific: EXPLOITS.entitySpecific,
    partial,
  };
}

/**
 * Build the digest for one tag.
 *
 * `tag` is a keyword match rather than a taxonomy slug — `?tags=` searches the
 * keyword bag on each record, which is why `?tags=banana` returns 77 news items.
 * For a high-volume entity that is generous in the right direction; it is also
 * why this page is gated to an allowlist in the route rather than accepting any
 * slug, since a fuzzy match on an obscure term would produce a plausible-looking
 * page built from loosely related rows.
 */
export const getDigest = createServerFn({ method: "GET" })
  .validator((tag: string) => tag)
  .handler(async ({ data: tag }): Promise<Digest> => {
    const asOf = new Date();

    const sections = await Promise.all([
      ...FEEDS.map((spec) =>
        spec.upcoming
          ? loadUpcoming(spec, tag, asOf)
          : loadApiCounted(spec, tag)
      ),
      loadExploits(asOf),
    ]);

    const countFor = (w: DigestWindow) =>
      sections.reduce((sum, s) => sum + (s.counts[w] ?? 0), 0);

    const totals = WINDOWS.reduce(
      (acc, w) => {
        acc[w] = countFor(w);
        return acc;
      },
      {} as Record<DigestWindow, number>
    );

    /*
     * `dateModified` must describe published coverage, so upcoming events are
     * excluded: a conference scheduled for 2027 would otherwise date the page in
     * the future, which is both false and the sort of thing Google discounts the
     * whole signal for.
     */
    const dated = sections
      .filter((s) => !s.upcoming)
      .map((s) => s.newestAt)
      .filter((at): at is string => at !== null)
      .sort();

    /*
     * The gate reads entity-specific trailing coverage only, via `assessDensity`.
     *
     * It used to read `totals`, which sums every section — so 8 events scheduled
     * next week pushed `japan`'s 16-row window past a floor of 20, and the page
     * shipped indexable while printing "16 indexed items from the last 7 days".
     * Exploits made it worse: ~43 identical incidents on every page meant
     * `thin` could never be true however dead an entity's own feeds were, which
     * killed the `noindex` fallback in exactly the outage case it was written for.
     */
    const { defaultWindow, widened, thin } = assessDensity(sections);

    /*
     * Feeds whose newest row lags the window end — reported, not hidden. Only
     * continuously-published feeds qualify: "no conference started in four days"
     * is a calendar and "no exploit since Friday" is good news, and a notice that
     * fires on normal quiet is one nobody reads when it is real.
     */
    const cutoff = asOf.getTime() - STALE_AFTER_HOURS * 3_600_000;
    const stale = sections
      .filter(
        (s) =>
          s.continuous &&
          !s.unavailable &&
          (s.counts["30d"] ?? 0) > 0 &&
          s.newestAt !== null &&
          Date.parse(s.newestAt) < cutoff
      )
      .map((s) => ({
        kind: s.kind,
        label: s.label,
        newestAt: s.newestAt as string,
      }));

    return {
      tag,
      asOf: asOf.toISOString(),
      freshestAt: dated.at(-1) ?? null,
      /*
       * C3: grouped by type and ranked by volume, on the window the page opens on
       * — but a section that is not about this entity is pinned last regardless of
       * how large it is. On a low-density entity the shared exploit feed was 43 of
       * 148 rows and the second-biggest block on the page, none of it about the
       * entity. Volume is the right ordering among the entity's own feeds and the
       * wrong one across that boundary.
       */
      sections: [...sections].sort((a, b) => {
        if (a.entitySpecific !== b.entitySpecific) return a.entitySpecific ? -1 : 1;
        return (b.counts[defaultWindow] ?? 0) - (a.counts[defaultWindow] ?? 0);
      }),
      totals,
      defaultWindow,
      widened,
      thin,
      stale,
    };
  });

export { WINDOW_DAYS };
