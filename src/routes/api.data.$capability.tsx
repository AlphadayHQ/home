import { createFileRoute, notFound } from "@tanstack/react-router";
import CapabilityPage from "../pages/capability";
import { HEADLINE_CAPABILITIES } from "../data/mcpCapabilities";
import { pageBySlug } from "../data/capabilityPages";
import { canonicalFor, seoHead } from "../seo/head";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/api/data/{capability}` — one page per headline data capability.
 *
 * The page set is `HEADLINE_CAPABILITIES` from `mcpCapabilities.js`, kept
 * authoritative in one place. The loader checks membership before reading
 * `pageBySlug`, so the route enforces the same set the rest of the page
 * (the link list in `/api`, the orphan-test in `capability-pages.test.ts`)
 * advertises — a stale slug in any one place fails the build rather than
 * rendering a blank card. A bare `/api/data` falls through this single-
 * segment matcher and hits the root not-found handler, returning a real
 * 404 with no body.
 *
 * Index state is left at `indexStateFor`'s default-deny, matching
 * `/mcp/{client}` and `/cookbook/{recipe}`. These pages are published
 * substrate until they earn promotion — promotion is one line per path in
 * `STATIC_STATES`, not an absence. Plan §2.3 makes this explicit.
 */
export const Route = createFileRoute("/api/data/$capability")({
  loader: ({ params }) => {
    /*
     * `HEADLINE_CAPABILITIES.includes` is the join key. The route, `/api`'s
     * link list and the orphan-test all read it; `pageBySlug` is just a
     * typed lookup, not the source of truth. A slug here that is not in
     * HEADLINE_CAPABILITIES is a typo or a hand-edit that drifted.
     */
    if (!HEADLINE_CAPABILITIES.includes(params.capability)) throw notFound();
    const page = pageBySlug(params.capability);
    if (!page) throw notFound();

    const state = indexStateFor(`/api/data/${params.capability}`);
    setRobotsHeader(robotsHeader(state));
    return { page, indexable: isIndexable(state) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head runs before the loader resolves. Claim nothing yet.
      return seoHead({
        index: false,
        title: "Alphaday API — Data capability",
        description: "One data capability from the Alphaday API.",
      });
    }

    const { page, indexable } = loaderData;
    const title = `${page.title} — Alphaday API`;
    const description = page.blurb;

    return indexable
      ? seoHead({
          index: true,
          canonical: canonicalFor(`/api/data/${page.slug}`),
          title,
          description,
        })
      : seoHead({ index: false, title, description });
  },
  component: CapabilityRoute,
});

function CapabilityRoute() {
  const { page } = Route.useLoaderData();
  return <CapabilityPage page={page} />;
}
