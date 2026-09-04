import { createFileRoute } from "@tanstack/react-router";
import HomeContainer from "../containers/HomeContainer";
import { canonicalFor, seoHead } from "../seo/head";
import { buildFaqNode } from "../utils/faqJsonLd";
import { FAQData } from "../components/home/faqData";

export const Route = createFileRoute("/")({
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
  component: HomeContainer,
});
