import { createFileRoute } from "@tanstack/react-router";
import HomeContainer from "../containers/HomeContainer";
import { canonicalFor, seoHead } from "../seo/head";
import { buildFaqNode } from "../utils/faqJsonLd";
import { FAQData } from "../components/home/faqData";
import { getProjectSlugsNow } from "../server/landingPages";

export const Route = createFileRoute("/")({
  /*
   * For the partner logos only, and never waited for: a cold or failed read
   * leaves every logo on its app link. Read once per visit — a later client
   * navigation back to / reuses it rather than calling the server again.
   */
  loader: async () => ({
    projectSlugs: await getProjectSlugsNow().catch((): string[] => []),
  }),
  staleTime: Infinity,
  head: () =>
    seoHead({
      index: true,
      canonical: canonicalFor("/"),
      title: "Alphaday — The Crypto Data Layer for Humans, Apps & AI Agents",
      description: "Alphaday structures every crypto data type — market, on-chain, news, podcasts, video, governance and more — into one queryable layer. Free API & MCP, no signup.",
      // §5.4: FAQPage ships for machine readability, not rich results — Google
      // restricted those to government and health sites in August 2023.
      jsonLd: buildFaqNode(FAQData),
    }),
  component: HomePage,
});

function HomePage() {
  const { projectSlugs } = Route.useLoaderData();
  return <HomeContainer projectSlugs={projectSlugs} />;
}
