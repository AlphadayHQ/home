import { isListableType } from "./eventTypes.js";

/**
 * Turning raw `/items/events/` rows into calendar rows (content doc B4).
 *
 * **Why this is its own module rather than part of `server/events.ts`.** The
 * sitemap generator has to decide whether a month clears `MONTH_INDEX_FLOOR`,
 * and it was deciding it on the API's raw `total` while the route decided it on
 * the shaped, de-duplicated count. A month holding 21 raw rows and 19 real ones
 * was therefore submitted in the sitemap and served `noindex` — the precise
 * drift `indexState.ts` exists to prevent, arrived at from the other side.
 *
 * `scripts/build-sitemap.mjs` cannot import `server/events.ts`, which pulls in
 * `@tanstack/react-start`. It can import this: no framework, no fetching, no
 * side effects. One definition of what a row is, read by both.
 */

const DAY_MS = 86_400_000;

export interface RawEvent {
  id?: unknown;
  title?: unknown;
  item_type?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  location?: unknown;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO 8601, from `starts_at`. */
  startsAt: string;
  /** ISO 8601. Dropped when it merely repeats the start, as it does on most rows. */
  endsAt: string | null;
  /** Free text: "Lisbon, Portugal 🇵🇹". Absent on ~1% of rows. */
  location: string | null;
  /** Raw `item_type` code; label it through `eventTypeLabel`. */
  type: string;
  /**
   * Started and not yet finished, as of the render.
   *
   * Set only when true, so it costs nothing on the overwhelming majority of
   * rows. It exists because "still to come" and "already over" are not the
   * whole story on the current month: a handful of multi-day conferences are
   * mid-run, they sort by start date so they sit at the top of what is left,
   * and each carries a date weeks old. Those are the rows that read as stale
   * under "still to come", and they get their own group instead.
   *
   * Today's rows are deliberately **not** in it — see `startedEarlier`.
   */
  running?: true;
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function shape(row: RawEvent): CalendarEvent | null {
  const title = asString(row.title);
  const startsAt = asString(row.starts_at);
  const type = asString(row.item_type);
  const ends = asString(row.ends_at);
  if (!title || !startsAt || !type || !isListableType(type)) return null;
  if (!Number.isFinite(new Date(startsAt).getTime())) return null;

  return {
    id: String(row.id ?? `${startsAt}-${title.slice(0, 24)}`),
    title,
    startsAt,
    /*
     * Dropped when it repeats the start, which it does on roughly two-thirds of
     * rows. The loader payload is serialised into the page for hydration, so a
     * field that says nothing on most of a long calendar is worth omitting.
     * Everything downstream already reads a missing end as "the same day".
     */
    endsAt: ends && ends !== startsAt ? ends : null,
    location: asString(row.location),
    type,
  };
}

/**
 * The upstream corpus repeats events under different ids — 58 duplicated
 * title-and-start pairs across the upcoming set on 29 Sep, some disagreeing
 * about `item_type`. Keyed on title + start + location because the id is
 * precisely what differs.
 */
export function dedupe(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.title}|${event.startsAt}|${event.location ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Raw rows in, the rows a page would actually render out, in date order. */
export function shapeRows(rows: RawEvent[]): CalendarEvent[] {
  const shaped: CalendarEvent[] = [];
  for (const row of rows) {
    const event = shape(row);
    if (event) shaped.push(event);
  }
  shaped.sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0));
  return dedupe(shaped);
}

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
 * Has it finished, counting the whole of its final day.
 *
 * **No elapsed-time grace period, and that is a change.** The previous version
 * also dropped anything that started more than seven days ago, because a
 * handful of rows carry implausible ranges — 9 of 1,057 run longer than a
 * fortnight, the worst 125 days — and on one endless list those sorted to the
 * top under a month that had already passed.
 *
 * A month page removes that failure by construction: an event belongs to the
 * month it starts in and sorts on its start date inside it, so a long run sits
 * on its own date with its range printed beside it. What the grace period would
 * do here is print "earlier this month" against a conference that is running
 * today, which is the worse error of the two — it is wrong about the thing the
 * reader is standing in front of.
 */
export const hasEnded = (event: CalendarEvent, now: number): boolean => {
  const ends = endOfDay(event.endsAt ?? event.startsAt);
  return Number.isFinite(ends) ? ends < now : false;
};

/**
 * Began on an **earlier day** and has not ended.
 *
 * Not "has started": every date here is midnight UTC with no time of day, so
 * by 09:00 UTC that rule calls a 5pm meetup in Miami under way. It is the
 * wrong side of the line to be wrong on — the page puts these rows under a
 * heading that says they are happening, and most of today's have not begun.
 *
 * A previous day is a claim the data actually supports: whatever hour it
 * started at, it started, and its end date has not passed.
 */
const startedEarlier = (event: CalendarEvent, now: number): boolean => {
  const startsAt = new Date(event.startsAt).getTime();
  if (!Number.isFinite(startsAt)) return false;
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  return startsAt < today;
};

/**
 * Still to come (or running) against already finished.
 *
 * Order is preserved inside each half, so both lists stay chronological.
 */
export function splitByTime(
  events: CalendarEvent[],
  now: number
): { upcoming: CalendarEvent[]; past: CalendarEvent[] } {
  const upcoming: CalendarEvent[] = [];
  const past: CalendarEvent[] = [];
  for (const event of events) {
    if (hasEnded(event, now)) {
      past.push(event);
      continue;
    }
    upcoming.push(startedEarlier(event, now) ? { ...event, running: true } : event);
  }
  return { upcoming, past };
}
