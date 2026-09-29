import React from "react";
import { Layout, Section } from "../shared";
import { coveredThrough, eventTypeLabel } from "../data/eventTypes";

/**
 * `/events` — the upcoming crypto calendar (content doc B4).
 *
 * WHY NOTHING HERE IS A LINK
 *
 * The records carry no `url`: verified across every upcoming row, zero have one.
 * So this page can say what is happening, when, where and what kind of thing it
 * is, and it cannot send anyone to a registration page.
 *
 * The temptation is to link the title somewhere anyway — a search URL, a tag
 * page — and that is worse than no link. A title that looks clickable and lands
 * on a search results page is the affordance lying about what it does, and on a
 * calendar it lands the reader further from the event than where they started.
 * Rows are plain text until the field exists upstream.
 *
 * WHY THE WHOLE SET RENDERS
 *
 * This shipped capped at the 150 soonest events, which in conference season is
 * **about one day** — 696 of the 1,063 upcoming events fall in a single month.
 * A page headed "every crypto event worth the flight" that stops at tomorrow is
 * not a calendar, and B4's entire argument is an organiser finding their event
 * listed and linking back. So every upcoming event renders.
 *
 * That makes per-row weight the constraint rather than an afterthought, which
 * is why the row styling lives on the `<ul>` as child selectors instead of
 * repeating ~300 bytes of classes a thousand times, and why there is no icon:
 * an inline SVG per row is the single most expensive element on the page and
 * the location text says the same thing.
 */

const MONTH = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
/** The opening half of a same-month range: "29" in "29 – 30 Sept". */
const DAY_ONLY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  timeZone: "UTC",
});

/**
 * "3 Oct" for a single day, "3 – 5 Oct" for a range.
 *
 * Every date upstream is midnight UTC and 1,845 rows carry an `ends_at`
 * identical to `starts_at`, so printing both unconditionally would put
 * "3 Oct – 3 Oct" on the majority of the calendar.
 */
function dateLabel(startsAt, endsAt) {
  const from = new Date(startsAt);
  const start = DAY.format(from);
  if (!endsAt) return start;

  const to = new Date(endsAt);
  const end = DAY.format(to);
  if (start === end) return start;

  /*
   * Within one month, name the month once: "29 – 30 Sept", not
   * "29 Sept – 30 Sept". The long form wrapped the date column onto a second
   * line often enough to visibly break the rhythm of the list, and the repeat
   * carried no information — the month heading above already states it.
   */
  if (
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth()
  ) {
    return `${DAY_ONLY.format(from)} – ${end}`;
  }
  return `${start} – ${end}`;
}

/**
 * Location and type, joined only when both exist.
 *
 * Most rows now have no type at all — `Co` covers 73% of the calendar and says
 * nothing, so it is unlabelled — which makes a hardcoded "·" separator a dangling
 * character on the majority of rows.
 */
function metaLine(event) {
  const label = eventTypeLabel(event.type);
  return [event.location, label].filter(Boolean).join(" · ");
}

function groupByMonth(events) {
  const groups = new Map();
  for (const event of events) {
    const key = event.startsAt.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()];
}

/*
 * Row styling as child selectors, applied once. `<time>`, `<p>` and `<span>`
 * carry the structure so the selectors stay legible and each row's markup is
 * about sixty bytes rather than three hundred.
 */
const ROW_STYLES = [
  "border-t border-surface-border",
  "[&>li]:flex [&>li]:flex-col [&>li]:gap-1 [&>li]:border-b",
  "[&>li]:border-surface-border [&>li]:py-3.5",
  "sm:[&>li]:flex-row sm:[&>li]:items-baseline sm:[&>li]:gap-6",
  "[&>li>time]:shrink-0 [&>li>time]:font-mono [&>li>time]:text-[13px]",
  "[&>li>time]:tabular-nums [&>li>time]:text-text-muted sm:[&>li>time]:w-32",
  "[&>li>p]:flex-1 [&>li>p]:text-[17px] [&>li>p]:font-semibold",
  "[&>li>p]:leading-snug [&>li>p]:text-text",
  "[&>li>span]:shrink-0 [&>li>span]:text-[13px] [&>li>span]:text-text-muted",
].join(" ");

/**
 * The hero's coverage sentence.
 *
 * The rule itself lives in `eventTypes.js` so it can be tested — its edge case
 * is a date-dependent one that never shows up in a casual look at the page.
 */
function coverage(months) {
  const span = coveredThrough(
    months.map(([key, rows]) => ({ key, count: rows.length }))
  );
  if (!span || !span.through) return null;

  const label = (key) => MONTH.format(new Date(`${key}-01T00:00:00Z`));
  return {
    through: label(span.through),
    tail: span.through === span.last ? null : label(span.last),
  };
}

const EventsPage = ({ calendar }) => {
  const { events, upcomingTotal, truncated, partial, asOf } = calendar;
  const months = groupByMonth(events);
  const span = coverage(months);
  // A dropped page subtracts up to 500 events, so the count is a floor.
  const count = `${upcomingTotal.toLocaleString("en-GB")}${truncated || partial ? "+" : ""}`;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-text-muted">
            Events
          </p>
          <h1 className="max-w-[18ch] font-display text-[clamp(34px,6vw,62px)] font-extrabold leading-[1.02] tracking-tight text-text">
            Every crypto event worth the flight.
          </h1>
          <p className="mt-5 max-w-160 text-[18px] text-text-muted">
            <span className="font-semibold text-text">{count} upcoming</span>{" "}
            conferences, hackathons, meetups and side events
            {span ? ` through ${span.through}` : ""}
            {span?.tail ? `, thinning into ${span.tail}` : ""}. Indexed
            continuously, not hand-maintained.
          </p>
          {/*
            Orange marks actions, and on this page there is exactly one: the
            endpoint behind the calendar. The audience that converts here is
            reading to find out whether they can query this themselves.
          */}
          <p className="mt-5 text-[16px]">
            <a
              href="/api/data/events"
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
            >
              Query this yourself — free, no signup
            </a>
          </p>
          <p className="mt-6 text-[13px] text-text-muted">
            Updated {DAY.format(new Date(asOf))}. Dates are UTC. Listings carry
            no organiser link, because the source records do not have one.
          </p>
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pb-24">
          {months.map(([key, rows]) => (
            <section key={key} className="mt-12 first:mt-6">
              <h2 className="mb-1 font-display text-[26px] font-bold tracking-tight text-text">
                {MONTH.format(new Date(`${key}-01T00:00:00Z`))}
              </h2>
              <p className="mb-2 text-[13px] text-text-muted">
                {rows.length} event{rows.length === 1 ? "" : "s"}
              </p>
              <ul className={ROW_STYLES}>
                {rows.map((event) => (
                  <li key={event.id}>
                    <time dateTime={event.startsAt}>
                      {dateLabel(event.startsAt, event.endsAt)}
                    </time>
                    <p>{event.title}</p>
                    <span>{metaLine(event)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Section>
    </Layout>
  );
};

export default EventsPage;
