import { createFileRoute, notFound } from "@tanstack/react-router";
import ClientPage from "../pages/mcp-client";
import { clientBySlug } from "../data/mcpClients";
import { guideFor } from "../data/mcpClientGuides";
import { canonicalFor, seoHead } from "../seo/head";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/mcp/{client}` — per-client setup pages.
 *
 * A real 404 for an unknown slug, not a thin page at HTTP 200 (§5.2). The set
 * is closed and small, so an unrecognised slug is a typo or a stale link rather
 * than something to render optimistically.
 *
 * **Index state is deliberately left at the default.** `indexStateFor` is
 * default-deny, so these ship `noindex` and out of the sitemap until someone
 * promotes them in `src/seo/indexState.ts`. Promoting eight new URLs on a
 * domain with no link acquisition yet buys nothing, and the SSR rebuild is not
 * in production, so nothing here reaches a crawler regardless. Promotion is a
 * one-line change per path when that changes.
 *
 * The route-file check in `src/__tests__/static-routes.test.ts` resolves
 * `$param` segments, so promoting `/mcp/cursor` will match this file rather
 * than failing as "no route file serves it" — that gap was found and closed
 * before this route existed.
 */
export const Route = createFileRoute("/mcp/$client")({
  loader: ({ params }) => {
    const client = clientBySlug(params.client);
    const guide = guideFor(params.client);
    /*
     * Both, not either. The record is split across two modules for bundle
     * reasons (see `mcpClientGuides.js`), and resolving them together here
     * means a half-filed client 404s rather than rendering a page with an
     * empty troubleshooting section. `src/__tests__/mcp-clients.test.ts` makes
     * that state a failing build, so this is the belt to that braces.
     */
    if (!client || !guide) throw notFound();

    const state = indexStateFor(`/mcp/${params.client}`);
    setRobotsHeader(robotsHeader(state));
    return { client, guide, indexable: isIndexable(state) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head runs before the loader resolves too. Claim nothing yet.
      return seoHead({
        index: false,
        title: "Alphaday MCP",
        description: "Connect your agent to Alphaday's crypto MCP server.",
      });
    }

    const { client, indexable } = loaderData;
    const name = client.alsoKnownAs
      ? `${client.name} (${client.alsoKnownAs})`
      : client.name;
    const title = `Connect ${name} to Alphaday MCP`;
    const description = `Set up the Alphaday crypto MCP server in ${client.name}: the exact config, where it goes, and the mistakes that break it. Free, no signup. Verified ${client.verifiedOn}.`;

    return indexable
      ? seoHead({
          index: true,
          canonical: canonicalFor(`/mcp/${client.slug}`),
          title,
          description,
        })
      : seoHead({ index: false, title, description });
  },
  component: ClientRoute,
});

function ClientRoute() {
  const { client, guide } = Route.useLoaderData();
  return <ClientPage client={client} guide={guide} />;
}
