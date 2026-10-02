/**
 * Turning raw `/items/dao/` rows into the governance report (content doc B1).
 *
 * Framework-free for the same reason as `eventRows.ts`: the page, the head and
 * the tests all have to agree about what a proposal is and which spaces count,
 * and a second definition of either is the drift `indexState.ts` exists to
 * prevent. No fetching, no side effects, no `@tanstack` import.
 *
 * `shiftMonth` comes from `eventMonths.js` rather than being redeclared here:
 * it is UTC calendar arithmetic with nothing about events in it, and that file
 * is simply named for the tier that needed it first.
 *
 * WHAT THE ENDPOINT ACTUALLY DOES — probed 30 Sep 2026, re-probe before trusting
 *
 * 6,612 rows, every `url` a `snapshot.org` proposal, 51 distinct Snapshot spaces
 * one-to-one with the 51 `source.slug` values. Newest-first by `starts_at`;
 * `limit` caps at 500 whatever you ask for.
 *
 * | parameter                        | works                                  |
 * | -------------------------------- | -------------------------------------- |
 * | `sources=` (comma-separated)     | yes — `balancer_dao` → 1,088           |
 * | `tags=`                          | yes                                    |
 * | `period=0..3`                    | yes, trailing on `starts_at`           |
 * | `starts_at=` / `ends_at=`        | yes, but **one exact day**             |
 * | `starts_at__gte` / `__lte`       | **silently ignored**                   |
 * | `ordering=`                      | silently ignored                       |
 * | `active=true`                    | returns 0 — broken, not empty          |
 *
 * The third row is the trap worth naming. `starts_at__gte`/`__lte` is the pair
 * the events calendar is built on, it is accepted here without complaint, and it
 * changes nothing: `?starts_at__gte=2026-08-01` still reports all 6,612. A month
 * range therefore cannot be requested, only an exact day, which is why this
 * module works from a full walk of the corpus instead of a windowed query. At
 * fourteen pages of 500 that is affordable; at ten times the size it would not
 * be, and the fix then is a generated series rather than a wider walk.
 */

import { shiftMonth } from "./eventMonths.js";

const DAY_MS = 86_400_000;

export interface RawProposal {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  source?: { name?: unknown; slug?: unknown } | null;
}

export interface Proposal {
  id: string;
  title: string;
  /** The Snapshot proposal URL. Every row has one, so every row is a link. */
  url: string;
  /** `source.slug` — one per Snapshot space, e.g. `balancer_dao`. */
  space: string;
  /** `source.name` — e.g. `Balancer`. */
  spaceName: string;
  /** ISO 8601. When voting opened. */
  startsAt: string;
  /** ISO 8601, or null when it merely repeats the start. */
  endsAt: string | null;
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function shapeProposal(row: RawProposal): Proposal | null {
  const title = asString(row.title);
  const url = asString(row.url);
  const startsAt = asString(row.starts_at);
  const space = asString(row.source?.slug);
  if (!title || !url || !startsAt || !space) return null;
  if (!Number.isFinite(new Date(startsAt).getTime())) return null;

  const endsAt = asString(row.ends_at);
  return {
    id: String(row.id ?? url),
    title,
    url,
    space,
    spaceName: asString(row.source?.name) ?? space,
    startsAt,
    endsAt: endsAt && endsAt !== startsAt ? endsAt : null,
  };
}

/**
 * Two proposals in one space with the same title and starts this close together
 * are one vote the feed reported twice.
 *
 * **A day is not a tuned parameter, it is a statement about governance.** A DAO
 * does not open two votes on the same text on the same day; it opens one, and
 * where it genuinely re-runs a vote the gap is weeks and the title usually says
 * so — Balancer writes `[BIP-923](rerun)`. The measured distribution agrees: of
 * 486 pairs sharing a title and a space, 268 start within the same hour and 205
 * within 36 seconds, 376 within a day, and the residue has a median gap of four
 * days and a maximum of 408.
 */
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * De-duplicated on the proposal URL, and then on title within a space and a day.
 *
 * The URL half is the easy half: 773 URLs appear more than once, 853 extra rows,
 * the same proposal ingested twice with `starts_at` differing by seconds.
 *
 * **The second half is why the first is not enough, and it was visible on the
 * rendered page before it existed.** Balancer's nine most recent BIPs each
 * arrive two or three times, every copy carrying a *different* Snapshot proposal
 * hash — so the URLs are distinct and the votes are not. "Latest proposals"
 * opened with "[BIP-928] Orderly Winddown of Balancer" three times in a row, and
 * Balancer's quarter counted 13 votes where it held 10.
 *
 * Together they remove 18.6% of the corpus. That is a large correction to admit
 * to, and the alternative is a page about measurement whose most prominent table
 * row is out by a third.
 *
 * Order-dependent by design: callers pass newest-first (`shapeProposals` sorts),
 * so the copy that survives is the most recent one.
 */
export function dedupeProposals(proposals: Proposal[]): Proposal[] {
  const urls = new Set<string>();
  const latestByTitle = new Map<string, number>();
  const kept: Proposal[] = [];

  for (const proposal of proposals) {
    if (urls.has(proposal.url)) continue;

    const key = `${proposal.space}|${proposal.title}`;
    const startsAt = new Date(proposal.startsAt).getTime();
    const previous = latestByTitle.get(key);
    if (previous !== undefined && Math.abs(previous - startsAt) <= DUPLICATE_WINDOW_MS) {
      continue;
    }

    urls.add(proposal.url);
    latestByTitle.set(key, startsAt);
    kept.push(proposal);
  }

  return kept;
}

/** Raw rows in, the proposals a page would render out, newest first. */
export function shapeProposals(rows: RawProposal[]): Proposal[] {
  const shaped: Proposal[] = [];
  for (const row of rows) {
    const proposal = shapeProposal(row);
    if (proposal) shaped.push(proposal);
  }
  shaped.sort((a, b) => (a.startsAt < b.startsAt ? 1 : a.startsAt > b.startsAt ? -1 : 0));
  return dedupeProposals(shaped);
}

/**
 * `balancer_dao` → `balancer.eth`, from the proposal URL.
 *
 * The space id is the citable name — a governance researcher knows
 * `uniswapgovernance.eth`, not `uniswap_dao`, and the slug is Alphaday's
 * internal source key. Read off the URL rather than derived from the slug,
 * because the two genuinely disagree: `yearn_dao` is `ybaby.eth` and
 * `optimism_town_hall_dao` is not `optimism.eth`.
 */
export function snapshotSpaceId(url: string): string | null {
  const match = /snapshot\.org\/#\/([^/]+)\//.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * How recently a space must have voted to count as still being indexed here.
 *
 * 90 days rather than 30. A DAO with a quiet quarter is not a dead one — eight
 * of the fifteen live spaces produced nothing in the 30 days to 30 Sep, ENS and
 * Rocket Pool among them — and a cohort that ejects a space for a quiet month
 * would report its own churn as a decline in governance.
 */
export const COHORT_WINDOW_DAYS = 90;

export interface SpaceActivity {
  space: string;
  name: string;
  /** The Snapshot space id — `balancer.eth`. Null if the URL will not yield one. */
  spaceId: string | null;
  /** Proposals all time, after de-duplication. */
  total: number;
  /** ISO 8601 start of the most recent proposal. */
  last: string;
  /** Whole days since that proposal opened. */
  silentDays: number;
  /** Proposals inside `COHORT_WINDOW_DAYS`. */
  recent: number;
}

const daysSince = (iso: string, now: number): number =>
  Math.floor((now - new Date(iso).getTime()) / DAY_MS);

/**
 * Inside the window, by the same rule the per-space counts use.
 *
 * Exported because the report was applying two rules to one window: whole days
 * here and an exact millisecond cutoff in the server, which differ for anything
 * opened part-way through the boundary day. On 30 Sep that was four Aavegotchi
 * proposals at 90.x days old, so the page said "54 proposals in the last 90
 * days" above a table whose own column added to 58 — and then divided one rule's
 * numerator by the other's denominator to claim Balancer was 19% of them.
 *
 * Whole days is the rule that survives, because it is the one the reader sees:
 * the table prints a date, not a timestamp.
 */
export const isRecent = (iso: string, now: number): boolean =>
  daysSince(iso, now) <= COHORT_WINDOW_DAYS;

/**
 * One row per Snapshot space, most recently active first.
 */
export function spaceActivity(proposals: Proposal[], now: number): SpaceActivity[] {
  const byspace = new Map<string, SpaceActivity>();

  for (const proposal of proposals) {
    const existing = byspace.get(proposal.space);
    const silentDays = daysSince(proposal.startsAt, now);
    const recent = isRecent(proposal.startsAt, now);
    if (!existing) {
      byspace.set(proposal.space, {
        space: proposal.space,
        name: proposal.spaceName,
        spaceId: snapshotSpaceId(proposal.url),
        total: 1,
        last: proposal.startsAt,
        silentDays,
        recent: recent ? 1 : 0,
      });
      continue;
    }
    existing.total += 1;
    if (recent) existing.recent += 1;
    if (proposal.startsAt > existing.last) {
      existing.last = proposal.startsAt;
      existing.silentDays = silentDays;
    }
  }

  return [...byspace.values()].sort((a, b) => a.silentDays - b.silentDays);
}

/** A space is in the measured cohort when it has voted inside the window. */
export const isLive = (activity: SpaceActivity): boolean =>
  activity.recent > 0;

export interface MonthPoint {
  month: string;
  count: number;
  /** The month the report was built in — still filling, so not comparable. */
  partial?: true;
}

/**
 * Monthly proposal counts for one set of spaces, oldest first, gaps filled.
 *
 * **Restricted to the cohort, and that restriction is the whole method.** Run
 * over all 51 spaces the same series falls from 167 a month in mid-2024 to 13 in
 * August 2026, and most of that fall is Alphaday's own coverage thinning rather
 * than anything happening in governance — 36 of the 51 spaces have no proposal
 * in the last quarter, and `aave_dao` stops dead in April 2025 while
 * `aave_forum` carried five `[ARFC]` threads in the week to 28 Sep 2026. A
 * series over a fixed set of spaces that are all demonstrably still being
 * indexed cannot report a dropped source as a decline.
 *
 * A month with no proposals is a zero, not a gap: `2021-09` is genuinely empty
 * and omitting it would compress the x-axis and flatter the trend.
 */
export function monthlySeries(
  proposals: Proposal[],
  spaces: Set<string>,
  currentMonth: string
): MonthPoint[] {
  const counts = new Map<string, number>();
  for (const proposal of proposals) {
    if (!spaces.has(proposal.space)) continue;
    const month = proposal.startsAt.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const keys = [...counts.keys()].sort();
  const series: MonthPoint[] = [];
  for (let month = keys[0]; month <= currentMonth; month = shiftMonth(month, 1)) {
    series.push({
      month,
      count: counts.get(month) ?? 0,
      ...(month === currentMonth ? { partial: true as const } : {}),
    });
  }
  return series;
}

export interface Trend {
  /** Proposals in the last 12 *complete* months. */
  trailing: number;
  /**
   * The twelve complete months before those.
   *
   * The peak comparison says how far below the best year this one is, and that
   * is the citable number — but it cannot say which way things are moving,
   * because the peak search includes the trailing window and the difference is
   * never positive. A page headed "DAOs are voting less" off a peak comparison
   * keeps saying it through a recovery. Direction needs a neighbour, not a
   * record.
   *
   * Always present: `trendOf` returns null below 24 complete months, which is
   * exactly the span two windows need.
   */
  previous: number;
  /** The highest any 12 complete months on record reached. */
  peak: number;
  /** First and last month of that peak window. */
  peakFrom: string;
  peakTo: string;
  /** Negative is a decline. Rounded to a whole percent. */
  changePct: number;
}

/**
 * Trailing twelve complete months against the best twelve on record.
 *
 * **Complete months only.** The current month is a third full on the 10th, so
 * including it would print a decline that reverses itself by the 30th — the
 * count-and-rows failure `thisWeek.ts` names, in a percentage.
 *
 * **Peak on record rather than a named year.** "Down 57% on 2024" needs
 * rewriting every January and quietly becomes wrong in between. The peak is a
 * fact about the whole series, it moves only when it is genuinely beaten, and it
 * is the comparison a reader would ask for anyway.
 *
 * Returns null until there are two full years to compare, because a peak drawn
 * from an overlapping window is a comparison with itself.
 */
export function trendOf(series: MonthPoint[]): Trend | null {
  const complete = series.filter((point) => !point.partial);
  if (complete.length < 24) return null;

  const window = (start: number) =>
    complete.slice(start, start + 12).reduce((sum, point) => sum + point.count, 0);

  const trailing = window(complete.length - 12);
  const previous = window(complete.length - 24);
  let peak = 0;
  let peakAt = 0;
  for (let start = 0; start <= complete.length - 12; start += 1) {
    const total = window(start);
    if (total > peak) {
      peak = total;
      peakAt = start;
    }
  }
  if (peak === 0) return null;

  return {
    trailing,
    previous,
    peak,
    peakFrom: complete[peakAt].month,
    peakTo: complete[peakAt + 11].month,
    changePct: Math.round((trailing / peak - 1) * 100),
  };
}

/**
 * Cohort spaces below which the report stops being about governance.
 *
 * The busiest space is 20% of the last quarter on its own — and it is Balancer,
 * currently voting on "[BIP-928] Orderly Winddown of Balancer and Distribution
 * of the Treasury". Below eight spaces one DAO's calendar drives the trend line,
 * and a headline about crypto governance is really a headline about that DAO.
 *
 * This is a feed-outage gate, not an editorial one: the cohort has held between
 * 15 and 16 spaces through 2026, so it fires when ingestion breaks, in which
 * case the honest thing is to leave the index rather than publish a collapse
 * that happened in a pipeline.
 */
export const COHORT_FLOOR = 8;

/**
 * Indexable only when the whole archive was read.
 *
 * `partial` used to be a display flag — it put a `+` on one count in the hero
 * and changed nothing else, so a single dropped page still published a
 * percentage and stayed in the sitemap. Losing page 9 of 14 publishes "down
 * 58%" instead of 66%, because the hole lands in the 2023 peak and the
 * comparison is against a peak that was never fully read.
 *
 * **The route no longer reaches this on a partial read: its loader throws, and
 * the request 500s uncached.** Rendering a reduced `noindex` page returned a
 * 200, and `server.mjs` stamps every 200 with `stale-while-revalidate`, so the
 * edge replaced the good copy with a `noindex` one for up to a day.
 *
 * This stays as the second line. It is a pure function anything can call, the
 * property it guards has already shipped wrong once, and a future caller that
 * forgets to throw should still not be able to submit a percentage drawn from a
 * gap.
 */
export const reportIsIndexable = (report: {
  cohort: SpaceActivity[];
  trend: Trend | null;
  partial: boolean;
}) => report.cohort.length >= COHORT_FLOOR && report.trend !== null && !report.partial;

/** Rows shown under the trend. Enough to be evidence, not the whole quarter. */
export const RECENT_LIMIT = 25;
