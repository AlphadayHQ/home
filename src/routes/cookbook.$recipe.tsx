import { createFileRoute, notFound } from "@tanstack/react-router";
import RecipePage from "../pages/cookbook-recipe";
import { recipeBySlug } from "../data/cookbook";
import { canonicalFor, seoHead } from "../seo/head";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/cookbook/{recipe}` — one use case.
 *
 * A real 404 for an unknown slug rather than a thin page at HTTP 200: the set
 * is closed and small, so an unrecognised slug is a typo or a stale link.
 *
 * Index state is left at `indexStateFor`'s default-deny, matching the MCP
 * client pages. Promotion is a line per path in `src/seo/indexState.ts` once
 * the SSR rebuild is in production — nothing here reaches a crawler before
 * that regardless, and the `$param` resolution in `static-routes.test.ts` means
 * promoting them will match this file rather than failing as unserved.
 */
export const Route = createFileRoute("/cookbook/$recipe")({
  loader: ({ params }) => {
    const recipe = recipeBySlug(params.recipe);
    if (!recipe) throw notFound();

    const state = indexStateFor(`/cookbook/${params.recipe}`);
    setRobotsHeader(robotsHeader(state));
    return { recipe, indexable: isIndexable(state) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head runs before the loader resolves. Claim nothing yet.
      return seoHead({
        index: false,
        title: "Alphaday Cookbook",
        description: "Working code for crypto agents, with real output.",
      });
    }

    const { recipe, indexable } = loaderData;
    const title = `${recipe.title} — Alphaday Cookbook`;
    const description = `${recipe.blurb.replace(/[`*]/g, "")} Working code and the output it produced. Free API, no signup.`;

    return indexable
      ? seoHead({
          index: true,
          canonical: canonicalFor(`/cookbook/${recipe.slug}`),
          title,
          description,
        })
      : seoHead({ index: false, title, description });
  },
  component: RecipeRoute,
});

function RecipeRoute() {
  const { recipe } = Route.useLoaderData();
  return <RecipePage recipe={recipe} />;
}
