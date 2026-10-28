import { createFileRoute, notFound } from "@tanstack/react-router";
import GovernancePage from "../pages/governance";
import { getGovernanceReport } from "../server/governance";
import { NO_EXPLAINED, getExplainedPage } from "../server/governanceProposals";
import { parsePage } from "../data/trending";
import { reportIsIndexable } from "../data/governance";
import { governanceHead } from "../seo/governanceHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { BRIEF_CACHE_CONTROL, setCacheControl, setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/governance` — the DAO governance report (content doc B1).
 *
 * An index route, so that the proposal pages at `/research/governance/{slug}` are
 * its siblings rather than its children: named `research.governance.tsx`, it
 * would become their parent layout and render in place of every one of them.
 *
 * Paged by `?page=`, for its list of those pages ("proposals explained"); the
 * rest of the report is the same on every page. The first page is the one
 * indexed; later pages are `noindex, follow`, since every proposal page is in
 * the sitemap and they only lead to older ones. A `?page=` that is not a page
 * number, or is past the last, is a 404.
 *
 * WHY THIS IS ONE EVERGREEN URL AND NOT A MONTH PER REPORT
 *
 * B1 specifies a monthly report, and a monthly *URL* is the obvious reading —
 * it is what the events calendar does. On this data it would be wrong. The
 * measured cohort produces between 13 and 30 proposals a month, so each dated
 * page would hold two dozen rows and a percentage computed from them, eleven of
 * every twelve would be a permanently stale archive, and none of them would
 * clear a sensible index floor. The events tier can afford month pages because
 * October holds 734 events and "crypto conferences october 2026" is a real
 * query; nobody searches for "dao proposals august 2026".
 *
 * So the cadence stays — a monthly figure, published on a monthly rhythm, with
 * outreach behind it — and the URL does not move. The trend is the content, it
 * is 64 months long, and it accumulates on one page that keeps its links.
 *
 * WHY THE GATE IS THE COHORT SIZE AND NOT THE PROPOSAL COUNT
 *
 * A quiet quarter is a finding, and demoting the page for reporting one would
 * take the report out of the index exactly when its headline is most worth
 * reading. What is not a finding is the cohort collapsing: that means sources
 * stopped being ingested, and the decline the page would print happened in a
 * pipeline. `reportIsIndexable` also requires a trend, so the page cannot be
 * submitted while its central number is unavailable.
 */
export const Route = createFileRoute("/research/governance/")({
  validateSearch: (search: Record<string, unknown>): { page?: unknown } =>
    search.page === undefined ? {} : { page: search.page },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => {
    const page = parsePage(deps.page);
    if (page === null) throw notFound();

    /*
     * On the first page the proposal list is links the report can do without: a
     * cold or failing list leaves the section out rather than failing the report.
     * The server function never rejects on the server, but on a client-side
     * navigation it is a network call, which can, so the catch is the guarantee.
     * A later page is only that list, so its failure is the page's.
     */
    const explainedRead =
      page === 1 ? getExplainedPage({ data: 1 }).catch(() => NO_EXPLAINED) : getExplainedPage({ data: page });
    const [report, proposals] = await Promise.all([getGovernanceReport(), explainedRead]);
    if (!proposals) throw notFound();

    /*
     * AN INCOMPLETE READ IS AN ORIGIN FAILURE, NOT A PAGE STATE.
     *
     * The previous version rendered a reduced page — percentage withheld, no
     * chart, `noindex` — and returned it with a 200. That is the worst of the
     * three options, because `server.mjs` stamps every 200 with
     * `s-maxage=3600, stale-while-revalidate=86400`: the edge replaces the last
     * good copy with the reduced one and may serve it for a day, so a crawl in
     * that window finds `noindex` on the one promoted research page, and a URL
     * dropped from the index can take weeks to return. And if it is page 1 that
     * fails — the page holding the whole last year — the reduced render is not
     * merely thin but false: "Nothing in the last 90 days", "0 of the 0
     * Snapshot spaces".
     *
     * Throwing gets the cache policy right by not qualifying for one.
     * `Cache-Control` is set on 200s alone, so a 5xx leaves the origin
     * uncached; `stale-if-error=604800` lets the edge keep serving the last
     * good copy where it is honoured, and where it is not the failure costs one
     * request rather than a day, because nothing poisoned the cache. Google
     * treats a 5xx as temporary and holds the page in the index — which is the
     * whole difference from a cached `noindex`.
     *
     * This is the same rule `fetchWithRetry` already applies to landing pages:
     * no record, no page. The third state was the mistake.
     */
    if (report.partial) {
      throw new Error(
        "governance report: the proposal archive read short, so the " +
          "twelve-month comparison would be drawn from a gap"
      );
    }

    const state =
      page === 1 && reportIsIndexable(report) ? indexStateFor("/research/governance") : "substrate";
    setRobotsHeader(robotsHeader(state));
    // Rendered without its list, the report is right but missing the site's only
    // links to the proposal pages; held briefly, the next render can add them.
    if (!proposals.complete) setCacheControl(BRIEF_CACHE_CONTROL);

    return { report, proposals, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head runs before the loader resolves. Claim no figure we have not read.
      return {
        meta: [
          { title: "DAO governance report | Alphaday" },
          {
            name: "description",
            content:
              "Proposal volume and forum activity across the DAO governance spaces indexed by Alphaday.",
          },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const { report, indexable } = loaderData;
    return governanceHead({ report, indexable });
  },

  component: GovernanceReport,
});

function GovernanceReport() {
  const { report, proposals } = Route.useLoaderData();
  return <GovernancePage report={report} explained={proposals} />;
}
