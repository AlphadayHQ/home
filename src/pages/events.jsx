import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { eventTypeLabel } from "../data/eventTypes";
import { headline, monthLabel, monthSlug } from "../data/eventMonths";

/**
 * A month of the events calendar (content doc B4).
 *
 * WHY NOTHING IN A ROW IS A LINK
 *
 * The records carry no `url` — verified across every upcoming row, zero have
 * one. So this page can say what is happening, when, where and what kind of
 * thing it is, and it cannot send anyone to a registration page.
 *
 * The temptation is to link the title somewhere anyway — a search URL, a tag
 * page — and that is worse than no link. A title that looks clickable and lands
 * on search results is the affordance lying about what it does, and on a
 * calendar it leaves the reader further from the event than where they started.
 * Rows stay plain text until the field exists upstream.
 *
 * WHY THE PAGE IS ONE MONTH
 *
 * It used to render every upcoming event: 1,064 rows, 421 KB, and a month index
 * was the only way to find anything. One month is the unit people plan in, it
 * is the unit the queries are phrased in ("crypto conferences october 2026"),
 * and it makes each page separately measurable in Search Console — which §4.4
 * asks for and a single endless page cannot give.
 */

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
 * "3 Oct" for a single day, "29 – 30 Sept" within one month, "26 Sept – 3 Oct"
 * across two.
 *
 * Every date upstream is midnight UTC and most rows carry an `ends_at` equal to
 * `starts_at`, so printing both unconditionally would put "3 Oct – 3 Oct" on the
 * majority of the calendar. Naming the month twice inside one month wrapped the
 * date column onto a second line and said nothing the heading had not.
 */
function dateLabel(startsAt, endsAt) {
  const from = new Date(startsAt);
  const start = DAY.format(from);
  if (!endsAt) return start;

  const to = new Date(endsAt);
  const end = DAY.format(to);
  if (start === end) return start;

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
 * Most rows carry no type — `Co` covers 73% of the corpus and says nothing, so
 * it is unlabelled — which makes a hardcoded separator a dangling character on
 * the majority of rows.
 */
function metaLine(event) {
  const label = eventTypeLabel(event.type);
  return [event.location, label].filter(Boolean).join(" · ");
}

/**
 * Below this many rows still to come, the hub says where to go next in its own
 * copy instead of leaving it to an arrow in the month nav.
 *
 * The front door shows the current month, so in the last days of one it can
 * legitimately hold three events while the next holds seven hundred. Rolling
 * the hub forward into that month was the other option and it is worse: those
 * rows already have a URL that should rank for them, and putting them here too
 * undercuts it. A sentence pointing forward costs nothing and duplicates
 * nothing.
 */
const THIN_TAIL = 20;

/** `/events` for the current month, `/events/october-2026` for any other. */
export const monthHref = (month, currentMonth) =>
  month === currentMonth ? "/events" : `/events/${monthSlug(month)}`;

/*
 * Row styling as child selectors, applied once. `<time>`, `<p>` and `<span>`
 * carry the structure so each row's markup is about sixty bytes rather than
 * three hundred — which matters at several hundred rows a month.
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
 * Where a reader goes after the calendar.
 *
 * Placed at the end, not scattered through the list. Someone who has read a
 * month of rows has shown more intent than anyone who saw a mid-page banner,
 * and interrupting a reference table with product cards is the over-designed
 * marketing the brief rejects outright.
 *
 * **None of these is orange.** Principle 3 spends the accent on actions, and
 * spending it three more times would make the one real conversion target — the
 * endpoint link in the hero — worth a quarter of what it is now.
 */
const NEXT_STEPS = [
  {
    href: `${CONFIG.api}/data/events`,
    name: "Events API",
    why: "The endpoint this page is built from — filter by type, city or window.",
  },
  {
    href: CONFIG.dashboards,
    name: "Dashboards",
    why: "The projects you will meet at these events, tracked live.",
  },
  {
    href: CONFIG.recipes,
    name: "Recipes",
    why: "Wire the calendar into a bot, a newsletter or your own agent.",
    external: true,
  },
];

/**
 * Month-to-month navigation.
 *
 * **No counts beside the month names, deliberately.** The neighbour figures are
 * the API's raw totals, while the page each link leads to shows the count after
 * placeholders are dropped and duplicates collapsed — 771 against 734 for
 * September. `thisWeek.ts` states the invariant this would break: a headline
 * count and the rows under it must come from the same data. Making the numbers
 * agree means fetching each neighbour in full to display a figure nobody needs
 * to navigate, so the number goes instead.
 *
 * The counts are still fetched, because they decide whether a month is linked
 * at all. Paging into an empty month is the most obvious way for this to feel
 * broken, and the corpus has real gaps — July 2027 holds two events, August
 * holds one.
 */
const MonthNav = ({ calendar, currentMonth, className = "" }) => {
  const { prev, next } = calendar;
  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Calendar months"
      className={`flex flex-wrap items-center justify-between gap-4 ${className}`}
    >
      {prev ? (
        <a
          href={monthHref(prev.month, currentMonth)}
          rel="prev"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-text transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          {monthLabel(prev.month)}
        </a>
      ) : (
        <span />
      )}

      {next && (
        <a
          href={monthHref(next.month, currentMonth)}
          rel="next"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-text transition-colors hover:text-primary"
        >
          {monthLabel(next.month)}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
      )}
    </nav>
  );
};

const SectionHead = ({ children, className = "" }) => (
  <h2
    className={`mb-4 font-display text-[22px] font-bold tracking-tight text-text ${className}`}
  >
    {children}
  </h2>
);

/**
 * One chronological list of rows.
 *
 * Extracted because the current month renders two of them — what is still to
 * come, then what has already happened — and the markup is identical.
 */
const EventList = ({ events, className = "" }) => (
  <ul className={`${ROW_STYLES} ${className}`}>
    {events.map((event) => (
      <li key={event.id}>
        <time dateTime={event.startsAt}>
          {dateLabel(event.startsAt, event.endsAt)}
        </time>
        <p>{event.title}</p>
        <span>{metaLine(event)}</span>
      </li>
    ))}
  </ul>
);

const EventsPage = ({ calendar, currentMonth, isHub }) => {
  const { month, upcoming, past, total, next, partial, isPast, asOf } = calendar;
  const label = monthLabel(month);
  const { count, noun } = headline(calendar);
  const headlineCount = `${count.toLocaleString("en-GB")}${partial ? "+" : ""}`;

  /*
   * Only the current month holds both halves, and it is the page most people
   * land on. Rendering the month in flat date order put four weeks of finished
   * events above anything current — on the 29th, most of the page. Headings
   * appear only when there is something to separate: a past month and a future
   * month are each one list, and labelling a single list is noise.
   */
  const running = upcoming.filter((event) => event.running);
  const ahead = upcoming.filter((event) => !event.running);

  /*
   * Headings appear only where there is something to separate. A future month
   * is one list of things that have not started and a past month is one list of
   * things that have finished; labelling a single list is noise.
   */
  const groups = [running.length, ahead.length, past.length].filter(Boolean);
  const labelled = groups.length > 1;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-text-muted">
            Events
          </p>

          {/*
            The hub keeps the brand line; a month page leads with the month,
            because that is the phrase its queries are built from and the first
            thing a reader arriving on it needs confirmed.
          */}
          <h1 className="max-w-[18ch] font-display text-[clamp(34px,6vw,62px)] font-extrabold leading-[1.02] tracking-tight text-text">
            {isHub ? "Every crypto event worth the flight." : `Crypto events in ${label}.`}
          </h1>

          <p className="mt-5 max-w-160 text-[18px] text-text-muted">
            <span className="font-semibold text-text">
              {headlineCount} {noun} in {label}
            </span>{" "}
            — conferences, hackathons, meetups and side events. Indexed
            continuously, not hand-maintained.
            {!isPast && next && upcoming.length < THIN_TAIL && (
              <>
                {upcoming.length === 0 && ` ${label} is over.`} Next:{" "}
                <a
                  href={monthHref(next.month, currentMonth)}
                  rel="next"
                  className="font-semibold text-text underline decoration-surface-border underline-offset-4 transition-colors hover:decoration-text"
                >
                  {monthLabel(next.month)}
                </a>
                .
              </>
            )}
          </p>

          <p className="mt-5 text-[16px]">
            <a
              href={`${CONFIG.api}/data/events`}
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

      {/*
        `pt-6` here rather than a margin on the list, and that is a bug fix
        rather than a preference. A margin on the first child collapsed out of
        this section — the parent has no padding to contain it — leaving a 24px
        band that painted no background. `Layout` positions page content
        absolutely over the footer, so what showed through the band was the
        footer's own border and copyright rule, read as a stray divider.
      */}
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-16">
          <MonthNav
            calendar={calendar}
            currentMonth={currentMonth}
            className="mb-8"
          />

          {total === 0 ? (
            <p className="py-10 text-[17px] text-text-muted">
              Nothing indexed for {label} yet.
            </p>
          ) : (
            <>
              {/*
                Running events are their own group, not the top of "Still to
                come". The upcoming half sorts by start date, so a conference
                running since the 1st sits above today's rows carrying a date
                three weeks old — under that heading every one of those rows
                contradicted it. A marker on each row was the first attempt and
                it was the wrong fix: nine rows in a row saying "Now" under
                "Still to come" is an argument with itself. The heading is what
                should have been accurate.
              */}
              {running.length > 0 && (
                <>
                  {labelled && <SectionHead>Happening now</SectionHead>}
                  <EventList events={running} />
                </>
              )}

              {ahead.length > 0 && (
                <>
                  {labelled && (
                    <SectionHead className={running.length > 0 ? "mt-12" : ""}>
                      Still to come
                    </SectionHead>
                  )}
                  <EventList events={ahead} />
                </>
              )}

              {/*
                Collapsed, not dropped. The month's finished events are what
                makes this page a record of the month rather than a snapshot,
                and they stay in the HTML either way — but on the 29th they are
                four weeks of rows standing between the reader and the three
                that matter.
              */}
              {past.length > 0 &&
                (labelled ? (
                  <details className="mt-12">
                    <summary className="cursor-pointer text-[15px] font-semibold text-text-muted transition-colors hover:text-text">
                      Earlier in {label} ({past.length.toLocaleString("en-GB")})
                    </summary>
                    <EventList events={past} className="mt-5 opacity-70" />
                  </details>
                ) : (
                  <EventList events={past} />
                ))}
            </>
          )}

          <MonthNav
            calendar={calendar}
            currentMonth={currentMonth}
            className="mt-10"
          />
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-24">
          <h2 className="font-display text-[26px] font-bold tracking-tight text-text">
            Same data, other shapes
          </h2>
          <ul className="mt-5 flex flex-col gap-4">
            {NEXT_STEPS.map((step) => (
              <li key={step.href} className="max-w-160">
                <a
                  href={step.href}
                  {...(step.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="text-[17px] font-semibold text-text underline decoration-surface-border underline-offset-4 transition-colors hover:decoration-text"
                >
                  {step.name}
                </a>
                <p className="mt-1 text-[15px] text-text-muted">{step.why}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </Layout>
  );
};

export default EventsPage;
