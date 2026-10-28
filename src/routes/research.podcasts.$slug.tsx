import { createFileRoute, notFound } from "@tanstack/react-router";
import PodcastPostPage from "../pages/podcastPost";
import { getPodcastArticle } from "../server/podcasts";
import { PODCAST_HUB, isPostSlug } from "../data/podcastPosts";
import { podcastArticleHead } from "../seo/podcastHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/podcasts/{post slug}`: one idea from crypto podcasts. The rules are
 * in `data/podcastPosts.ts`.
 *
 * Every page here is a reviewed, published post, so every one inherits the
 * hub's index state; a post that is not one to show is a 404. The hub's floor
 * is not theirs: it guards a list, and each of these is an article on its own.
 */
export const Route = createFileRoute("/research/podcasts/$slug")({
  loader: async ({ params }) => {
    // A malformed segment is a wrong URL, not a server error: answer 404 here
    // rather than letting the server function's validator throw a 500.
    if (!isPostSlug(params.slug)) throw notFound();

    const article = await getPodcastArticle({ data: params.slug });
    if (!article) throw notFound();

    const state = indexStateFor(PODCAST_HUB);
    setRobotsHeader(robotsHeader(state));
    return { article, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "An idea from crypto podcasts | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return podcastArticleHead(loaderData);
  },

  component: PodcastPost,
});

function PodcastPost() {
  const { article } = Route.useLoaderData();
  return <PodcastPostPage article={article} />;
}
