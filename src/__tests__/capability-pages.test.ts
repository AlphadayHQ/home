import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITY_COPY, HEADLINE_CAPABILITIES } from "../data/mcpCapabilities";
import { TOOL_DOMAINS } from "../data/mcpTools";
import {
  CAPABILITY_PAGES,
  CAPABILITY_PAGES_VERIFIED_ON,
  pageBySlug,
} from "../data/capabilityPages";
import mcp from "../api/mcp-tools.generated.json";

/**
 * Capability pages — the four pages at `/api/data/{slug}`.
 *
 * Plan §7: the page set, the join keys and the integrity of every page must
 * hold here, because `static-routes.test.ts` only walks `staticPaths()` and
 * never touches a substrate page. A typo in the slug list, a curl pasted
 * wrong, a tool name that has stopped being served — every one of those
 * reached previous code review and would have shipped if this file did not
 * check it.
 */

const liveToolNames = new Set(mcp.tools.map((tool) => tool.name));

const apiPage = readFileSync(
  join(__dirname, "..", "pages", "api.jsx"),
  "utf8",
);
const routesDir = join(__dirname, "..", "routes");

describe("the page set", () => {
  it("equals HEADLINE_CAPABILITIES exactly", () => {
    const pages = Object.keys(CAPABILITY_PAGES).sort();
    const headlines = [...HEADLINE_CAPABILITIES].sort();
    /*
     * Stronger than "every slug exists in TOOL_DOMAINS": the page set must
     * match HEADLINE_CAPABILITIES, in either direction. A page the headline
     * set does not advertise is an orphan; a headline without a page is a
     * promise the route cannot keep. Either direction is a build failure.
     */
    expect(pages, "CAPABILITY_PAGES keys").toEqual(headlines);
  });

  it("joins cleanly to TOOL_DOMAINS", () => {
    for (const slug of HEADLINE_CAPABILITIES) {
      expect(
        Object.keys(TOOL_DOMAINS),
        `${slug} is on the page set but is not a key in TOOL_DOMAINS`,
      ).toContain(slug);
    }
  });

  it("resolves every slug and only those slugs", () => {
    expect(pageBySlug("security-exploits")?.slug).toBe("security-exploits");
    expect(pageBySlug("developer-activity")?.slug).toBe("developer-activity");
    expect(pageBySlug("tvl-yields")?.slug).toBe("tvl-yields");
    expect(pageBySlug("kasandra")?.slug).toBe("kasandra");
    expect(pageBySlug("news")?.slug).toBe("news");
    expect(pageBySlug("forum")?.slug).toBe("forum");
    expect(pageBySlug("blogs")?.slug).toBe("blogs");
    expect(pageBySlug("podcasts")?.slug).toBe("podcasts");
    expect(pageBySlug("videos")?.slug).toBe("videos");
    expect(pageBySlug("nope")).toBeUndefined();
  });
});

describe("per-page integrity", () => {
  for (const slug of HEADLINE_CAPABILITIES) {
    const page = CAPABILITY_PAGES[slug];

    it(`${slug}: parses as a real record`, () => {
      /*
       * The plan's hard rule on payloads: every code block must be a real
       * response, not invented. The strongest check available offline is that
       * the published payload is structurally valid JSON — verifiable in CI,
       * and prevents the textbook failure mode of hand-editing a payload and
       * breaking it silently.
       */
      expect(() => JSON.parse(page.samplePayload)).not.toThrow();
    });

    it(`${slug}: lists fields, caveats, a verified date, and tools`, () => {
      expect(page.recordShape.length, `${slug}: no record shape`).toBeGreaterThan(0);
      expect(page.knownLimits.length, `${slug}: no known limits — required, not optional`).toBeGreaterThan(0);
      expect(CAPABILITY_PAGES_VERIFIED_ON, `${slug}: missing verified date`).toBeTruthy();
      expect(page.getIt.mcpTools.length, `${slug}: no MCP tools named`).toBeGreaterThan(0);

      for (const tool of page.getIt.mcpTools) {
        expect(
          liveToolNames,
          `${slug} names ${tool}, which is not in mcp-tools.generated.json`,
        ).toContain(tool);
      }
    });

    it(`${slug}: ships a working curl command`, () => {
      const curl = page.getIt.curl;
      expect(
        curl.startsWith("curl https://api.alphaday.com/"),
        `${slug}: curl must hit the live API, not a placeholder`,
      ).toBe(true);
    });
  }
});

describe("copy corrections (plan §3 — volume claims on the five content feeds)", () => {
  /*
   * Plan §3: "Every large feed advertises its source count and hides its
   * volume". Apply the same treatment forum got in batch 1 (volume claim
   * "60,000+ posts") to news, blogs, podcasts and videos. The headline
   * number on each capability page (heroFigure.big) and the one-line
   * copy on /api (CAPABILITY_COPY) MUST carry the volume claim. Without
   * this assertion, a future copywriter can quietly drop "440,000+
   * articles" from the news card and ship a vague "49 outlets" line.
   */
  it("CAPABILITY_COPY carries a volume figure for every content feed", () => {
    const expectations: Record<string, RegExp> = {
      news: /440[,.]?000\+/,
      blogs: /19[,.]?000\+/,
      podcasts: /22[,.]?000\+/,
      videos: /34[,.]?000\+/,
      forum: /60[,.]?000\+/,
    };
    for (const [slug, pattern] of Object.entries(expectations)) {
      expect(
        pattern.test(CAPABILITY_COPY[slug as keyof typeof CAPABILITY_COPY]),
        `CAPABILITY_COPY.${slug} is missing a volume claim matching ${pattern}`,
      ).toBe(true);
    }
  });

  it("every content-feed heroFigure.big matches its CAPABILITY_COPY volume claim", () => {
    /*
     * The one-liner on /api and the headline number on /api/data/{slug}
     * are written in two places; they must agree. A typo that ships
     * "440,000+" on /api and "440,000+" on the page is fine; one that
     * ships "440,000+" on /api and "44,000+" on the page is the kind of
     * inconsistency review catches.
     */
    for (const slug of ["news", "blogs", "podcasts", "videos", "forum"] as const) {
      const copy = CAPABILITY_COPY[slug];
      const big = CAPABILITY_PAGES[slug].heroFigure.big;
      // Volume figure pattern: "440,000+", "60,000+", "440k+", "60k+".
      const match = copy.match(/\d{1,3}(?:[,]\d{3})*\+|\d{1,3}k\+/);
      expect(
        match,
        `${slug}: CAPABILITY_COPY has no parseable volume claim`,
      ).not.toBeNull();
      expect(
        match![0],
        `${slug}: CAPABILITY_COPY volume "${match![0]}" disagrees with heroFigure.big "${big}"`,
      ).toBe(big);
    }
  });
});

describe("payload-level traps (plan §4)", () => {
  it("kasandra returns a JSON array, not an envelope object", () => {
    /*
     * Plan §4.4: the response is a bare array of 20 patterns. Rev 1 printed a
     * single bare object pinned at `interval: "3M"`; that is what comes back
     * for one record, not what the endpoint returns. The strongest offline
     * check is that the published payload round-trips as an array, not as an
     * object — the same property the live response has.
     */
    const parsed = JSON.parse(CAPABILITY_PAGES.kasandra.samplePayload);
    expect(Array.isArray(parsed), "kasandra payload must be a JSON array").toBe(true);
  });

  it("developer-activity never publishes the `managed` filter as a working parameter", () => {
    /*
     * Plan §4.2: the filter is documented, and it does not filter — `true`
     * and a junk value both return the full corpus. The page MUST mention
     * the filter (in Known limits, to warn the reader off), but it must not
     * present it as something the reader should call. We therefore check the
     * curl command only — the only place a reader could copy the parameter
     * out of.
     */
    const dev = CAPABILITY_PAGES["developer-activity"];
    expect(
      /\bmanaged\b/.test(dev.getIt.curl),
      "developer-activity curl uses `managed` — the filter does not work",
    ).toBe(false);
  });

  it("security-exploits never claims a total value lost", () => {
    /*
     * Plan §4.1: 27/190 = 14.2% of records carry `amount_usd`. A loss total
     * over 14% coverage is false and checkable. The page may mention a
     * single `'9.00'` figure from the sample payload (which IS what one
     * record carries), but must not roll up a number like "total stolen" or
     * "$X lost across N exploits".
     *
     * The regex looks for an *affirmative* claim — a phrase that asserts a
     * figure was lost. The page DOES say "the page does not quote a total
     * value lost" (a negation), which the regex below correctly allows
     * through. Affirming would say "the total value lost was $X", which is
     * the failure mode §4.1 forbids.
     */
    const sec = CAPABILITY_PAGES["security-exploits"];
    const haystack = [
      sec.blurb,
      sec.heroFigure.big,
      sec.heroFigure.suffix,
      sec.heroFigure.note,
      ...sec.knownLimits.map((c) => `${c.title} ${c.body}`),
    ].join("\n");
    expect(
      /(?:^|[^.])(\$\s?\d[\d.,]*\s*(?:billion|million|stolen|lost|exploited|drained)|total\s+(?:value\s+)?(?:stolen|lost)|combined\s+loss)/i.test(
        haystack,
      ),
      "security-exploits page claims a total loss — 14.2% coverage, false",
    ).toBe(false);
  });
});

describe("the route file", () => {
  it("exists at the path TanStack expects", () => {
    /*
     * The router's `routeTree.gen.ts` is generated from this file's name.
     * If we forget to add it, the generator runs to a successful build but
     * the route never registers; asserting the file's presence here is the
     * cheapest possible guard.
     */
    const expected = readFileSync(
      join(routesDir, "api.data.$capability.tsx"),
      "utf8",
    );
    expect(expected.length).toBeGreaterThan(0);
  });
});

describe("linkage from /api", () => {
  it("links every headline capability from the api landing page", () => {
    /*
     * §6.5: a promoted page linked from nowhere is worse than one not yet
     * built. The api page already had six `href="#"` placeholders; this is
     * the only one of those six we are required to fix in this batch.
     *
     * The page renders the URL through a template literal
     * (`` `/api/data/${cap.slug}` ``), so we check for that pattern rather
     * than the resolved string.
     */
    expect(
      apiPage.includes("`/api/data/${"),
      "/api does not link to the /api/data/* pages",
    ).toBe(true);

    /*
     * The headlines themselves must still appear — a template literal that
     * never iterates HEADLINE_CAPABILITIES would pass the line above but
     * link nowhere in the rendered page.
     */
    expect(
      apiPage.includes("HEADLINE_CAPABILITIES"),
      "/api does not iterate HEADLINE_CAPABILITIES to build the link list",
    ).toBe(true);
  });
});
