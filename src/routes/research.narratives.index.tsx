import { createFileRoute } from "@tanstack/react-router";
import NarrativesPage from "../pages/narratives";
import { getNarrativeHub } from "../server/narratives";
import { NARRATIVE_HUB, NARRATIVE_HUB_FLOOR } from "../data/narratives";
import { narrativesHubHead } from "../seo/narrativesHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/narratives`: the topics crypto media is covering, and the pages
 * written about them (content doc B3). The rules are in `data/narratives.ts`.
 *
 * The floor counts written pages, not trending rows, for the reason the exploit
 * hub counts write-ups: a list of counts with nothing written behind it is not
 * a page worth submitting.
 */
export const Route = createFileRoute("/research/narratives/")({
  loader: async () => {
    const hub = await getNarrativeHub();
    const state =
      hub.written >= NARRATIVE_HUB_FLOOR
        ? indexStateFor(NARRATIVE_HUB)
        : "substrate";
    setRobotsHeader(robotsHeader(state));
    return { hub, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Crypto narratives | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return narrativesHubHead(loaderData);
  },

  component: NarrativesHub,
});

function NarrativesHub() {
  const { hub } = Route.useLoaderData();
  return <NarrativesPage hub={hub} />;
}
