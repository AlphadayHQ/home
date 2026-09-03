import React from "react";
import { Footer } from "../components";
import HomeNavbar from "../components/navbar/HomeNavbar";
import Seo from "../components/seo";
import { canonicalFor } from "../utils/canonical";
import { buildSiteJsonLd } from "../utils/siteJsonLd";
import { buildFaqNode } from "../utils/faqJsonLd";
import { FAQData } from "../components/home/faqData";
import {
  Hero,
  TrustStrip,
  LayerDemo,
  Builders,
  Products,
  Partners,
  Backers,
  FAQ,
  FinalCTA,
} from "../components/home";

// Approved launch copy — carry over as-is.
const TITLE = "Alphaday — The Crypto Data Layer for Humans, Apps & AI Agents";
const DESCRIPTION =
  "Alphaday structures every crypto data type — market, on-chain, news, podcasts, video, governance and more — into one queryable layer. Free API & MCP, no signup.";

function HomeContainer() {
  return (
    <>
      {/* FAQData, not mobileFAQData: <FAQ /> below renders without `isMobile`,
          and structured data must describe the questions actually in the DOM. */}
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        canonical={canonicalFor("/")}
        jsonLd={buildSiteJsonLd([buildFaqNode(FAQData)])}
      />
      <HomeNavbar />
      <Hero />
      <TrustStrip />
      <LayerDemo />
      <Builders />
      <Products />
      <Partners />
      <Backers />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}

export default HomeContainer;
