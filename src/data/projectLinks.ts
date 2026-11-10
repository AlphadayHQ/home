/**
 * The join between the research posts and the project pages.
 *
 * A governance post names its DAO (`meta.dao`, "Arbitrum") and an exploit
 * analysis its chain (`meta.chain`, "Ethereum"); a project page lives at
 * `/projects/{slug}` ("arbitrum", "ethereum"). Until this join the two families
 * did not link to each other at all, in either direction.
 *
 * WHY A KEY AND NOT A TABLE
 *
 * The names are written by the research agents and the slugs by whoever made
 * the landing page, and on every value measured (6 Nov 2026: Arbitrum, Aave,
 * Optimism, Zcash; Ethereum, Polygon, Avalanche, Base) they agree once case and
 * punctuation are dropped. A table would have to be kept up as both grow; a
 * name that does not match simply gets no link, which is the safe failure.
 *
 * WHY THE SLUG ONLY
 *
 * Both directions match on the project's slug and nothing else, so among
 * published project pages the join is symmetric: a post links to a project
 * exactly when that project lists the post.
 *
 * Not for an unpublished one. Its page still renders, `noindex`, and still
 * lists the research it matches; but posts link only to published pages
 * (`readProjectSlugs`), so nothing links back to it. That is the direction
 * wanted: a post's link is for readers and crawlers, and neither should be
 * sent to a page the site has chosen not to index.
 */

/** Lower case, letters and digits only: "Ethereum Classic" and "ethereumclassic" agree. */
export const entityKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Whether a post's DAO or chain is the project at `slug`. */
export const isAbout = (name: string | null | undefined, slug: string): boolean =>
  !!name && entityKey(name) !== "" && entityKey(name) === entityKey(slug);

/** The slug of the project page a DAO or chain names, among `slugs`, or null. */
export const projectSlugFor = (
  name: string | null | undefined,
  slugs: readonly string[]
): string | null => slugs.find((slug) => isAbout(name, slug)) ?? null;

export const projectPath = (slug: string): string => `/projects/${slug}`;

/**
 * Where a link to a project's board goes: its project page, in this tab, where
 * it has one — the page that explains the board, and link equity kept on the
 * site — and its board in the app otherwise. Shared by the partner logos and the
 * featured boards (`CONFIG.featuredBoards`), on the home page and /dashboards.
 *
 * The featured boards are a hand-kept list, and a backend without one of their
 * pages (zettaday has only `avalanche`) used to get a link that 404s.
 */
export const partnerLink = (
  slug: string,
  projectSlugs: readonly string[]
): { href: string; target?: string; rel?: string } =>
  projectSlugs.includes(slug)
    ? { href: projectPath(slug) }
    : { href: `https://app.alphaday.com/b/${slug}`, target: "_blank", rel: "noreferrer" };
