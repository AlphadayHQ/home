import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  belongsInSitemap,
  indexStateFor,
  staticPaths,
} from "../seo/indexState";
import { digestPaths } from "../data/digestEntities.js";
import { capabilityPaths } from "../data/capabilityPages.js";
import { recipePaths } from "../data/cookbook.js";
import { mcpClientPaths } from "../data/mcpClients.js";

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

/**
 * The digest tier's recrawl signal.
 *
 * `/projects/{slug}/this-week` shipped with no `lastmod` at all — the one tier
 * on the site whose entire value is recency, giving Google nothing to schedule
 * a recrawl from. These assert the two halves of the fix, because both are easy
 * to undo by accident.
 */
describe("the digest tier's lastmod", () => {
  const sitemap = readFileSync(
    join(__dirname, "..", "..", "scripts", "build-sitemap.mjs"),
    "utf8"
  );

  /*
   * A digest path absent from `staticPaths()` would be listed nowhere and
   * stamped with nothing, silently. `indexState.ts` derives them from
   * `DIGEST_ENTITIES` precisely so that cannot happen — this is the assertion
   * that the derivation is still wired up.
   */
  it("covers every digest path, and all of them are promoted", () => {
    const paths = new Set(staticPaths());
    for (const path of digestPaths()) {
      expect(paths.has(path), `${path} is missing from staticPaths()`).toBe(true);
      expect(
        belongsInSitemap(indexStateFor(path)),
        `${path} is not promoted, so it would never be listed`
      ).toBe(true);
    }
  });

  it("stamps them from digestPaths rather than a second list", () => {
    expect(
      sitemap.includes("digestPaths"),
      "build-sitemap.mjs must derive the rolling set from digestPaths()"
    ).toBe(true);
  });

  /*
   * The regression that would cost more than the bug did. `urlsetXml`'s own
   * comment records why: a `lastmod` that moves on every build trains Google to
   * ignore the field, so a well-meaning change to `new Date().toISOString()`
   * would not just fail to help, it would disarm the signal for the whole tier.
   * Truncating to the UTC day is what makes two builds on one day agree.
   */
  it("truncates to the day so rebuilding does not churn the value", () => {
    const rolling = sitemap.match(/const rollingLastmod = [^;]+;/);
    expect(rolling, "rollingLastmod() is gone").not.toBeNull();
    expect(
      rolling?.[0].includes("slice(0, 10)"),
      "rollingLastmod must truncate to the UTC day, not stamp the build instant"
    ).toBe(true);
    expect(rolling?.[0]).toMatch(/T00:00:00/);
  });
});

/**
 * The Engine A tiers.
 *
 * These shipped behind `noindex` on purpose, waiting on the SSR cutover, and
 * then stayed there for four days after it landed because the hold was a
 * comment rather than anything executable. That is the regression worth a test:
 * not "are they promoted today" — one edit did that — but "is each tier still
 * derived from the data that builds it", so a page added to any of the three
 * cannot ship invisible the way all 36 just did.
 */
describe("the Engine A tiers", () => {
  const tiers = [
    ["capability", capabilityPaths, "/api/data/", 22],
    ["cookbook", recipePaths, "/cookbook/", 6],
    ["mcp client", mcpClientPaths, "/mcp/", 8],
  ] as const;

  it.each(tiers)("promotes every %s page", (_label, paths, prefix, count) => {
    const declared = new Set(staticPaths());
    const tierPaths = paths();

    // A count assertion looks redundant next to the loop below, but it is the
    // half that catches an empty derivation: `paths()` returning [] would make
    // every other assertion here pass vacuously.
    expect(tierPaths).toHaveLength(count);

    for (const path of tierPaths) {
      expect(path.startsWith(prefix), `${path} is not under ${prefix}`).toBe(true);
      expect(declared.has(path), `${path} is missing from staticPaths()`).toBe(true);
      expect(
        belongsInSitemap(indexStateFor(path)),
        `${path} is not promoted, so it would be noindex and in no sitemap`
      ).toBe(true);
    }
  });

  /*
   * The hub pages are promoted by hand in STATIC_STATES while their children are
   * derived. Promoting a child set and forgetting its hub would leave the tier
   * reachable only from the sitemap, so assert the pair.
   */
  it.each([["/api"], ["/cookbook"], ["/mcp"]])("keeps %s promoted as the hub", (hub) => {
    expect(belongsInSitemap(indexStateFor(hub))).toBe(true);
  });

  it("derives all three from their data modules rather than a second list", () => {
    const source = readFileSync(
      join(__dirname, "..", "seo", "indexState.ts"),
      "utf8"
    );
    for (const fn of ["capabilityPaths", "recipePaths", "mcpClientPaths"]) {
      expect(source.includes(`${fn}()`), `indexState.ts must call ${fn}()`).toBe(true);
    }
  });
});
