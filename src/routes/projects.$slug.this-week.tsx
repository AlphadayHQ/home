import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * The weekly digest route.
 *
 * §3.2 flags this as load-bearing: this file and `projects.$slug.$topic.tsx`
 * both match `/projects/{slug}/this-week`. It resolves here because TanStack
 * Router ranks static segments above dynamic ones — real precedence doing real
 * work, not a convention. `src/routes/__tests__/route-precedence.test.ts`
 * asserts it, so a router upgrade that changed the ranking would fail the build
 * rather than silently reroute every digest URL into the topic handler.
 *
 * The digest itself is commissioned by the content document, not this one. Until
 * that content exists the route answers a real 404 rather than a thin page —
 * §4.1: prefer no URL over a `noindex` URL.
 */
export const Route = createFileRoute("/projects/$slug/this-week")({
  loader: () => {
    throw notFound();
  },
});
