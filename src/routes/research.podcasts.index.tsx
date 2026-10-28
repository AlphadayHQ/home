import { createFileRoute, notFound } from "@tanstack/react-router";
import PodcastHubPage from "../pages/podcasts";
import { getPodcastHub } from "../server/podcasts";
import { PODCAST_HUB, PODCAST_HUB_FLOOR } from "../data/podcastPosts";
import { parsePage } from "../data/trending";
import { podcastHubHead } from "../seo/podcastHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/podcasts`: ideas from crypto podcasts, one page each. The rules are
 * in `data/podcastPosts.ts`.
 *
 * An index route, so it is not the parent layout of the pages under it. Paged by
 * `?page=`. The first page is the one indexed, once `PODCAST_HUB_FLOOR` ideas
 * are published; later pages are `noindex, follow`, since every page is in the
 * sitemap and they only repeat older rows. A `?page=` that is not a page number,
 * or is past the last, is a 404.
 */
export const Route = createFileRoute("/research/podcasts/")({
  validateSearch: (search: Record<string, unknown>): { page?: unknown } =>
    search.page === undefined ? {} : { page: search.page },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => {
    const page = parsePage(deps.page);
    if (page === null) throw notFound();

    const hub = await getPodcastHub({ data: page });
    if (!hub) throw notFound();

    const state =
      page === 1 && hub.total >= PODCAST_HUB_FLOOR ? indexStateFor(PODCAST_HUB) : "substrate";
    setRobotsHeader(robotsHeader(state));
    return { hub, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "What crypto podcasts are arguing | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return podcastHubHead(loaderData);
  },

  component: PodcastHub,
});

function PodcastHub() {
  const { hub } = Route.useLoaderData();
  return <PodcastHubPage hub={hub} />;
}
