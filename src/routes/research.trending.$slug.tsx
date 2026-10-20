import { createFileRoute, notFound } from "@tanstack/react-router";
import TrendingArticlePage from "../pages/trendingPost";
import { getTrendingArticle } from "../server/trending";
import { isPostSlug } from "../data/analysis";
import { TRENDING_HUB, parsePage } from "../data/trending";
import { trendingArticleHead } from "../seo/trendingHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/trending/{post slug}`: one topic, its newest updates first, its
 * original page below them (content doc B3).
 *
 * Every page here is a reviewed, published post, so the first page of each is
 * indexable; a post not to show is a 404. Older updates are paged by `?page=`,
 * served `noindex, follow`: they are older news, and the first page is the one
 * that should rank.
 */
export const Route = createFileRoute("/research/trending/$slug")({
  validateSearch: (search: Record<string, unknown>): { page?: unknown } =>
    search.page === undefined ? {} : { page: search.page },
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps }) => {
    // A malformed segment is a wrong URL, not a server error: answer 404 here
    // rather than letting the server function's validator throw a 500.
    const page = parsePage(deps.page);
    if (!isPostSlug(params.slug) || page === null) throw notFound();

    const article = await getTrendingArticle({ data: { slug: params.slug, page } });
    if (!article) throw notFound();

    const state = page === 1 ? indexStateFor(TRENDING_HUB) : "substrate";
    setRobotsHeader(robotsHeader(state));
    return { article, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Why it is trending | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return trendingArticleHead(loaderData);
  },

  component: TrendingArticle,
});

function TrendingArticle() {
  const { article } = Route.useLoaderData();
  return <TrendingArticlePage article={article} />;
}
