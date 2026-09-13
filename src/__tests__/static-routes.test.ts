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
     */
    const served = new Set(
      readdirSync(routesDir)
        .filter((file) => /\.tsx$/.test(file) && !file.startsWith("__"))
        .map((file) => {
          const stem = file.replace(/\.tsx$/, "");
          if (stem === "index") return "/";
          return `/${stem.replace(/\.index$/, "").split(".").join("/")}`;
        })
    );

    for (const path of staticPaths()) {
      if (!belongsInSitemap(indexStateFor(path))) continue;
      expect(
        served.has(path),
        `${path} is promoted but no route file serves it`
      ).toBe(true);
    }
  });
});
