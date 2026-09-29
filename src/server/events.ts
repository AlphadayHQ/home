import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft } from "./apiFetch";
import type { CalendarEvent, RawEvent } from "../data/eventRows";
import { shapeRows, splitByTime } from "../data/eventRows";
import { isMonthKey, monthBounds, monthOf, shiftMonth } from "../data/eventMonths.js";

/**
 * One month of the events calendar (content doc B4).
 *
 * WHAT THIS REPLACED, AND WHY IT IS WORTH SAYING
 *
 * The first version of this file walked `?page=` backwards from the end of a
 * 6,900-row corpus, because `/items/events/` returns oldest-first and
 * `?ordering=`, `?offset=` and `?period=` are all silently ignored. That walk
 * was correct and elaborate, and it was unnecessary: the endpoint also accepts
 * **`starts_at__gte` and `starts_at__lte`**, which filter precisely and page
 * normally. Verified 29 Sep — October returns 734 rows, all of them October,
 * across two pages.
 *
 * The lesson is narrower than "read the docs". The parameters that failed are
 * *documented*, and one of them is documented wrongly: `period_after` reads as
 * "Event starts on or after" and actually matches any event whose range
 * overlaps the window, so `period_after=2026-10-01` returns events starting in
 * September. The working pair is undocumented in prose and discoverable only in
 * the parameter list. Nothing here is safe to assume from a description; the
 * probe that produced these numbers is what the code rests on.
 */

const PAGE_SIZE = 500;

/**
 * Pages per month. October — the densest month in the corpus by a wide margin,
 * at 734 rows — needs two. Six is room for a month four times that size, after
 * which `partial` reports the shortfall rather than the count quietly going
 * wrong.
 */
const MAX_PAGES = 6;

export type { CalendarEvent, RawEvent };

export interface MonthNeighbour {
  month: string;
  count: number;
}

export interface MonthCalendar {
  /** `2026-10`. */
  month: string;
  /**
   * Still to come or running, in date order. Everything on a future month.
   *
   * Split from `past` because the current month is the one page where both
   * exist, and it is the page most people land on. Rendering the month in flat
   * date order put four weeks of finished events above anything current, which
   * on the 29th of a month is most of the page.
   */
  upcoming: CalendarEvent[];
  /** Already finished, in date order. Empty on a future month. */
  past: CalendarEvent[];
  /** Events this month, after de-duplication: `upcoming + past`. */
  total: number;
  /** Adjacent months that actually hold events; null when there is nothing there. */
  prev: MonthNeighbour | null;
  next: MonthNeighbour | null;
  /**
   * A page of *this month's* rows failed to fetch, so `total` is a floor.
   *
   * Deliberately not set by a failed neighbour count. The two are different
   * failures with different remedies: a dropped page of rows means the number
   * beside the month is short and has to be printed as "734+", whereas a failed
   * neighbour count costs nothing but a navigation link, which simply does not
   * render. Folding them together made a page whose own rows were complete
   * print an approximation.
   */
  partial: boolean;
  /** The month is in the past relative to the request. */
  isPast: boolean;
  asOf: string;
}

const monthQuery = (month: string) => {
  const { from, to } = monthBounds(month);
  return `starts_at__gte=${from}&starts_at__lte=${to}`;
};

/** One row, fetched only for its `total`. */
async function countOf(query: string): Promise<number | null> {
  const body = await fetchJsonSoft<{ total?: number; count?: number }>(
    `${API_BASE}/items/events/?limit=1&${query}`
  );
  if (body === null) return null;
  return Number(body.total ?? body.count ?? 0);
}

export async function buildMonth(month: string): Promise<MonthCalendar> {
  const asOf = new Date();
  const currentMonth = monthOf(asOf);
  const query = monthQuery(month);

  const rows: RawEvent[] = [];
  let partial = false;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<{ results?: RawEvent[]; links?: { next?: string } }>(
      `${API_BASE}/items/events/?limit=${PAGE_SIZE}&page=${page}&${query}`
    );
    // A failed page leaves a gap rather than truncating the month; the count is
    // then a floor, and `partial` is what stops the page printing it as exact.
    if (body === null) {
      partial = true;
      continue;
    }

    const page_rows = body.results ?? [];
    rows.push(...page_rows);

    if (page_rows.length < PAGE_SIZE || !body.links?.next) break;
    if (page === MAX_PAGES) partial = true;
  }

  const events = shapeRows(rows);
  const { upcoming, past } = splitByTime(events, asOf.getTime());

  /*
   * Neighbours are fetched for their counts alone, so a month with nothing in
   * it is never linked. Paging into an empty month is the most obvious way for
   * this navigation to feel broken, and the corpus has real gaps — July 2027
   * holds two events and August holds one.
   */
  const [prevCount, nextCount] = await Promise.all([
    countOf(monthQuery(shiftMonth(month, -1))),
    countOf(monthQuery(shiftMonth(month, 1))),
  ]);

  const neighbour = (delta: number, count: number | null): MonthNeighbour | null =>
    count && count > 0 ? { month: shiftMonth(month, delta), count } : null;

  return {
    month,
    upcoming,
    past,
    total: events.length,
    prev: neighbour(-1, prevCount),
    next: neighbour(1, nextCount),
    partial,
    isPast: month < currentMonth,
    asOf: asOf.toISOString(),
  };
}

/**
 * The validator is a boundary, not a formality.
 *
 * A server function is a public RPC endpoint — anything on the internet can
 * call it with anything. The route already refuses a bad slug through
 * `parseMonthSlug`, but that check guards the *route*, and this is reachable
 * without it. An unchecked string went straight into five upstream requests
 * with junk dates in them.
 */
export const getMonthCalendar = createServerFn({ method: "GET" })
  .validator((month: string) => {
    if (!isMonthKey(month)) {
      throw new Error(`getMonthCalendar: ${String(month)} is not a YYYY-MM month`);
    }
    return month;
  })
  .handler(async ({ data: month }) => buildMonth(month));

/** The month `/events` shows. */
export const getCurrentMonth = createServerFn({ method: "GET" }).handler(
  async () => buildMonth(monthOf(new Date()))
);
