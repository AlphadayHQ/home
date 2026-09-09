import { createFileRoute } from "@tanstack/react-router";
import PrivacyPolicyPage from "../pages/privacy-policy";
import { canonicalFor, seoHead } from "../seo/head";

export const Route = createFileRoute("/privacy")({
  head: () =>
    seoHead({
      index: true,
      canonical: canonicalFor("/privacy"),
      title: "Privacy Policy — Alphaday",
      description: "How Alphaday collects, uses and stores your data.",
    }),
  component: PrivacyPolicyPage,
});
