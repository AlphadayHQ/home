import { createFileRoute, notFound } from "@tanstack/react-router";
import ThisWeekPage from "../pages/this-week";
import type { Digest } from "../server/thisWeek";
import { digestEntityFor } from "../data/digestEntities";
import { WINDOW_LABEL, countsByDirection } from "../data/digestWindow";
import { getDigest } from "../server/thisWeek";
import { canonicalFor, seoHead } from "../seo/head";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * The weekly digest route — the SERP probe from the content document's C3.
 *
 * §3.2 flags this as load-bearing: this file and `projects.$slug.$topic.tsx`
 * both match `/projects/{slug}/this-week`. It resolves here because TanStack
 * Router ranks static segments above dynamic ones — real precedence doing real
 * work, not a convention. `src/__tests__/route-precedence.test.ts` asserts it,
 * so a router upgrade that changed the ranking would fail the build rather than
 * silently reroute every digest URL into the topic handler.
 *
 * WHY AN UNKNOWN SLUG IS STILL A 404
 *
 * This route used to 404 unconditionally, on the grounds that no URL beats a
 * `noindex` URL (§4.1). That reasoning has not changed — it has narrowed to
 * everything outside `DIGEST_ENTITIES`. C3 commissions **one page, not a tier**:
 * ship Bitcoin, measure for a month, then decide. A slug with no record answers
 * a real 404 rather than rendering a thin digest from a fuzzy keyword match.
 *
 * WHY THIS ONE IS PROMOTED WHEN THE OTHER 38 PAGES ARE NOT
 *
 * Every page shipped so far sits at `indexStateFor`'s default-deny, because none
 * of them needs to be indexed to be useful and promotion is an action. This page
 * is the exception by construction: **it exists to be measured in search.** A
 * `noindex` probe measures nothing. So `/projects/bitcoin/this-week` is promoted
 * explicitly in `src/seo/indexState.ts`, which also places it in the sitemap —
 * the two read the same field, so they cannot disagree.
 *
 * The runtime density gate can still demote it. That is the one case where the
 * sitemap and the page could briefly disagree, and it is the right direction:
 * the sitemap is built ahead of time and cannot know that a feed outage emptied
 * the window, whereas an indexed empty page is a removal request. C3 asks for
 * exactly this fallback — "widen itself and say so, or fall back to noindex" —
 * and `thin` is only reachable when 30 days holds fewer than 20 rows, which for
 * Bitcoin means the API is down rather than the news is slow.
 */
export const Route = createFileRoute("/projects/$slug/this-week")({
  loader: async ({ params }) => {
    const entity = digestEntityFor(params.slug);
    if (!entity) throw notFound();

    const digest = await getDigest({ data: entity.tag });

    const declared = indexStateFor(`/projects/${entity.slug}/this-week`);
    // The gate demotes, never promotes: a thin window cannot be indexed even
    // where the path is promoted, and a promoted path is still required.
    const state = digest.thin ? "substrate" : declared;
    setRobotsHeader(robotsHeader(state));

    return { digest, entity, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head runs before the loader resolves. Claim nothing yet.
      return seoHead({
        index: false,
        title: "This week — Alphaday",
        description: "A rolling seven-day digest of indexed crypto coverage.",
      });
    }

    const { digest, entity, indexable } = loaderData;
    const window = digest.defaultWindow;

    /*
     * Split by direction, because the sentence below says "from the last N days"
     * and that has to be true of the number in front of it. `digest.totals`
     * includes events scheduled *ahead* of the window, so using it here described
     * forward-looking rows under a trailing label — in the one piece of copy a
     * SERP actually prints.
     */
    const { coverage, upcoming } = countsByDirection(digest.sections, window);

    /*
     * The title is named tightly — "Bitcoin this week" — while the h1 stays
     * conversational. C3 makes this split deliberately: the recap phrasing is
     * what the reader and the model ask, and the tight name is what a SERP line
     * and a browser tab need.
     */
    const title = `${entity.name} this week — news, governance and coverage | Alphaday`;
    const description =
      `What's been happening with ${entity.name}: ` +
      `${coverage.toLocaleString("en-GB")} indexed items from the last ` +
      `${WINDOW_LABEL[window]} — news across 49 outlets, podcasts, video and ` +
      `governance` +
      (upcoming > 0
        ? `, plus ${upcoming.toLocaleString("en-GB")} scheduled event${upcoming === 1 ? "" : "s"}`
        : "") +
      `. Updated continuously, free API, no signup.`;

    const canonical = canonicalFor(`/projects/${entity.slug}/this-week`);

    return indexable
      ? seoHead({
          index: true,
          canonical,
          title,
          description,
          jsonLd: buildJsonLd({ digest, entity, canonical }),
        })
      : seoHead({ index: false, title, description });
  },

  component: DigestRoute,
});

function DigestRoute() {
  const { digest, entity } = Route.useLoaderData();
  return <ThisWeekPage digest={digest} entity={entity} />;
}

/**
 * `CollectionPage`, not `NewsArticle`.
 *
 * The page aggregates other publishers' items; it does not author them. Marking
 * it up as an article would claim authorship of coverage Alphaday indexed rather
 * than wrote, which is both false and the kind of thing a manual action exists
 * for. `CollectionPage` + `ItemList` is what this actually is.
 *
 * `dateModified` is the freshest indexed row, never the render clock. C3: set it
 * "only when the content actually changed". A `dateModified` that advances on
 * every regeneration is the `lastmod`-on-every-build problem in structured data,
 * and Google discounts the signal once it proves unreliable.
 */
function buildJsonLd({
  digest,
  entity,
  canonical,
}: {
  // The real type, not a restatement of it. A hand-written shape here drifted
  // the moment `counts` became nullable, and a structural mismatch in a JSON-LD
  // builder fails at the type level rather than in anything a reader would see.
  digest: Digest;
  entity: { slug: string; name: string };
  canonical: string;
}) {
  const window = digest.defaultWindow;

  /*
   * Only trailing coverage, and only rows that link somewhere. Events and
   * exploits carry no URL, so they drop out here anyway — but the filter is
   * explicit because a `ListItem` without a `url` is not useful to anything
   * consuming this.
   */
  const trailing = digest.sections.filter((section) => !section.upcoming);

  const listed = trailing
    .flatMap((section) => section.items.slice(0, 3))
    .filter((item) => item.url)
    .slice(0, 15);

  /*
   * Counted over the same population the list samples from, not the page total.
   *
   * The page total includes upcoming events, which are not in `itemListElement`
   * and are not "items in this list" in any sense a consumer would expect. This
   * is the same count-and-rows-from-one-source rule the digest module enforces,
   * applied to the structured data — the whole point of `numberOfItems` is that a
   * machine trusts it without seeing the rows.
   */
  const { coverage: numberOfItems } = countsByDirection(digest.sections, window);

  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "CollectionPage",
      "@id": canonical,
      url: canonical,
      name: `${entity.name} this week`,
      description:
        `A rolling ${window} digest of everything Alphaday indexed about ` +
        `${entity.name}: news, project blogs, podcasts, video, governance ` +
        `activity, events and security incidents.`,
      isPartOf: { "@type": "WebSite", name: "Alphaday", url: canonicalFor("/") },
      about: { "@type": "Thing", name: entity.name },
      ...(digest.freshestAt ? { dateModified: digest.freshestAt } : {}),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems,
        itemListElement: listed.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: item.url,
          name: item.title,
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Dashboards",
          item: canonicalFor("/dashboards"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: entity.name,
          item: canonicalFor(`/projects/${entity.slug}`),
        },
        { "@type": "ListItem", position: 3, name: "This week", item: canonical },
      ],
    },
  ];

  return graph;
}
