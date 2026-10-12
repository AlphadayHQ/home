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
      /*
       * "Alphaday API" was the brand wordmark doing duty as a title: it names
       * the publisher and not the thing, so it competes for nobody's query and
       * tells a reader on a results page nothing they did not already know from
       * the domain. Measured 22 Sep at position 13.65 on 121 impressions and a
       * single click.
       *
       * What replaces it is built from what audience one evaluates on (CLAUDE.md
       * §Users): is there an MCP server, can my agent call this today, what does
       * it cost. "Crypto API" is the head term and sits in the first three words;
       * free, no-signup and MCP are the differentiators, and they are the same
       * three the home page and /mcp already lead with, so the three pages now
       * say one thing rather than three. 48 characters, short of truncation.
       */
      title: "Alphaday Crypto API — Free REST & MCP, No Signup",
      description: "All of crypto. One API. 1,000+ data sources, MCP and REST.",
    }),
  component: ApiPage,
});
