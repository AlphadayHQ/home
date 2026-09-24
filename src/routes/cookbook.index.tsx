import { createFileRoute } from "@tanstack/react-router";
import CookbookPage from "../pages/cookbook";
import { canonicalFor, seoHead } from "../seo/head";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";
import { CAPABILITY_COUNT } from "../data/apiSurface";

/** `/cookbook` — the recipe index. Promoted; the recipes themselves are not. */
export const Route = createFileRoute("/cookbook/")({
  loader: () => {
    const state = indexStateFor("/cookbook");
    setRobotsHeader(robotsHeader(state));
    return { indexable: isIndexable(state) };
  },
  head: ({ loaderData }) => {
    const title = "Crypto API & MCP Cookbook — working code, real output";
    const description = `Six use cases built on Alphaday's free crypto API and MCP server: live news in Claude, DAO proposal alerts, a research agent, a Discord bot, a weekly digest, podcast analysis. ${CAPABILITY_COUNT} data capabilities, no signup.`;

    return loaderData?.indexable
      ? seoHead({
          index: true,
          canonical: canonicalFor("/cookbook"),
          title,
          description,
        })
      : seoHead({ index: false, title, description });
  },
  component: CookbookPage,
});
