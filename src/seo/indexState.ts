/**
 * The index-state field (§4.2, §4.1).
 *
 * Publishing a page and indexing a page are separate operations. Every route
 * carries an explicit state, and **the default is `substrate`** — promotion is
 * an action, not an absence. The live site's failure mode is the opposite: the
 * sitemap and the page set are derived from different sources and drift, so it
 * publishes URLs that render 404s and omits pages that rank.
 *
 * This module is the single source both sides read. The head layer asks whether
 * to emit `noindex`; the sitemap asks whether the URL may be listed. They cannot
 * disagree, because there is only one answer.
 */
/*
 * The `.js` extension is required, and this is the one module in the codebase
 * where that is true. Every other import here is extensionless because Vite
 * resolves them — but `scripts/build-sitemap.mjs` imports *this* file directly
 * under node's TypeScript stripping, and node's ESM resolver does not guess
 * extensions. Without it the sitemap build dies with ERR_MODULE_NOT_FOUND.
 */
import { digestPaths } from "../data/digestEntities.js";
import { capabilityPaths } from "../data/capabilityPages.js";
import { recipePaths } from "../data/cookbook.js";
import { mcpClientPaths } from "../data/mcpClients.js";


/** §4.1's three layers. */
export type IndexState =
  /** Indexed and in the sitemap. */
  | "promoted"
  /** Published, `noindex` until its gate passes. Never in the sitemap yet. */
  | "on-merit"
  /** Exists for users, must never be indexed. Never in the sitemap. */
  | "substrate";

export const isIndexable = (state: IndexState): boolean => state === "promoted";

/**
 * The sitemap may only ever list a promoted URL. This is the invariant that
 * stops the two from drifting — a page the generator marked substrate cannot
 * be published into the sitemap by forgetting a filter somewhere else.
 */
export const belongsInSitemap = (state: IndexState): boolean =>
  state === "promoted";

/**
 * Static routes whose state is known at build time. Anything absent is
 * `substrate` by default — see `indexStateFor`.
 */
const promote = (paths: string[]): Record<string, IndexState> =>
  Object.fromEntries(paths.map((path) => [path, "promoted" as IndexState]));

const STATIC_STATES: Record<string, IndexState> = {
  "/": "promoted",
  "/api": "promoted",
  "/api/docs": "promoted",
  "/mcp": "promoted",
  "/cookbook": "promoted",
  "/dashboards": "promoted",
  /*
   * B4's events calendar. Promoted on the same reasoning as the digest tier —
   * it exists to be found in search, and the listicle SERP it attacks is the
   * whole point of building it — with the same escape hatch: the route demotes
   * itself to `substrate` when the current month comes back completely empty,
   * so a feed outage cannot leave an indexed page claiming nothing is happening.
   *
   * Only *empty*, not *thin*. The hub shows the current month and leads with
   * what is still to come, so in the last days of a month it legitimately has
   * few upcoming rows and a full month of finished ones. Demoting on that would
   * take the calendar out of the index for a few days every month.
   */
  "/events": "promoted",

  /*
   * B1's governance report. Promoted from the start, unlike the Engine A tiers
   * that shipped `noindex` — a research page exists to be cited, and a `noindex`
   * primary source is a contradiction in terms: it cannot be found, quoted or
   * linked, so holding it back measures nothing and costs the only thing the
   * asset is for.
   *
   * The escape hatch is `reportIsIndexable` rather than a raw count. The page
   * demotes itself when the measured cohort falls below `COHORT_FLOOR` or when
   * there are not two full years to compare — both of which mean the proposal
   * feed has broken rather than that governance has gone quiet. A quiet quarter
   * is a finding and keeps the page indexed; a collapsed cohort is a pipeline
   * failure and takes it out, because the decline it would print did not happen
   * in the DAOs.
   */
  "/research/governance": "promoted",

  "/mobile": "promoted",
  "/privacy": "promoted",

  /*
   * The content tiers, all derived rather than listed.
   *
   * **Every one of these is a set, and none of them is written out here.** Two
   * hand-maintained lists of the same set is the drift this whole module exists
   * to prevent: an entry promoted but not built is a sitemap URL that 404s, and
   * one built but not promoted is a page no crawler can reach. Deriving each
   * tier from the data that builds it makes both impossible rather than
   * unlikely.
   *
   * The digest tier (content doc C3) was promoted first and alone. The other
   * three shipped 14–21 Sep behind `noindex` — correct at the time, because the
   * SSR origin had not cut over and an indexable client-rendered shell is worse
   * than an unindexed one. **That hold was written to expire at the cutover, the
   * cutover landed on or before 24 Sep, and nothing expired it**, so 36 live
   * server-rendered pages sat invisible for four days. Promoted 28 Sep.
   *
   * **Promoted per tier on measured uniqueness, not by assumption.** The worry
   * on record was that 22 capability pages over one dataset would cannibalise
   * each other. Measured against production, they do not: median pairwise
   * 5-gram similarity 0.23, and 63% of each page is text no sibling shares.
   * Recipes are cleaner still at 0.14 and 82% unique.
   *
   * **The client pages are the ones to watch, which is the opposite of the
   * prediction.** They are the longest of the three tiers (~1,300 words) and the
   * least distinct: 0.51 median similarity, only 34% of each page unique. That
   * is inherent to what they are — eight explanations of one server differing
   * mainly in the shape of a config block — and it is why they are promoted to
   * be measured rather than assumed safe. The signal that this was wrong is
   * `Duplicate without user-selected canonical` or `Crawled - currently not
   * indexed` landing on `/mcp/*` in Search Console; the response is to trim the
   * shared explainer to a link rather than to demote the tier.
   */
  ...promote(digestPaths()),
  ...promote(capabilityPaths()),
  ...promote(recipePaths()),
  ...promote(mcpClientPaths()),
};

/**
 * Default-deny. A route that nobody has explicitly promoted is substrate, which
 * means a new page ships `noindex` and out of the sitemap until someone decides
 * otherwise. That is the safe direction: an unlisted good page costs a recrawl,
 * an indexed bad page costs a removal request.
 */
export function indexStateFor(path: string): IndexState {
  const normalised = path === "/" ? "/" : path.replace(/\/$/, "");
  return STATIC_STATES[normalised] ?? "substrate";
}

/**
 * Every static route this site declares.
 *
 * The sitemap used to repeat these paths in a second array of its own, which
 * made adding a page a two-file edit with no failure if you only did one. The
 * gate already caught one direction — a route that is not `promoted` cannot be
 * listed no matter what the array says — but not the reverse: a promoted page
 * missing from the sitemap's copy was simply, silently, never submitted.
 *
 * Returning the keys here removes the second list. `STATIC_STATES` is now the
 * only place a static route is declared, which is the same property
 * `belongsInSitemap` gives the index state: one definition, so the two sides
 * cannot disagree.
 */
export function staticPaths(): string[] {
  return Object.keys(STATIC_STATES);
}

/**
 * Project landing pages are promoted when the API says they are published.
 * The same predicate serves the route (which decides `noindex`) and the sitemap
 * (which decides listing), so a page pulled from publication disappears from
 * both at once.
 */
export function projectIndexState(record: {
  is_published?: boolean;
}): IndexState {
  return record.is_published === false ? "substrate" : "promoted";
}

/**
 * §4.2: emit the header as well as the meta tag. The header is what non-HTML
 * responses and some crawlers actually honour, and it is the only one that
 * reaches a client that never parses the body.
 */
export function robotsHeader(state: IndexState): string {
  return isIndexable(state)
    ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    : "noindex, follow";
}
