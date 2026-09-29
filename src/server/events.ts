import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft } from "./apiFetch";
import { UPCOMING_FLOOR, isListableType } from "../data/eventTypes.js";

/**
 * The upcoming-events calendar behind `/events` (content doc B4).
 *
 * WHY THIS READS THE CORPUS BACKWARDS
 *
 * This is the whole difficulty of B4 and it is not obvious from the endpoint.
 * `/items/events/` returns **oldest-first**, and the corpus starts in 2022, so
 * the events a calendar exists to show are the *last* rows, not the first.
 * Three parameters that would normally fix that do not:
 *
 *  - `?ordering=-starts_at` — silently ignored. Returns the same first page.
 *  - `?offset=6900` — silently ignored. Returns the same first page.
 *  - `?period=` — filters on `published_at`, which events do not carry; it
 *    selects recently *listed* events, including ones in 2028. `thisWeek.ts`
 *    documents the same trap for the digest's events section.
 *
 * None of them errors. A reasonable implementation that trusted any of the
 * three would render a calendar of 2022 conferences and look like it worked,
 * which is why this walks `?page=` from the end instead. `?active=true` is not
 * a shortcut either: it is documented as non-partitioning, and on 29 Sep it
 * returned 28 rows, every one of them already in progress.
 *
 * The walk stops on the *raw* dates — once a page's newest `starts_at` is older
 * than the grace horizon, no earlier page can hold anything current, so this is
 * a complete answer rather than a sampled one. Stopping on what survived
 * filtering instead is the version that looks equivalent and is not; the three
 * ways it fails are written out at the check itself. `MAX_PAGES` bounds a
 * pathological corpus rather than trimming a normal one.
 *
 * Measured 29 Sep: ~1,060 upcoming events across the last three pages, read in
 * five requests — one for the count, then pages 14, 13, 12 and 11, where 11 is
 * the page whose newest start falls behind the horizon and ends the walk.
 */

export const PAGE_SIZE = 500;

/**
 * Six pages total — three of headroom over the three the upcoming set currently
 * occupies. Past this the count under-reports rather than the page breaking, and
 * `truncated` is surfaced in the copy as a "+" on the count, so the number never
 * quietly goes wrong.
 */
const MAX_PAGES = 6;

const DAY_MS = 86_400_000;

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO 8601, from `starts_at`. */
  startsAt: string;
  /** ISO 8601, from `ends_at`. Always present on the measured corpus. */
  endsAt: string | null;
  /** Free text: "Lisbon, Portugal 🇵🇹". Absent on ~1% of rows. */
  location: string | null;
  /** Raw `item_type` code; label it through `eventTypeLabel`. */
  type: string;
}

export interface EventsCalendar {
  events: CalendarEvent[];
  /** Upcoming events after de-duplication. Every one of them renders. */
  upcomingTotal: number;
  /** Every row the API reports, upcoming or not. Context, never a claim. */
  corpusTotal: number;
  /** The walk hit `MAX_PAGES` with rows still to read. */
  truncated: boolean;
  /**
   * At least one page failed to fetch and was walked past.
   *
   * Separate from `truncated` because the causes differ, and reported for the
   * same reason `thisWeek.ts` distinguishes an empty result from a failed
   * request: a dropped page silently subtracts up to 500 events, and without
   * this the page would print "564 upcoming" as though it were exact, stay
   * indexed, and give no sign anything was missing.
   */
  partial: boolean;
  /** Below `UPCOMING_FLOOR`: the page must not claim to be a calendar. */
  thin: boolean;
  asOf: string;
}

export interface RawEvent {
  id?: unknown;
  title?: unknown;
  item_type?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  location?: unknown;
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * How long after its start an event still counts as current.
 *
 * "Has not finished" on its own is not the right rule, because a handful of rows
 * carry implausible ranges — measured 29 Sep, 9 of 1,057 upcoming events run
 * longer than 14 days and the worst is 125. Those sort to the top of the
 * calendar under a month that has already passed, so the first thing a reader
 * sees is a stale row. The grace period is what stops that.
 *
 * Deliberately generous relative to the problem: the median event lasts 0 days
 * and p90 is 2, so a week of slack drops exactly the **2** rows that started
 * more than a week ago while keeping all 26 genuinely in-progress multi-day
 * conferences — the single most useful kind of row on a calendar, and the one a
 * naive `starts_at > now` filter removes.
 */
export const STARTED_GRACE_DAYS = 7;

/**
 * **Every date on this endpoint is midnight UTC** — verified across 2,427 dated
 * rows on 29 Sep, 100% of them `T00:00:00Z`, with 1,845 carrying `ends_at`
 * identical to `starts_at`.
 *
 * That makes the obvious comparison wrong in a way that is invisible in code and
 * glaring on the page. `ends_at >= now` drops a one-day event at 00:00 UTC *on
 * the morning it happens*, and takes the final day of every multi-day conference
 * with it. Measured at 07:34 UTC: 72 of the 93 events happening that day were
 * already gone, "Ethereum Korea One: Genesis" among them, during KBW week.
 *
 * A date with no time means the whole day, so the event ends when that day does.
 */
const endOfDay = (iso: string): number => {
  const at = new Date(iso).getTime();
  return Number.isFinite(at) ? at + DAY_MS : Number.NaN;
};

/**
 * Upcoming means "running or still to come", not "has not started".
 *
 * Two conditions, both load-bearing: it must not have ended — counting the whole
 * of its final day, see `endOfDay` — and it must not have started longer ago
 * than `STARTED_GRACE_DAYS`, which carries the reasoning for that bound.
 */
export function isUpcoming(row: RawEvent, now: number): boolean {
  const starts = asString(row.starts_at);
  if (!starts) return false;

  const startedAt = new Date(starts).getTime();
  if (!Number.isFinite(startedAt)) return false;
  if (now - startedAt > STARTED_GRACE_DAYS * DAY_MS) return false;

  const endsAt = endOfDay(asString(row.ends_at) ?? starts);
  return Number.isFinite(endsAt) && endsAt >= now;
}

export function shape(row: RawEvent): CalendarEvent | null {
  const title = asString(row.title);
  const startsAt = asString(row.starts_at);
  const ends = asString(row.ends_at);
  const type = asString(row.item_type);
  if (!title || !startsAt || !type || !isListableType(type)) return null;
  if (!Number.isFinite(new Date(startsAt).getTime())) return null;

  return {
    id: String(row.id ?? `${startsAt}-${title.slice(0, 24)}`),
    title,
    startsAt,
    /*
     * Dropped when it repeats the start, which it does on 1,845 of 2,427 dated
     * rows. The whole loader payload is serialised into the page for hydration,
     * so a field that says nothing on two-thirds of a thousand-row calendar is
     * worth its own line of code to omit. Everything downstream already treats a
     * missing end as "the same day": `dateLabel` prints one date and the graph
     * omits `endDate`.
     */
    endsAt: ends && ends !== startsAt ? ends : null,
    location: asString(row.location),
    type,
  };
}

const page = (n: number) =>
  `${API_BASE}/items/events/?limit=${PAGE_SIZE}&page=${n}`;

/**
 * The calendar itself, as a plain function.
 *
 * Split from the server-function wrapper below so it can be tested. A
 * `createServerFn` handler cannot be called directly — it looks for the Start
 * runtime's AsyncLocalStorage and throws outside it — so leaving the logic
 * inside the wrapper would make the pagination walk, the one part of this module
 * that is genuinely easy to get wrong, the one part no test could reach.
 * `thisWeek.ts` is tested the same way.
 */
export async function buildCalendar(): Promise<EventsCalendar> {
  const asOf = new Date();
  const now = asOf.getTime();

  /*
   * One cheap call for the row count, so the walk knows where the end is.
   * `page` is expressed in units of `limit`, so the count request and the
   * page requests have to agree on nothing except the total itself.
   */
  const head = await fetchJsonSoft<{ total?: number; count?: number }>(
    `${API_BASE}/items/events/?limit=1`
  );
  const corpusTotal = Number(head?.total ?? head?.count ?? 0);
  if (!corpusTotal) {
    return {
      events: [],
      upcomingTotal: 0,
      corpusTotal: 0,
      truncated: false,
      partial: head === null,
      thin: true,
      asOf: asOf.toISOString(),
    };
  }

  const lastPage = Math.max(1, Math.ceil(corpusTotal / PAGE_SIZE));
  const horizon = now - STARTED_GRACE_DAYS * DAY_MS;
  const collected: CalendarEvent[] = [];
  let walked = 0;
  let exhausted = false;
  let partial = false;
  let stoppedAt = lastPage;

  for (let n = lastPage; n >= 1 && walked < MAX_PAGES; n -= 1, walked += 1) {
    stoppedAt = n;
    const body = await fetchJsonSoft<{ results?: RawEvent[] }>(page(n));
    // `fetchJsonSoft` degrades a failed request to null after its retries. The
    // walk continues — a gap is better than a truncated calendar — but the
    // count it produces is a floor from here on, not a total.
    if (body === null) partial = true;
    const rows = body?.results ?? [];

    for (const row of rows) {
      if (!isUpcoming(row, now)) continue;
      const event = shape(row);
      if (event) collected.push(event);
    }

    /*
     * **Stop on the raw dates, never on what survived filtering.**
     *
     * The rows are ascending by `starts_at`, so once a page's newest start is
     * behind the grace horizon, no earlier page can hold anything current and
     * the walk is complete. Deriving that from the *shaped* result instead —
     * "this page produced no events, so stop" — is the version that looks
     * equivalent and is not, in three measured ways:
     *
     *  - **Dense weeks.** A page can hold 500 rows spanning seven days. If all
     *    of them started inside the grace window and have already ended, the
     *    page yields nothing while multi-day events on the page *before* it are
     *    still running. Sorted by start, not by end, so the tail is not sorted.
     *  - **Undated rows.** 7 rows carry no `starts_at` and sort last. A page of
     *    those would stop the walk on its first request and mark the calendar
     *    thin, taking the page `noindex`.
     *  - **Filtered rows.** 44 rows are `***` placeholders. A page of those
     *    survives `isUpcoming` and dies in `shape`, which the old check read as
     *    "nothing upcoming".
     *
     * A page with no parseable dates at all yields no maximum, and the walk
     * continues rather than stopping — the undated tail cannot end it.
     */
    let newestStart = Number.NEGATIVE_INFINITY;
    for (const row of rows) {
      const starts = asString(row.starts_at);
      if (!starts) continue;
      const at = new Date(starts).getTime();
      if (Number.isFinite(at) && at > newestStart) newestStart = at;
    }

    if (Number.isFinite(newestStart) && newestStart < horizon) {
      exhausted = true;
      break;
    }
  }

  collected.sort((a, b) =>
    a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0
  );

  /*
   * The upstream corpus repeats events: 58 upcoming title-and-start pairs
   * appear twice under different ids, measured 29 Sep, and some pairs disagree
   * about `item_type` (the same Miami event filed once as `Co` and once as
   * `PY`). Left alone they render twice, count twice, and appear twice in the
   * structured data — where duplicate `Event` entries in one `ItemList` are a
   * quality problem, not just a cosmetic one.
   *
   * Keyed on title + start + location rather than id, because the id is exactly
   * what differs. The surviving copy is simply whichever the API returned first
   * — not "the earliest-starting" one, since the start date is part of the key
   * and every copy therefore shares it.
   */
  const seen = new Set<string>();
  const events = collected.filter((event) => {
    const key = `${event.title}|${event.startsAt}|${event.location ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    events,
    upcomingTotal: events.length,
    corpusTotal,
    /*
     * Only true when the cap stopped a walk that had more to read. Reaching
     * page 1 is a complete answer even at `MAX_PAGES`, which the previous
     * condition reported as truncated.
     */
    truncated: !exhausted && stoppedAt > 1,
    partial,
    thin: events.length < UPCOMING_FLOOR,
    asOf: asOf.toISOString(),
  };
}

export const getEventsCalendar = createServerFn({ method: "GET" }).handler(
  buildCalendar
);
