import React from "react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { monthLabel } from "../data/eventMonths";
import { COHORT_WINDOW_DAYS } from "../data/governance";
import { headlineOf } from "../seo/governanceHead";

/**
 * The DAO governance report (content doc B1).
 *
 * WHY THE METHOD IS ON THE PAGE
 *
 * B1's argument for this asset is that a recurring primary source becomes the
 * citation by default — delegates, governance researchers and DL News all need
 * participation numbers and there is no standard one. That only works if the
 * numbers survive being checked, and the first thing a researcher checks is the
 * denominator. So the cohort rule, the de-duplication rule and the coverage gap
 * are on the page in plain language rather than in a footnote, and the largest
 * gap is named with the evidence against it.
 *
 * Publishing the gap is not modesty, it is the difference between a measurement
 * and a press release. A page claiming 36 dead DAOs gets one round of links and
 * then a correction; a page saying "36 spaces are not currently ingested here,
 * Aave among them, and here is how we know" is the thing people cite for years.
 *
 * WHY EVERY ROW IS A LINK, UNLIKE THE EVENTS CALENDAR
 *
 * Every proposal carries a `snapshot.org` URL — verified across all 6,612 rows.
 * The events calendar has no organiser link on any record and so prints plain
 * text; here the link is the citation, and sending a reader to the vote itself
 * is most of what makes the page worth referencing.
 */

/** "April 2025" — a dormant space's last proposal, where the day says nothing. */
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DAY_SHORT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const n = (value) => value.toLocaleString("en-GB");

/**
 * Months drawn in the chart, as a floor rather than a fixed span.
 *
 * Three years is the shortest window that shows two of the twelve-month
 * comparisons the page reports, and beyond it the bars thin out at phone width.
 * But the chart must also reach the window the headline is measured against:
 * with a 36-month slice ending in September 2026 the peak year sat three bars
 * inside the left edge, so the page said "down 66% on the busiest twelve
 * months" over a figure that showed a quarter of them.
 */
const CHART_MONTHS = 36;

/**
 * A bar per month, as one inline SVG.
 *
 * **No charting library.** The whole figure is roughly forty elements of static
 * geometry; a 90 KB dependency to draw rectangles is the opposite of what a
 * page about honest measurement should ship, and every library needs a runtime
 * fetch or a CDN the CSP would have to admit.
 *
 * **The bars are not orange.** Principle 3 spends the accent on actions, and a
 * chart is the largest surface on the page — painting it orange would make the
 * one real conversion target worth a fraction of what it is now. The partial
 * current month is drawn lighter rather than in another colour, because it is
 * the same measurement in an incomplete state, not a different series.
 */
const TrendChart = ({ series, trend }) => {
  /*
   * Start at whichever is earlier: the three-year floor, or the first month of
   * the window the headline compares against — so the comparison is always
   * visible rather than asserted.
   */
  const floor = series[Math.max(series.length - CHART_MONTHS, 0)]?.month;
  const first = trend && trend.peakFrom < floor ? trend.peakFrom : floor;
  const points = series.slice(series.findIndex((point) => point.month === first));
  if (points.length < 2) return null;

  const indexOfMonth = (month) => points.findIndex((point) => point.month === month);
  const peakStart = trend ? indexOfMonth(trend.peakFrom) : -1;
  const peakEnd = trend ? indexOfMonth(trend.peakTo) : -1;

  const peak = Math.max(...points.map((point) => point.count), 1);
  const width = 720;
  const height = 180;
  const gap = 2;
  const slot = width / points.length;
  const barWidth = Math.max(slot - gap, 1);

  /*
   * One label per January and nothing else.
   *
   * Labelling the first bar too was the first attempt: with a window starting in
   * October, "2023" and "2024" landed three bars apart while every other pair
   * was twelve, and an axis whose gaps are uneven reads as a chart with missing
   * months — the one thing this figure must not suggest.
   */
  const labelled = points.filter((point) => point.month.endsWith("-01"));

  return (
    <figure className="mt-8">
      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        className="w-full"
        role="img"
        aria-label={`Proposals per month, ${monthLabel(points[0].month)} to ${monthLabel(
          points[points.length - 1].month
        )}. Peak ${peak} in a single month.`}
      >
        {points.map((point, index) => {
          const barHeight = Math.max((point.count / peak) * height, point.count > 0 ? 1 : 0);
          return (
            <rect
              key={point.month}
              x={index * slot}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              className={point.partial ? "fill-surface-border" : "fill-text-muted"}
            />
          );
        })}
        <line
          x1="0"
          y1={height}
          x2={width}
          y2={height}
          className="stroke-surface-border"
          strokeWidth="1"
        />
        {labelled.map((point) => (
          <text
            key={point.month}
            x={points.indexOf(point) * slot}
            y={height + 16}
            className="fill-text-muted font-mono text-[11px]"
          >
            {point.month.slice(0, 4)}
          </text>
        ))}
        {/*
          A rule under the twelve months the headline is measured against. The
          percentage is the page's most quotable sentence and it is meaningless
          without its comparison; marking the window costs one line and saves the
          reader counting bars.
        */}
        {peakStart >= 0 && peakEnd >= peakStart && (
          <line
            x1={peakStart * slot}
            y1={height + 4}
            x2={peakEnd * slot + barWidth}
            y2={height + 4}
            className="stroke-text"
            strokeWidth="2"
          />
        )}
      </svg>
      <figcaption className="mt-3 text-[13px] text-text-muted">
        Busiest month shown: {n(peak)}.{" "}
        {peakStart >= 0 && (
          <>
            The marked span is the busiest twelve months on record, the window
            the headline compares against.{" "}
          </>
        )}
        The last bar is {monthLabel(points[points.length - 1].month)} and is
        still filling, which is why it is drawn lighter and left out of every
        comparison.
      </figcaption>
    </figure>
  );
};

const SectionHead = ({ children, className = "" }) => (
  <h2
    className={`font-display text-[26px] font-bold tracking-tight text-text ${className}`}
  >
    {children}
  </h2>
);

/*
 * Table styling as child selectors, applied once — the same reason the events
 * calendar does it. Fifteen rows of four cells is sixty class attributes
 * otherwise, for a table whose every cell is styled identically — and the row
 * count is the measured cohort, so it grows as ingestion is repaired.
 */
const TABLE_STYLES = [
  "w-full min-w-140 border-collapse text-left text-[14px]",
  "[&_th]:border-b [&_th]:border-surface-border [&_th]:pb-2.5",
  "[&_th]:text-[12px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.1em]",
  "[&_th]:text-text-muted",
  "[&_td]:border-b [&_td]:border-surface-border/60 [&_td]:py-2.5 [&_td]:align-baseline",
  "[&_tbody_tr:last-child_td]:border-0",
  /*
   * A gutter on every cell but the first. `border-collapse` leaves no spacing of
   * its own, so without it a right-aligned count runs straight into the date
   * beside it and the page printed "1,02025 Sept 2026" — a table about accuracy
   * rendering two numbers as one.
   */
  "[&_th:not(:first-child)]:pl-8 [&_td:not(:first-child)]:pl-8",
  /*
   * Headers and figures never wrap. "Latest proposal" over two lines beside a
   * date broken across two more turns a four-column table into something the eye
   * has to reassemble, and the name column is the only one with prose in it.
   */
  "[&_th]:whitespace-nowrap [&_td:not(:first-child)]:whitespace-nowrap",
  "[&_.num]:text-right [&_.num]:font-mono [&_.num]:tabular-nums",
  // The name column takes the slack, so the figures sit together on the right.
  "[&_td:first-child]:w-full [&_th:first-child]:w-full",
].join(" ");

const SpaceTable = ({ spaces, windowDays }) => (
  <>
    {/*
      At phone width the table scrolls sideways inside its own box, and all a
      reader sees is a column of names — the counts, which are the point, are off
      the right edge with only a clipped header to suggest it. One line says so.
    */}
    <p className="mt-6 text-[13px] text-text-muted sm:hidden">
      Scroll the table sideways for counts and dates.
    </p>
    <div className="mt-3 overflow-x-auto sm:mt-6">
      <table className={TABLE_STYLES}>
        <thead>
          <tr>
            <th scope="col">Space</th>
            <th scope="col" className="num">
              Last {windowDays}d
            </th>
            <th scope="col" className="num">
              All time
            </th>
            <th scope="col">Latest proposal</th>
          </tr>
        </thead>
        <tbody>
          {spaces.map((space) => (
            <tr key={space.space}>
              <td>
                <span className="font-semibold text-text">{space.name}</span>
                {space.spaceId && (
                  <span className="ml-2 font-mono text-[12px] text-text-muted">
                    {space.spaceId}
                  </span>
                )}
              </td>
              <td className="num text-text">{n(space.recent)}</td>
              <td className="num text-text-muted">{n(space.total)}</td>
              <td className="text-text-muted">
                <time dateTime={space.last}>{MONTH_DAY.format(new Date(space.last))}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

/**
 * Where a reader goes next. None of these is orange — see `TrendChart`.
 */
const NEXT_STEPS = [
  {
    href: `${CONFIG.api}/data/dao`,
    name: "DAO proposals API",
    why: "The endpoint this page is built from — filter by space, tag or window.",
  },
  {
    href: `${CONFIG.api}/data/forum`,
    name: "Governance forum API",
    why: "The discussion feed beside it — the threads that precede the votes.",
  },
  {
    href: CONFIG.recipes,
    name: "Recipes",
    why: "Wire proposal alerts into an agent, a bot or a delegate newsletter.",
    external: true,
  },
  {
    href: "/events",
    name: "Events calendar",
    why: "Where the delegates in these spaces meet in person.",
  },
];

const GovernancePage = ({ report }) => {
  const {
    cohort,
    dormant,
    series,
    recent,
    recentCount,
    forumQuarter,
    spaceCount,
    total,
    rawTotal,
    windowDays,
    asOf,
  } = report;

  const headline = headlineOf(report);
  /*
   * Direction comes from the year before, not from the peak.
   *
   * The peak search includes the trailing window, so a peak comparison is never
   * positive and an h1 reading off it says "DAOs are voting less" straight
   * through a recovery. Year on year can say which way this is actually moving;
   * the peak says how far below the record it is. Two different sentences, and
   * the page prints both — an h1 making a claim the body never substantiates is
   * the reader's word against ours.
   */
  const direction = headline?.direction ?? null;
  const mostRecent = cohort[0];
  /* Named in the method section only while it is genuinely still missing. */
  const aave = dormant.find((space) => space.space === "aave_dao");
  const topOfWindow = [...cohort].sort((a, b) => b.recent - a.recent)[0];
  const share =
    topOfWindow && recentCount > 0
      ? Math.round((topOfWindow.recent / recentCount) * 100)
      : 0;
  /* Computed, not typed into the sentence: the corpus grows and the figure moves. */
  const collapsed = rawTotal > 0 ? Math.round(((rawTotal - total) / rawTotal) * 1000) / 10 : 0;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.14em] text-text-muted">
            Research
          </p>

          <h1 className="max-w-[20ch] font-display text-[clamp(34px,6vw,62px)] font-extrabold leading-[1.02] tracking-tight text-text">
            {direction === "down"
              ? "DAOs are voting less."
              : direction === "up"
                ? "DAO voting is picking up."
                : "DAO governance, measured."}
          </h1>

          {/*
            The headline sentence names its own denominator. "Proposals are down
            68%" is the quotable version and it is the one that gets corrected —
            the figure is measured over the spaces this index still ingests, and
            the sentence has to say so in the same breath or the qualifier never
            travels with the number.
          */}
          {headline ? (
            <p className="mt-5 max-w-160 text-[18px] text-text-muted">
              <span className="font-semibold text-text">
                {n(headline.trailing)} governance proposals
              </span>{" "}
              across the {headline.spaces} Snapshot spaces indexed here in the
              twelve months to {headline.windowEnd} —{" "}
              {headline.atPeak ? (
                <>
                  <span className="font-semibold text-text">
                    the busiest twelve months on record
                  </span>
                  .
                </>
              ) : (
                <>
                  <span className="font-semibold text-text">
                    down {Math.abs(headline.changePct)}%
                  </span>{" "}
                  on the busiest twelve months on record, {n(headline.peak)} in{" "}
                  {headline.peakWindow}.
                </>
              )}{" "}
              {direction && (
                <>
                  {" "}
                  The twelve months before them held{" "}
                  <span className="font-semibold text-text">
                    {n(headline.previous)}
                  </span>
                  .
                </>
              )}{" "}
              Rebuilt from the API on every request, not hand-compiled.
            </p>
          ) : (
            <p className="mt-5 max-w-160 text-[18px] text-text-muted">
              Proposal volume across the {spaceCount} Snapshot spaces indexed
              here. Not enough complete months to report a trend yet.
            </p>
          )}

          <p className="mt-5 text-[16px]">
            <a
              href={`${CONFIG.api}/data/dao`}
              className="font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
            >
              Query this yourself — free, no signup
            </a>
          </p>

          <p className="mt-6 text-[13px] text-text-muted">
            Updated {MONTH_DAY.format(new Date(asOf))}. Dates are UTC.{" "}
            {n(total)} proposals across {spaceCount} spaces indexed in total.
          </p>
        </div>
      </Section>

      {/*
        `pt-6` rather than a margin on the first child: the margin collapses out
        of a section with no padding, and `Layout` positions page content over
        the footer, so the gap shows the footer's border as a stray rule.
      */}
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-14">
          <SectionHead>Proposals per month</SectionHead>
          <p className="mt-3 max-w-160 text-[16px] text-text-muted">
            One bar per month across the {cohort.length} spaces that have voted
            in the last {windowDays} days. Holding the set of spaces fixed is
            what separates a decline in governance from a decline in coverage —
            see the method below.
          </p>
          <TrendChart series={series} trend={report.trend} />
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-14">
          <SectionHead>Who is still voting</SectionHead>
          <p className="mt-3 max-w-160 text-[16px] text-text-muted">
            {recentCount > 0 ? (
              <>
                {n(recentCount)} proposals in the last {windowDays} days.
                {topOfWindow && share >= 15 && (
                  <>
                    {" "}
                    <span className="font-semibold text-text">
                      {topOfWindow.name} alone is {share}% of them
                    </span>
                    , which is worth knowing before reading the total as a
                    measure of the field.
                  </>
                )}
                {mostRecent && (
                  <>
                    {" "}
                    Most recent vote opened: {mostRecent.name},{" "}
                    {DAY_SHORT.format(new Date(mostRecent.last))}.
                  </>
                )}
              </>
            ) : (
              <>Nothing in the last {windowDays} days.</>
            )}
          </p>
          <SpaceTable spaces={cohort} windowDays={windowDays} />
        </div>
      </Section>

      {recent.length > 0 && (
        <Section className="bg-background">
          <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-14">
            <SectionHead>Latest proposals</SectionHead>
            <ul className="mt-6 border-t border-surface-border">
              {recent.map((proposal) => (
                <li
                  key={proposal.id}
                  className="flex flex-col gap-1 border-b border-surface-border py-3.5 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <time
                    dateTime={proposal.startsAt}
                    className="w-28 shrink-0 font-mono text-[13px] tabular-nums text-text-muted"
                  >
                    {DAY_SHORT.format(new Date(proposal.startsAt))}
                  </time>
                  <a
                    href={proposal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-[17px] font-semibold leading-snug text-text underline decoration-surface-border underline-offset-4 transition-colors hover:decoration-text"
                  >
                    {proposal.title}
                  </a>
                  <span className="shrink-0 text-[13px] text-text-muted">
                    {proposal.spaceName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/*
        The method section, and it is the reason the page can be cited.

        Every number above is restricted to a cohort, and a reader who cannot
        find out which one has to take the whole page on trust. The largest
        limitation is stated with the evidence that establishes it, because the
        alternative — a per-space silence table presented as DAO health — would
        publish Aave as a dead DAO while its forum runs five governance threads a
        week.
      */}
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-14">
          <SectionHead>Method, and what this does not measure</SectionHead>
          <dl className="mt-6 flex max-w-160 flex-col gap-6 text-[16px]">
            <div>
              <dt className="font-semibold text-text">The measured set</dt>
              <dd className="mt-1.5 text-text-muted">
                {cohort.length} of the {spaceCount} Snapshot spaces in the index
                have a proposal in the last {COHORT_WINDOW_DAYS} days. Every
                figure above is restricted to those, and the monthly series is
                restricted to them across its whole length — so a space that
                stops being ingested cannot show up as governance slowing down.
                Ninety days rather than thirty, because a DAO with a quiet
                quarter is not a dead one.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text">
                The {dormant.length} spaces left out, and why they are not a
                dead-DAO list
              </dt>
              <dd className="mt-1.5 text-text-muted">
                They have no proposal in the window, and that is a statement
                about this index rather than about them.{" "}
                {/*
                  Conditional on Aave actually still being dormant, and dated
                  from its own row.
                
                  The paragraph used to carry "April 2025" and Aave's name as
                  typed text, which makes it a claim with an expiry date: the
                  next backend item on the list is fixing this ingestion, and the
                  day it lands Aave appears in the table above while this
                  sentence still calls it missing. A page whose method section
                  contradicts its own table has lost the argument it exists to
                  make.
                */}
                {aave ? (
                  <>
                    Aave is the clearest case: its last Snapshot proposal here
                    opened in{" "}
                    <time dateTime={aave.last}>
                      {MONTH_YEAR.format(new Date(aave.last))}
                    </time>
                    , {n(aave.silentDays)} days ago, while the Aave governance
                    forum in the same index carries{" "}
                    <span className="font-mono text-[14px]">[ARFC]</span> threads
                    — the stage that goes to a Snapshot vote — in most weeks. The
                    proposals are happening; this index is not picking them up.
                  </>
                ) : (
                  <>
                    Some have genuinely stopped voting. Others are a fetch that
                    stopped or a Snapshot space id that moved, and from inside
                    this index the three look identical — which is why they are
                    counted and not named.
                  </>
                )}{" "}
                A silence column presented as DAO health would be wrong about
                whichever of these is the second kind.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text">Counting</dt>
              <dd className="mt-1.5 text-text-muted">
                A proposal is counted in the month voting opened. One vote is
                often reported more than once — sometimes the same Snapshot URL
                twice, more often the same title in the same space under two or
                three different Snapshot hashes hours apart — so proposals
                sharing a title, a space and a day are counted once, which
                removes {collapsed}% of the feed. A genuine re-run weeks later is kept,
                and is usually labelled as one. Trend comparisons use complete
                months only; the current month is drawn on the chart and left out
                of the arithmetic.
              </dd>
            </div>
            {forumQuarter !== null && (
              <div>
                <dt className="font-semibold text-text">
                  Forum discussion, for contrast
                </dt>
                <dd className="mt-1.5 text-text-muted">
                  Governance forums carried {n(forumQuarter)} posts over the
                  same quarter. That is every forum in the index, not the forums
                  belonging to these {cohort.length} spaces, so it is not a ratio
                  against the {n(recentCount)} proposals above and no ratio is
                  implied — the two sets barely overlap. Joining a thread to the
                  vote it preceded would need a key neither feed carries.
                </dd>
              </div>
            )}
          </dl>
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-24">
          <SectionHead>Same data, other shapes</SectionHead>
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

export default GovernancePage;
