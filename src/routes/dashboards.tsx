import { createFileRoute } from "@tanstack/react-router";
import { Footer, Navbar } from "../components";
import {
  Hero,
  Partners,
  Backers,
  Team,
  FAQ,
  Getfeatures,
  Workflow,
  BoardLinks,
} from "../components/dashboards";
import AllBoards from "../components/dashboards/AllBoards";
import { FAQData } from "../components/dashboards/faqData";
import { buildFaqNode } from "../utils/faqJsonLd";
import { canonicalFor, seoHead } from "../seo/head";
import { listLandingPages } from "../server/landingPages";
import { projectIndexState, belongsInSitemap } from "../seo/indexState";

// The former home page, moved here when / was repositioned to the data layer.
// Title and description are the copy / used to rank on — keep them here so the
// dashboards search intent still has a page to land on.
const TITLE = "Alphaday - Customizable Crypto Data, Research & News Dashboards";
const DESCRIPTION =
  "Create, share and view crypto dashboards. Alphaday provides advantages for trading, researching & analyzing cryptocurrency & blockchain data.";

export const Route = createFileRoute("/dashboards")({
  // Runs on the server for the initial render, so the full project index is in
  // the HTML that a non-JS crawler receives.
  loader: async () => {
    const pages = await listLandingPages();
    return {
      boards: pages
        .filter((page) => belongsInSitemap(projectIndexState(page)))
        .map(({ slug, name }) => ({ slug, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  },
  head: () =>
    seoHead({
      index: true,
      canonical: canonicalFor("/dashboards"),
      title: TITLE,
      description: DESCRIPTION,
      jsonLd: buildFaqNode(FAQData),
    }),
  component: DashboardsPage,
});

function DashboardsPage() {
  const { boards } = Route.useLoaderData();
  return (
    <>
      <Navbar />
      <Hero />
      <Workflow />
      <Partners />
      <Backers />
      <Team />
      <BoardLinks />
      <AllBoards boards={boards} />
      <FAQ />
      <Getfeatures />
      <Footer />
    </>
  );
}
