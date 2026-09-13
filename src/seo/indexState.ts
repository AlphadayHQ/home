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
const STATIC_STATES: Record<string, IndexState> = {
  "/": "promoted",
  "/api": "promoted",
  "/api/docs": "promoted",
  "/dashboards": "promoted",
  "/mobile": "promoted",
  "/privacy": "promoted",
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
