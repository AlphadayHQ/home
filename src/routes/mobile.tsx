import { createFileRoute } from "@tanstack/react-router";
import MobilePage from "../pages/mobile-app";
import { canonicalFor, seoHead } from "../seo/head";

export const Route = createFileRoute("/mobile")({
  head: () =>
    seoHead({
      index: true,
      canonical: canonicalFor("/mobile"),
      title: "Alphaday Mobile — Crypto on the go",
      description: "The whole Alphaday workspace in your pocket: news, market data, governance and alerts, with push notifications for the signals you care about.",
    }),
  component: MobilePage,
});
