import { createFileRoute } from "@tanstack/react-router";
import { postSitemapResponse } from "../server/postSitemap";

/**
 * `/sitemaps/posts.xml` — every page that carries a published post, built on
 * request so a post reaches the sitemap without a deploy. How often it is
 * rebuilt, and what a failed read answers, are in `server/postSitemap.ts`.
 */
export const Route = createFileRoute("/sitemaps/posts.xml")({
  server: {
    handlers: {
      GET: () => postSitemapResponse(),
    },
  },
});
