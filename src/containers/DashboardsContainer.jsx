import React from "react";
import { Footer, Navbar } from "../components";
import Seo from "../components/seo";
import CONFIG from "../config";
import { buildFaqJsonLd } from "../utils/faqJsonLd";
import { FAQData } from "../components/dashboards/faqData";
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

// The former home page, moved here when / was repositioned to the data layer.
// Title and description are the copy / used to rank on — keep them here so the
// dashboards search intent still has a page to land on.
const TITLE = "Alphaday - Customizable Crypto Data, Research & News Dashboards";
const DESCRIPTION =
  "Create, share and view crypto dashboards. Alphaday provides advantages for trading, researching & analyzing cryptocurrency & blockchain data.";

function DashboardsContainer() {
  return (
    <>
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        canonical={`${CONFIG.seo.domain.replace(/\/$/, "")}${CONFIG.dashboards}`}
        jsonLd={buildFaqJsonLd(FAQData)}
      />
      <Navbar />
      <Hero />
      <Workflow />
      <Partners />
      <Backers />
      <Team />
      <BoardLinks />
      <FAQ />
      <Getfeatures />
      <Footer />
    </>
  );
}

export default DashboardsContainer;
