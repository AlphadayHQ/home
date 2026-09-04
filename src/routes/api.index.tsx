import { createFileRoute } from "@tanstack/react-router";
import ApiPage from "../pages/api";
import { canonicalFor, seoHead } from "../seo/head";

export const Route = createFileRoute("/api/")({
  head: () =>
    seoHead({
      index: true,
      // The live SPA emits no canonical here, so /api — the primary conversion
      // target for audience one — currently tells Google it is a duplicate of
      // the home page. The head helper's types make that unrepresentable.
      canonical: canonicalFor("/api"),
      title: "Alphaday API",
      description: "All of crypto. One API. 1,000+ data sources, MCP and REST.",
    }),
  component: ApiPage,
});
