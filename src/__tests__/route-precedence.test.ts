import { describe, expect, it } from "vitest";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";

/**
 * §3.2 flags two things in the route map as load-bearing and easy to break.
 * Both are properties of how the router *ranks* routes, not of anything written
 * in a route file — so nothing in review would catch a regression, and the
 * symptom (every digest URL silently served by the topic handler) looks like
 * working software.
 */
describe("route precedence", () => {
  const router = createRouter({ routeTree });

  const idFor = (pathname: string) => {
    const matches = router.matchRoutes({ pathname, search: {} } as never);
    return matches[matches.length - 1]?.routeId;
  };

  it("resolves /projects/{slug}/this-week to the digest route, not $topic", () => {
    // `projects.$slug.this-week` and `projects.$slug.$topic` both match this
    // URL. It lands on the digest only because TanStack Router ranks static
    // segments above dynamic ones. If a router upgrade ever changed that
    // ranking, every digest URL would quietly become a topic page.
    expect(idFor("/projects/ethereum/this-week")).toBe(
      "/projects/$slug/this-week"
    );
  });

  it("still routes an ordinary topic to $topic", () => {
    expect(idFor("/projects/ethereum/governance")).toBe(
      "/projects/$slug/$topic"
    );
  });

  it("prefers static routes over the root-level $slug catch-all", () => {
    // A root-level catch-all is why /dashboards used to render a 404 body at
    // HTTP 200. Every static route must outrank it.
    for (const path of ["/api", "/api/docs", "/dashboards", "/mobile", "/privacy"]) {
      expect(idFor(path)).not.toBe("/$slug");
    }
  });

  it("routes an unclaimed single segment to the legacy-redirect route", () => {
    expect(idFor("/ethereum")).toBe("/$slug");
  });

  it("routes /{slug}/this-week to its own route, not under /$slug", () => {
    /*
     * The digest's canonical URL is `/projects/{slug}/this-week` (§3.2), but the
     * content document's C3 and §13 both say `/{entity}/this-week`, and
     * `/bitcoin` itself 301s — so the short form redirects rather than dead-ends.
     *
     * The file is `$slug_.this-week.tsx` with a trailing underscore, and this
     * asserts why. Named `$slug.this-week.tsx` it nests under `$slug.tsx`, which
     * promotes that leaf to a parent layout whose loader runs first: it redirects
     * to `/projects/{slug}`, dropping the `this-week` segment, and its async
     * redirect beats the child's synchronous `notFound()`. The observable symptom
     * was `/ethereum/this-week` answering 301 to a landing page instead of 404.
     *
     * Dropping the underscore is a one-character edit that reintroduces all of
     * that silently, which is exactly the class of regression this file exists for.
     */
    expect(idFor("/bitcoin/this-week")).toBe("/$slug_/this-week");
    expect(idFor("/ethereum/this-week")).toBe("/$slug_/this-week");
  });

  it("keeps the prefixed digest URL on the digest route", () => {
    // The redirect target must not itself be the redirect route.
    expect(idFor("/projects/bitcoin/this-week")).toBe(
      "/projects/$slug/this-week"
    );
  });
});
