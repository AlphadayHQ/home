import { createFileRoute, notFound } from "@tanstack/react-router";
import AuthorPageView from "../pages/author";
import { getAuthorPage } from "../server/authors";
import { authorBySlug, authorPath } from "../data/authors";
import { authorHead } from "../seo/authorHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/authors/{name}`: a bio page, the beat's rules and its newest pages. The
 * names are in `data/authors.ts`; anything else is a 404.
 */
export const Route = createFileRoute("/authors/$slug")({
  loader: async ({ params }) => {
    // An unknown name is a wrong URL, answered here rather than by the validator's 500.
    if (!authorBySlug(params.slug)) throw notFound();

    const page = await getAuthorPage({ data: params.slug });
    if (!page) throw notFound();

    const state = indexStateFor(authorPath(params.slug));
    setRobotsHeader(robotsHeader(state));
    return { page, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Alphaday research | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return authorHead(loaderData);
  },

  component: Author,
});

function Author() {
  const { page } = Route.useLoaderData();
  return <AuthorPageView page={page} />;
}
