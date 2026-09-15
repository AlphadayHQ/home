import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  belongsInSitemap,
  indexStateFor,
  staticPaths,
} from "../seo/indexState";

/**
 * Static routes are declared in exactly one place, and this asserts it stays
 * that way.
 *
 * `scripts/build-sitemap.mjs` used to keep its own array of the same paths.
 * The index-state gate already stopped a non-promoted route from being listed,
 * but nothing caught the reverse: a page promoted in `indexState.ts` and
 * forgotten in the sitemap's copy was silently never submitted to Google. That
 * is the failure mode the whole index-state module exists to prevent — the
 * sitemap and the page set derived from different sources — reproduced inside
 * the fix for it.
 *
 * Two properties, both cheap to check offline:
 *
 *  1. The sitemap builder reads `staticPaths()` rather than a literal list.
 *  2. Every promoted static path has a route file that can serve it, so the
 *     sitemap cannot advertise a URL the router answers with a 404.
 */

const routesDir = join(__dirname, "..", "routes");

describe("static route declaration", () => {
  it("is the sitemap's only source of static paths", () => {
    const sitemap = readFileSync(
      join(__dirname, "..", "..", "scripts", "build-sitemap.mjs"),
      "utf8"
    );

    expect(
      sitemap.includes("staticPaths()"),
      "build-sitemap.mjs must call staticPaths() from src/seo/indexState.ts"
    ).toBe(true);

    // The specific regression: a second hand-written list of the same routes.
    expect(
      /const\s+STATIC_PATHS\s*=\s*\[/.test(sitemap),
      "build-sitemap.mjs re-declares STATIC_PATHS; static routes belong in " +
        "src/seo/indexState.ts alone"
    ).toBe(false);
  });

  it("promotes only paths that have a route to serve them", () => {
    /*
     * TanStack's file convention: `/api/docs` is `api.docs.tsx`, `/` is
     * `index.tsx`. Flattening the filenames the same way lets this compare
     * declared paths against the files that actually exist, which is what
     * makes "the sitemap lists a URL that 404s" detectable here rather than
     * in Search Console six weeks later.
     *
     * Dynamic segments are the wrinkle. `mcp.$client.tsx` serves `/mcp/claude`,
     * `/mcp/cursor` and every other client, but flattening it literally yields
     * `/mcp/$client`, which matches no promoted path. The first version of this
     * test did exactly that, and the effect was that promoting any client page
     * failed with "no route file serves it" — the guard blocking the thing it
     * was meant to protect. Each `$segment` becomes a wildcard instead.
     */
    const patterns = readdirSync(routesDir)
      .filter((file) => /\.tsx$/.test(file) && !file.startsWith("__"))
      .map((file) => {
        const stem = file.replace(/\.tsx$/, "");
        if (stem === "index") return "/";
        return `/${stem.replace(/\.index$/, "").split(".").join("/")}`;
      })
      .map((route) => {
        if (!route.includes("$")) return { route, test: (p: string) => p === route };

        /*
         * A dynamic route only vouches for a promoted path if it is namespaced —
         * that is, its first segment is a literal. `/mcp/$client` genuinely
         * serves `/mcp/claude`. `/$slug` does not genuinely serve anything: it
         * is the root catch-all, and it answers 404 unless the API confirms a
         * landing page for that exact slug. Letting it match would make this
         * assertion pass for any single-segment path anyone promoted, which is
         * the whole failure it exists to catch.
         */
        const segments = route.split("/").filter(Boolean);
        if (segments[0]?.startsWith("$")) return { route, test: () => false };

        const source = route
          .split("/")
          .map((seg) =>
            seg === "$"
              ? ".*" // splat: swallows the remainder
              : seg.startsWith("$")
                ? "[^/]+" // param: exactly one segment
                : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          )
          .join("/");
        const re = new RegExp(`^${source}$`);
        return { route, test: (p: string) => re.test(p) };
      });

    for (const path of staticPaths()) {
      if (!belongsInSitemap(indexStateFor(path))) continue;
      expect(
        patterns.some(({ test }) => test(path)),
        `${path} is promoted but no route file serves it`
      ).toBe(true);
    }
  });
});
