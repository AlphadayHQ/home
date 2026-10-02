import type { GovernanceReport } from "../server/governance";
import { monthLabel } from "../data/eventMonths.js";
import { COHORT_WINDOW_DAYS } from "../data/governance";
import CONFIG from "../config";
import { canonicalFor, seoHead } from "./head";

/**
 * Head and structured data for `/research/governance` (content doc B1).
 *
 * The page exists to be cited, so the two things that decide whether a citation
 * happens are treated as content rather than metadata: the sentence a SERP shows
 * and the `Dataset` node a model or a dataset search reads. Both are built from
 * the same numbers the page prints, through `headlineOf`.
 */

const PATH = "/research/governance";

export interface GovernanceHeadline {
  /** Proposals in the last twelve complete months. */
  trailing: number;
  /** The best twelve on record. */
  peak: number;
  /** Negative is a decline, as a whole percent. Never positive — see `atPeak`. */
  changePct: number;
  /** The trailing window *is* the record, so there is no decline to report. */
  atPeak: boolean;
  /** The twelve complete months before the trailing window. */
  previous: number;
  /**
   * `"down"`, `"up"` or null — year on year, and null inside `DIRECTION_FLOOR`.
   *
   * Separate from `changePct`, which is measured against the record and can
   * therefore never be positive. This is the one the h1 reads.
   */
  direction: "down" | "up" | null;
  /** Spaces the figures are measured over. */
  spaces: number;
  /** `October 2025 – September 2026`, the trailing window. */
  window: string;
  /** The last month of the trailing window: `August 2026`. */
  windowEnd: string;
  /** The twelve months the comparison is against: `January – December 2023`. */
  peakWindow: string;
  /** The same window for the meta description, where characters are scarce. */
  peakWindowShort: string;
}

/**
 * The one set of numbers the page headline, the meta description and the
 * `Dataset` description all print.
 *
 * Shared for the reason `headline` in `eventMonths.js` is shared: the same
 * sentence is written in three files, and a description promising a 68% decline
 * over a page showing 57% is the count-and-rows drift `thisWeek.ts` names,
 * arrived at through the one sentence a SERP actually shows.
 *
 * Returns null when there is no trend to report **or when the archive was read
 * incompletely**, so the indexable branch always has numbers and the numbers
 * are always drawn from a whole corpus. A dropped page of proposals puts a hole
 * in the archive the peak is measured over, and a percentage against a peak
 * that was never fully read is not a floor, it is wrong: losing page 9 of 14
 * reports a 58% decline where the truth is 66%.
 *
 * In practice the route never calls this with a partial report — its loader
 * throws first, so the request 500s rather than caching a reduced page. The
 * guard stays because this is a pure function with other possible callers and
 * the failure it prevents is silent.
 */
export function headlineOf(report: GovernanceReport): GovernanceHeadline | null {
  if (!report.trend || report.partial) return null;
  const { trailing, previous, peak, changePct, peakFrom, peakTo } = report.trend;
  const complete = report.series.filter((point) => !point.partial);
  const from = complete[complete.length - 12]?.month;
  const to = complete[complete.length - 1]?.month;

  return {
    trailing,
    peak,
    changePct,
    /*
     * The peak search includes the trailing window, so `changePct` can never be
     * above zero and "up" only ever rendered as "up 0%". Zero is not a direction,
     * it is the statement that this year *is* the record, and it gets its own
     * sentence rather than a sign.
     */
    atPeak: changePct === 0,
    previous,
    direction: directionOf(trailing, previous),
    spaces: report.cohort.length,
    window: from && to ? `${monthLabel(from)} – ${monthLabel(to)}` : "",
    windowEnd: to ? monthLabel(to) : "",
    peakWindow: peakWindowLabel(peakFrom, peakTo),
    peakWindowShort: peakWindowLabel(peakFrom, peakTo, true),
  };
}

/**
 * How far year on year has to move before the page will call it a direction.
 *
 * The h1 asserts that DAOs are voting less, and off a bare inequality a single
 * proposal either way would flip that sentence between builds. Five per cent of
 * a year is roughly a fortnight's votes at current volume: enough that the
 * claim survives one DAO rescheduling a batch.
 */
export const DIRECTION_FLOOR = 0.05;

const directionOf = (trailing: number, previous: number): "down" | "up" | null => {
  if (previous === 0) return null;
  const change = (trailing - previous) / previous;
  if (Math.abs(change) < DIRECTION_FLOOR) return null;
  return change < 0 ? "down" : "up";
};

/**
 * `January – December 2023`, or `November 2022 – October 2023` across a year
 * boundary.
 *
 * The comparison is the load-bearing half of "down 66%" and it was computed and
 * then never printed, so a reader quoting the figure could not say what it was
 * against — which is the first thing an editor asks and the reason a number
 * gets dropped from a story.
 */
function peakWindowLabel(from: string, to: string, short = false): string {
  const [fromYear] = from.split("-");
  const [toYear] = to.split("-");
  const label = (key: string) => {
    const full = monthLabel(key);
    return short ? full.replace(/^(\w{3})\w*/, "$1") : full;
  };
  const dash = short ? "–" : " – ";
  if (fromYear !== toYear) return `${label(from)}${dash}${label(to)}`;
  return `${label(from).replace(` ${fromYear}`, "")}${dash}${label(to)}`;
}

export function governanceHead({
  report,
  indexable,
}: {
  report: GovernanceReport;
  indexable: boolean;
}) {
  const headline = headlineOf(report);

  /*
   * "Snapshot spaces", not "DAOs", in the title and the description both. The
   * figures are measured over the spaces this index still ingests, and calling
   * those DAOs is the claim the report declines to make — see `governance.ts`
   * on why the dead-DAO index is not shipped. A title that overstates the
   * denominator is the half a journalist quotes.
   */
  const title = headline
    ? `DAO governance report — proposal volume across ${headline.spaces} Snapshot spaces | Alphaday`
    : "DAO governance report — proposal volume and forum activity | Alphaday";

  /*
   * Written to survive truncation, not to fill the field.
   *
   * The first draft ran to 265 characters and Google shows about 155, so the
   * peak window — the half that makes the percentage quotable — was cut, along
   * with the free-and-no-signup hook. Everything that described the page rather
   * than reporting it ("monthly series, per-space activity, and the API it is
   * built from") is already the visible content of the page and earns nothing
   * in a result; the numbers go first and the hook is short enough to survive.
   */
  const comparison = headline
    ? headline.atPeak
      ? `the busiest 12 months on record`
      : `down ${Math.abs(headline.changePct)}% on the record ` +
        `(${headline.peak.toLocaleString("en-GB")}, ${headline.peakWindowShort})`
    : "";

  const description = headline
    ? `${headline.trailing.toLocaleString("en-GB")} governance proposals across ` +
      `${headline.spaces} indexed Snapshot spaces in the 12 months to ` +
      `${headline.windowEnd} — ${comparison}. Free, no signup.`
    : `Proposal volume and forum activity across the DAO governance spaces ` +
      `indexed by Alphaday, rebuilt from the API on every request. Free, no signup.`;

  if (!indexable) return seoHead({ index: false, title, description });

  return seoHead({
    index: true,
    canonical: canonicalFor(PATH),
    title,
    description,
    jsonLd: buildDataset(report, description),
  });
}

/**
 * `Dataset`, not `Article`.
 *
 * The page is a measurement with a method, refreshed continuously, and the
 * citation it wants is "according to Alphaday's governance data" rather than
 * "as Alphaday wrote in September". `Dataset` is also the node Google's dataset
 * surface and the model crawlers read for exactly this shape of content, and it
 * carries the two fields that make a number quotable — `temporalCoverage` and
 * `variableMeasured` — which an `Article` has nowhere to put.
 *
 * `distribution` points at the endpoint rather than a file. There is no CSV to
 * download; the honest distribution of this dataset is the API call that
 * produced it, which is also the conversion target.
 */
function buildDataset(report: GovernanceReport, description: string) {
  const complete = report.series.filter((point) => !point.partial);
  const from = complete[0]?.month;
  const to = complete[complete.length - 1]?.month;
  const headline = headlineOf(report);

  return {
    "@type": "Dataset",
    "@id": `${canonicalFor(PATH)}#dataset`,
    name: "Crypto DAO governance activity",
    description,
    url: canonicalFor(PATH),
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: CONFIG.seo.siteName },
    /*
     * ISO 8601 open-ended interval. The end is the last complete month rather
     * than today: the current month is still filling, and a `temporalCoverage`
     * that includes it invites a comparison against a third of a month.
     */
    ...(from && to ? { temporalCoverage: `${from}/${to}` } : {}),
    sdDatePublished: report.asOf.slice(0, 10),
    /*
     * The de-duplication rule in full, because it is the first thing a
     * researcher checks and the URL half alone is not what the page does. One
     * vote is often posted under two or three Snapshot hashes, so a technique
     * note claiming only URL de-duplication describes a different, looser
     * measurement than the one the figures come from.
     */
    measurementTechnique:
      `Snapshot proposals counted by the month voting opened. De-duplicated by ` +
      `proposal URL, and then by title within one space and one day, because a ` +
      `single vote is frequently reported under several Snapshot hashes; a ` +
      `genuine re-run weeks later is kept. Restricted to spaces with a proposal ` +
      `in the last ${COHORT_WINDOW_DAYS} days, so that a source falling out of ` +
      `the index is not reported as a decline in governance.`,
    variableMeasured: [
      { "@type": "PropertyValue", name: "Proposals per month", unitText: "proposals" },
      ...(headline
        ? [
            {
              "@type": "PropertyValue",
              name: `Proposals in the 12 months to ${headline.windowEnd}`,
              value: headline.trailing,
              unitText: "proposals",
            },
            {
              "@type": "PropertyValue",
              name: `Proposals in the busiest 12 months on record, ${headline.peakWindow}`,
              value: headline.peak,
              unitText: "proposals",
            },
          ]
        : []),
      { "@type": "PropertyValue", name: "Snapshot spaces with a proposal in the window", unitText: "spaces" },
      { "@type": "PropertyValue", name: "Proposals per space, all time", unitText: "proposals" },
    ],
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: "https://api.alphaday.com/v1/items/dao/",
    },
  };
}
