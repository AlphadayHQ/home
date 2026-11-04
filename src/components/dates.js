/**
 * Dates as the post pages print them, in UTC: "21 October 2026" in prose and
 * facts, "21 Oct 2026" in lists and meta lines.
 *
 * Each takes an ISO string or a `Date` and answers null for anything that is not
 * a date, because the dates on these pages come from agent-written metadata and
 * `Intl` throws a RangeError on an invalid one. A caller formats once, keeps the
 * result, and leaves out whatever would print it when it is null, so a bad date
 * drops a line or a phrase rather than printing "null" or failing the page.
 */

const LONG = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const toDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const format = (formatter, value) => {
  const date = toDate(value);
  return date ? formatter.format(date) : null;
};

/** "21 October 2026", or null. */
export const longDate = (value) => format(LONG, value);

/** "21 Oct 2026", or null. */
export const shortDate = (value) => format(SHORT, value);

/**
 * Two days as one range, saying the month and year once where they are shared:
 * "27–30 October 2026", "27 October – 3 November 2026". Null unless both are
 * dates; one day when they are the same.
 */
export const dateRange = (from, to) => {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return null;
  if (LONG.format(a) === LONG.format(b)) return LONG.format(a);
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  if (sameYear && a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${LONG.format(b)}`;
  return `${sameYear ? DAY_MONTH.format(a) : LONG.format(a)} – ${LONG.format(b)}`;
};
