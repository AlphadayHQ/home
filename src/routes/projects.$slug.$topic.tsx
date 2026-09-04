import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * Per-topic project pages. Owned by the content document (§3.2); the routing
 * surface is allocated here so the pages have somewhere to land.
 *
 * Until that content exists this answers a real 404. Shipping an empty page at
 * HTTP 200 would be a soft 404 on an unbounded URL space — the exact failure
 * §5.2 exists to prevent, multiplied by every slug and every topic.
 */
export const Route = createFileRoute("/projects/$slug/$topic")({
  loader: () => {
    throw notFound();
  },
});
