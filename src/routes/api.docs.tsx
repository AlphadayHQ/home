import { createFileRoute } from "@tanstack/react-router";
import ApiDocsPage from "../pages/api-docs";
import { canonicalFor, seoHead } from "../seo/head";

export const Route = createFileRoute("/api/docs")({
  head: () =>
    seoHead({
      index: true,
      canonical: canonicalFor("/api/docs"),
      title: "Alphaday API — Full Reference",
      description: "Browseable reference of every endpoint in the Alphaday REST API: parameters, response shapes and copy-ready cURL commands.",
    }),
  component: ApiDocsPage,
});
