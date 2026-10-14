import { createFileRoute } from "@tanstack/react-router";
import { buildPostSitemap } from "../server/postSitemap";

/**
 * `/sitemaps/posts.xml` — every page that carries a published post, built on
 * request so a post reaches the sitemap without a deploy. See
 * `server/postSitemap.ts`.
 *
 * An hour at the edge, the same as the HTML: the API is read about once an hour
 * however often crawlers ask. `stale-if-error` is what makes a failed read safe:
 * the 503 below is not cached, and the edge answers with the last good file.
 */
const CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800";

export const Route = createFileRoute("/sitemaps/posts.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { xml } = await buildPostSitemap();
          return new Response(xml, {
            status: 200,
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": CACHE_CONTROL,
            },
          });
        } catch (error) {
          console.error(error);
          return new Response("Sitemap temporarily unavailable.\n", {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
              "Retry-After": "300",
            },
          });
        }
      },
    },
  },
});
