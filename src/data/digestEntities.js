/**
 * Which entities have a `this-week` digest.
 *
 * WHY THIS IS AN ALLOWLIST AND NOT EVERY LANDING-PAGE SLUG
 *
 * C3 commissions **one page, not a tier**: ship `/bitcoin/this-week`, measure it
 * for a month, then decide whether the other 15–30 dense entities are worth
 * building. The probe only answers a question if it is the only page in its
 * class — a tier shipped alongside it would confound the measurement with its
 * own thin pages, and §4.4 names crawl budget as the binding constraint.
 *
 * So an unlisted slug gets a real 404, not a thin page at HTTP 200. That is §4.1
 * applied literally: prefer no URL over a `noindex` URL.
 *
 * WHY A `tag` SEPARATE FROM THE SLUG
 *
 * They are not reliably the same string, and assuming they were is finding 23.
 * `?tags=` matches a keyword bag rather than a taxonomy slug, and the board slug
 * frequently carries zero keywords while a twin of another name holds the
 * content — `polygon` has none, `matic-network` has 1,932 articles. Bitcoin is
 * not one of the broken cases, but hardcoding `slug === tag` here would make the
 * second entity added to this list a silent empty page.
 *
 * THE DENSITY BAR FOR ADDING ONE
 *
 * C3 measured the cliff: after the top three entities, seven-day volume falls
 * off fast, and below roughly 20 items a week there is not enough for a recap
 * worth landing on. Measure before adding — `server/thisWeek.ts` enforces the
 * floor at runtime, but a page that only clears it in a busy week should not
 * exist at all.
 */

export const DIGEST_ENTITIES = [
  {
    slug: "bitcoin",
    /** The `?tags=` keyword, which is what the API actually matches on. */
    tag: "bitcoin",
    name: "Bitcoin",
    /**
     * Measured 22 Sep 2026 against the live API. **Trailing seven days:** 326
     * news, 40 blog posts, 27 podcast episodes, 21 videos, 5 forum posts, 5
     * security incidents, 0 DAO proposals — **424 rows against a floor of 20.**
     * Separately, 5 events scheduled in the next seven days.
     *
     * The split matters and an earlier version of this comment got it wrong: it
     * recorded "24 events" in the trailing week, which was the events endpoint's
     * forward-looking total counted as though it were backward-looking — the same
     * mistake the page itself made. Events are never part of the trailing figure
     * the density gate reads.
     *
     * Bitcoin is the safe test case precisely because density is never the
     * variable: if the probe fails here, the format failed, not the data.
     */
    verifiedOn: "2026-09-22",
  },
];

export const digestEntityFor = (slug) =>
  DIGEST_ENTITIES.find((entity) => entity.slug === slug);

/** The paths that need promoting in `src/seo/indexState.ts`. */
export const digestPaths = () =>
  DIGEST_ENTITIES.map((entity) => `/projects/${entity.slug}/this-week`);
