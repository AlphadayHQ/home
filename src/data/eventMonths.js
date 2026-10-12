/**
 * Month identity for the events calendar (content doc B4).
 *
 * `/events` is the current month; every other month is `/events/{month}-{year}`,
 * e.g. `/events/october-2026`. Two decisions are baked into that shape.
 *
 * **The month name is spelled out, and the year comes last.** The queries this
 * tier exists for are "crypto conferences october 2026" and its city variants,
 * so the slug matches the phrase a person types. `/events/2026/oct` was the
 * other candidate and loses twice: "oct" matches no query, and a nested year
 * segment implies `/events/2026` exists — a URL that would either 404 inside
 * our own hierarchy or demand a year page nobody searches for.
 *
 * **An event belongs to the month it starts in.** A conference running 28 Sept
 * to 3 Oct appears on September's page and not October's. The alternative —
 * listing it on every month it touches — duplicates rows across pages, which is
 * a near-duplicate-content problem on a tier whose whole purpose is to be
 * indexed separately.
 */

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** `2026-10` → `october-2026`. */
export const monthSlug = (key) => {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]}-${year}`;
};

/**
 * `october-2026` → `2026-10`, or null.
 *
 * Deliberately strict. This parses a URL segment, so anything it accepts
 * becomes a page: a lenient reader would answer 200 for `/events/octobr-2026`
 * and `/events/october-12345`, publishing an unbounded set of near-empty URLs
 * off a typo. Unknown month, non-four-digit year, or anything outside the range
 * the corpus could plausibly hold is a 404.
 */
export const parseMonthSlug = (slug) => {
  if (typeof slug !== "string") return null;
  const match = /^([a-z]+)-(\d{4})$/.exec(slug.toLowerCase());
  if (!match) return null;

  const index = MONTH_NAMES.indexOf(match[1]);
  if (index === -1) return null;

  const year = Number(match[2]);
  if (year < 2020 || year > 2040) return null;

  return `${year}-${String(index + 1).padStart(2, "0")}`;
};

/**
 * Is this a `YYYY-MM` key at all?
 *
 * Separate from `parseMonthSlug` because the two guard different doors.
 * `parseMonthSlug` reads a URL segment a person typed; this checks the internal
 * key a server function is handed, which is reachable without the route — a
 * server function is a public RPC endpoint, and an unchecked string went
 * straight into upstream requests with junk dates in them.
 */
export const isMonthKey = (key) =>
  typeof key === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(key);

/** `2026-10` → `October 2026`. */
export const monthLabel = (key) => {
  const [year, month] = key.split("-");
  const name = MONTH_NAMES[Number(month) - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
};

/** The UTC day bounds a month query needs: `2026-10` → 2026-10-01 … 2026-10-31. */
export function monthBounds(key) {
  const [year, month] = key.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${key}-01`,
    to: `${key}-${String(last).padStart(2, "0")}`,
  };
}

/** The month containing an instant, in UTC. */
export const monthOf = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

/** `2026-10` shifted by `delta` months. */
export function shiftMonth(key, delta) {
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthOf(shifted);
}

/**
 * A month page is indexable only when it is **not in the past** and carries
 * enough events to be worth a crawl.
 *
 * Both halves matter and they fail differently. A past month is an archive: the
 * content is accurate and permanently stale, "crypto conferences august 2026"
 * stops being asked the moment August ends, and §4.3's pruning job would come
 * back for it later — so it is `substrate`, reachable by a reader paging
 * backwards and never submitted. A thin future month is the other failure: of
 * the fifteen months the corpus currently spans, eleven hold between one and
 * twelve events, and promoting those would publish eleven near-empty pages
 * competing with the hub for the same query.
 */
export const MONTH_INDEX_FLOOR = 20;

export function monthIndexState(key, count, currentMonth) {
  if (key < currentMonth) return "substrate";
  return count >= MONTH_INDEX_FLOOR ? "promoted" : "substrate";
}

/**
 * The one count the page headline and the meta description both print.
 *
 * Shared because those two sentences say the same thing in two files, and the
 * rule underneath them has a seam. A month only needs qualifying once part of
 * it has gone: while September is half over, the number that matters is what is
 * left, because that is the list directly below it. A future month, a past
 * month, and a current month nothing has happened in yet are all just
 * themselves, and "0 upcoming" on the 30th is true and useless.
 *
 * **"remaining", not "upcoming".** A third of what is left on a busy day has
 * already started — multi-day conferences running now — so "upcoming" is
 * wrong about the rows underneath it. `thisWeek.ts` states the invariant this
 * protects: a headline count and the rows under it must come from the same
 * data. A word that misdescribes them breaks it just as surely as a number.
 */
export function headline(calendar) {
  const partly =
    !calendar.isPast && calendar.past.length > 0 && calendar.upcoming.length > 0;
  return partly
    ? { count: calendar.upcoming.length, noun: "remaining" }
    : { count: calendar.total, noun: "events" };
}
