import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getLandingPage } from "../server/landingPages";

/**
 * Migration of the root-level project slugs (§3.1, Appendix C).
 *
 * The old site served project pages at `alphaday.com/{slug}`; they now live
 * under `/projects/{slug}`. This route 301s the 66 old URLs to their new homes
 * generically, so the redirect set cannot drift out of sync with the page set
 * the way a hand-written map would.
 *
 * §3.1's other reason for the move is visible right here: a root-level
 * catch-all is fragile. This file matches *any* unclaimed single segment, which
 * is why `/dashboards` used to render a 404 body at HTTP 200. It now redirects
 * only when the API confirms a landing page exists, and answers a real 404
 * otherwise.
 *
 * Static routes outrank this dynamic one, so `/api`, `/mobile` and the rest are
 * never reached by it.
 */
export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const page = await getLandingPage({ data: params.slug });
    if (!page) throw notFound();
    throw redirect({
      to: "/projects/$slug",
      params: { slug: params.slug },
      statusCode: 301,
    });
  },
});
