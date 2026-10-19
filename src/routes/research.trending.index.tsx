import { createFileRoute, notFound } from "@tanstack/react-router";
import TrendingHubPage from "../pages/trending";
import { getTrendingHub } from "../server/trending";
import { TRENDING_HUB, TRENDING_HUB_FLOOR, parsePage } from "../data/trending";
import { trendingHubHead } from "../seo/trendingHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/trending`: why crypto topics are in the news, one page per topic
 * (content doc B3). The rules are in `data/trending.ts`.
 *
 * Paged by `?page=`. The first page is the one indexed, once `TRENDING_HUB_FLOOR`
 * topics are written up; later pages are `noindex, follow`, since every topic is
 * in the sitemap and they only repeat older rows. A `?page=` that is not a page
 * number, or is past the last, is a 404.
 */
export const Route = createFileRoute("/research/trending/")({
  validateSearch: (search: Record<string, unknown>): { page?: unknown } =>
    search.page === undefined ? {} : { page: search.page },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => {
    const page = parsePage(deps.page);
    if (page === null) throw notFound();

    const hub = await getTrendingHub({ data: page });
    if (!hub) throw notFound();

    const state =
      page === 1 && hub.total >= TRENDING_HUB_FLOOR ? indexStateFor(TRENDING_HUB) : "substrate";
    setRobotsHeader(robotsHeader(state));
    return { hub, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Why crypto topics are trending | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return trendingHubHead(loaderData);
  },

  component: TrendingHub,
});

function TrendingHub() {
  const { hub } = Route.useLoaderData();
  return <TrendingHubPage hub={hub} />;
}
