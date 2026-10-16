import { createFileRoute, notFound } from "@tanstack/react-router";
import NarrativePageView from "../pages/narrative";
import { getNarrative } from "../server/narratives";
import { NARRATIVE_HUB, isNarrativeSlug } from "../data/narratives";
import { narrativeHead } from "../seo/narrativesHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/narratives/{tag}`: one topic (content doc B3).
 *
 * A topic renders when it is trending or has a published post, and 404s
 * otherwise (`server/narratives.ts`). It is indexed only with a published post
 * on it: a trending topic with nothing written is counts and other people's
 * headlines, readable from the hub but not a page to submit.
 */
export const Route = createFileRoute("/research/narratives/$narrative")({
  loader: async ({ params }) => {
    // A malformed segment is a wrong URL, not a server error.
    if (!isNarrativeSlug(params.narrative)) throw notFound();

    const page = await getNarrative({ data: params.narrative });
    if (!page) throw notFound();

    const state = page.post ? indexStateFor(NARRATIVE_HUB) : "substrate";
    setRobotsHeader(robotsHeader(state));
    return { page, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Crypto narrative | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return narrativeHead(loaderData);
  },

  component: Narrative,
});

function Narrative() {
  const { page } = Route.useLoaderData();
  return <NarrativePageView page={page} />;
}
