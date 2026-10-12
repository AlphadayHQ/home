import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft } from "./apiFetch";
import type { MonthPoint, Proposal, RawProposal, SpaceActivity, Trend } from "../data/governance";
import {
  COHORT_WINDOW_DAYS,
  RECENT_LIMIT,
  isLive,
  isRecent,
  monthlySeries,
  shapeProposals,
  spaceActivity,
  trendOf,
} from "../data/governance";
import { monthOf } from "../data/eventMonths.js";

/**
 * The governance report behind `/research/governance` (content doc B1).
 *
 * WHY THIS WALKS THE WHOLE CORPUS
 *
 * B1's measurement is a trend, and `/items/dao/` cannot be asked for a range —
 * `starts_at__gte`/`__lte` are accepted and ignored, `starts_at=` takes one exact
 * day, and `period=` offers four presets ending at now. Nothing selects
 * "March 2024". The full walk is fourteen pages of 500 against a 6,612-row
 * corpus, which is affordable behind the hour of edge freshness in `server.mjs`
 * and is the only way to compute a monthly series at all.
 *
 * The forum figure is the exception and takes the other route in `thisWeek.ts`'s
 * table: `period` works on `/items/forum/`, the corpus is 62,688 rows and would
 * be 126 pages, and the page needs one number from it rather than a series. So
 * it is API-counted, from one request, with no rows under it to disagree with.
 *
 * WHAT THIS REPORT DELIBERATELY DOES NOT CLAIM
 *
 * B1 names a "dead-DAO index" — treasuries with no proposal in 90 days — as the
 * headline, and that metric is not shipped, because on this data it would be
 * false. 36 of the 51 indexed Snapshot spaces have no proposal in the last
 * quarter, and the reason is Alphaday's coverage rather than the DAOs': the
 * clearest case is Aave, whose Snapshot rows stop on 2 Apr 2025 while
 * `aave_forum` carried five `[ARFC]` threads — the stage that goes to a Snapshot
 * vote — in the week to 28 Sep 2026. Publishing Aave as a dead DAO would be
 * wrong in the one direction a primary source cannot afford.
 *
 * So the dormant spaces are reported as what they are, a coverage figure with a
 * last-indexed date, and every measured number is restricted to the cohort that
 * is demonstrably still being ingested. See `monthlySeries`.
 */

const PAGE_SIZE = 500;

/**
 * A ceiling on a runaway walk, not a budget for the corpus.
 *
 * The walk issues `ceil(total / 500)` requests and no more, so raising this
 * costs nothing until it is reached — fourteen pages cover the 6,612 rows in
 * the corpus on 2 Oct 2026, and sixty leaves room for four times that.
 *
 * **It is set far above need because reaching it now takes the page down.** At
 * twenty it was a trap: `partial` meant "a page did not arrive", a partial read
 * throws, and a corpus of 10,001 rows would have thrown on every request from
 * then on — an outage that, unlike a dropped request, never clears itself and
 * starts serving 500s to readers the moment `stale-if-error` lapses a week
 * later. The next backend item on the list is repairing ingestion for ~25
 * spaces; if those backfill their archives, several thousand rows arrive at
 * once.
 *
 * Reaching it is now a distinct, named failure rather than a `partial` flag —
 * see `CorpusOutgrewWalkError`. The two have nothing in common: one is a
 * transient upstream failure that the next render retries, the other is this
 * file being wrong about the world.
 */
const MAX_PAGES = 60;

/**
 * Pages in flight at once.
 *
 * Thirteen was the whole remainder when the cap was twenty, so the walk was
 * two round trips. With the cap raised, an unbounded `Promise.all` would make a
 * pathological `total` into sixty simultaneous requests at one unauthenticated
 * endpoint. Sixteen keeps today's walk at exactly the same two round trips and
 * bounds the bad case to four.
 */
const PAGE_CONCURRENCY = 16;

/**
 * The corpus grew past what this module will fetch.
 *
 * Its own type because its remedy is its own: a dropped page is retried by the
 * next render and needs nobody, while this needs `MAX_PAGES` raised or the
 * series generated at build time, and will fail identically until someone does
 * it. Anything reading these logs should be able to tell the two apart without
 * reading this file.
 */
export class CorpusOutgrewWalkError extends Error {
  constructor(readonly reported: number) {
    super(
      `governance report: ${reported} proposals need ` +
        `${Math.ceil(reported / PAGE_SIZE)} pages, past the ${MAX_PAGES}-page ` +
        `ceiling. Raise MAX_PAGES, or move the series to a build-time artefact. ` +
        `This will not clear on its own.`
    );
    this.name = "CorpusOutgrewWalkError";
  }
}

/** `period=1` is a trailing week, `2` a month, `3` a quarter. */
const FORUM_PERIOD_QUARTER = 3;

export type { MonthPoint, Proposal, SpaceActivity, Trend };

export interface GovernanceReport {
  /** Spaces with a proposal inside `COHORT_WINDOW_DAYS`, most recent first. */
  cohort: SpaceActivity[];
  /** Everything else, longest-indexed-silence last. A coverage figure. */
  dormant: SpaceActivity[];
  /** Monthly proposal counts across the cohort, oldest first, gaps as zeroes. */
  series: MonthPoint[];
  /** Trailing twelve complete months against the best twelve on record. */
  trend: Trend | null;
  /** Cohort proposals inside the window. */
  recentCount: number;
  /** The newest cohort proposals, newest first, capped at `RECENT_LIMIT`. */
  recent: Proposal[];
  /** Governance forum posts in the same quarter. Null when the feed failed. */
  forumQuarter: number | null;
  /** Proposals all time, after de-duplication, across every space. */
  total: number;
  /**
   * Rows the feed returned, before de-duplication.
   *
   * On the page so the correction can be stated as a live figure rather than a
   * number typed into a sentence that goes stale as the corpus grows — which is
   * the one kind of staleness a page about measurement cannot afford.
   */
  rawTotal: number;
  /** Spaces the API returned rows for at all. */
  spaceCount: number;
  windowDays: number;
  /** A page of proposals failed to fetch, so every count here is a floor. */
  partial: boolean;
  asOf: string;
}

interface ProposalPage {
  total?: number;
  count?: number;
  results?: RawProposal[];
}

const pageUrl = (page: number) =>
  `${API_BASE}/items/dao/?limit=${PAGE_SIZE}&page=${page}`;

export async function buildGovernanceReport(): Promise<GovernanceReport> {
  const asOf = new Date();
  const now = asOf.getTime();

  const rows: RawProposal[] = [];
  let partial = false;

  /*
   * Page one, then the rest at once.
   *
   * Following `links.next` one page at a time is the obvious walk and it made
   * the page take ten seconds against the events calendar's one and a half —
   * fourteen sequential round trips, each waiting on nothing but the last. The
   * page body reports `total`, so after the first response the number of pages
   * is known and none of them depends on another. Two round trips instead of
   * fourteen.
   *
   * The concurrent burst is thirteen unauthenticated reads once an hour behind
   * the edge cache. If the API ever rate-limits in earnest the fix is a
   * generated series rather than a wider burst — `apiFetch`'s clamped
   * `Retry-After` compounds a throttle rather than respecting it.
   */
  const firstPage = await fetchJsonSoft<ProposalPage>(pageUrl(1));
  if (firstPage === null) {
    partial = true;
  } else {
    rows.push(...(firstPage.results ?? []));
  }

  const reported = Number(firstPage?.total ?? firstPage?.count ?? 0);
  const needed = Math.max(Math.ceil(reported / PAGE_SIZE), 1);
  if (needed > MAX_PAGES) throw new CorpusOutgrewWalkError(reported);

  const forumRequest = fetchJsonSoft<{ total?: number; count?: number }>(
    `${API_BASE}/items/forum/?limit=1&period=${FORUM_PERIOD_QUARTER}`
  );

  const rest: Array<ProposalPage | null> = [];
  for (let from = 2; from <= needed; from += PAGE_CONCURRENCY) {
    const batch = Array.from(
      { length: Math.min(PAGE_CONCURRENCY, needed - from + 1) },
      (_, index) => fetchJsonSoft<ProposalPage>(pageUrl(from + index))
    );
    rest.push(...(await Promise.all(batch)));
  }

  for (const body of rest) {
    /*
     * A failed page leaves a hole in the middle of the archive rather than
     * truncating it, so the trend is computed over a gap. `partial` is what
     * stops the page printing a percentage drawn from one.
     */
    if (body === null) {
      partial = true;
      continue;
    }
    rows.push(...(body.results ?? []));
  }

  const proposals = shapeProposals(rows);
  const activity = spaceActivity(proposals, now);
  const cohort = activity.filter(isLive);
  const dormant = activity.filter((space) => !isLive(space));

  const spaces = new Set(cohort.map((space) => space.space));
  const inCohort = proposals.filter((proposal) => spaces.has(proposal.space));
  const series = monthlySeries(proposals, spaces, monthOf(asOf));

  /*
   * The same `isRecent` the per-space counts use, so the sentence above the
   * table and the table's own column cannot disagree. They did: an exact
   * millisecond cutoff here against whole days there put four Aavegotchi
   * proposals on one side of the line and not the other, so the page read "54
   * proposals in the last 90 days" over a column adding to 58.
   */
  const recentAll = inCohort.filter((proposal) => isRecent(proposal.startsAt, now));

  const forum = await forumRequest;

  return {
    cohort,
    dormant,
    series,
    trend: trendOf(series),
    recentCount: recentAll.length,
    recent: recentAll.slice(0, RECENT_LIMIT),
    forumQuarter: forum === null ? null : Number(forum.total ?? forum.count ?? 0),
    total: proposals.length,
    rawTotal: rows.length,
    spaceCount: activity.length,
    windowDays: COHORT_WINDOW_DAYS,
    partial,
    asOf: asOf.toISOString(),
  };
}

/**
 * No validator, because there is nothing to validate: the report takes no
 * argument and reads one fixed collection. `getMonthCalendar` needs one because
 * a month key from the internet goes into five upstream URLs.
 */
export const getGovernanceReport = createServerFn({ method: "GET" }).handler(
  async () => buildGovernanceReport()
);
