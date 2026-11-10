import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITEMAP_FILES, urlsetXml } from "../seo/sitemapXml";

/**
 * `/sitemaps/posts.xml` is built on request so a published post reaches search
 * without a deploy. These pin that it lists what the pages agree with, that a
 * failed read is refused rather than served short, and that the index lists it.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchWithRetry: vi.fn(),
}));

const post = (overrides: Record<string, unknown> = {}) => ({
  slug: "meter-exploit-analysis",
  title: "Meter exploit analysis",
  status: 1,
  type: "exploit-analysis",
  published_at: "2026-10-07T19:18:10Z",
  modified: "2026-10-14T08:00:00Z",
  metadata: { schema: 1, incidentId: 200, kind: "reported" },
  ...overrides,
});

const page = (results: unknown[], next: string | null = null) => ({
  json: async () => ({ results, links: { next } }),
});

describe("the live post sitemap", () => {
  let pages: Record<string, unknown>;
  let calls: string[];

  // Unconditional, so a failing test cannot leave console.error silenced.
  afterEach(() => vi.mocked(console.error).mockRestore?.());

  beforeEach(async () => {
    calls = [];
    const { resetPostSitemap } = await import("../server/postSitemap");
    resetPostSitemap();
    pages = {
      "https://api.test/posts/?limit=100": page(
        [post(), post({ slug: "a-draft", status: 2 })],
        "https://api.test/posts/?limit=100&page=2"
      ),
      "https://api.test/posts/?limit=100&page=2": page([
        post({ slug: "bitget-exploit-analysis", modified: "2026-10-12T00:00:00Z" }),
        post({ slug: "a-newsletter", type: "newsletter" }),
      ]),
    };
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(async (url: string) => {
      calls.push(url);
      const found = pages[url];
      if (found instanceof Error) throw found;
      return (found ?? null) as never;
    });
  });

  it("walks every page and lists each published post where it is read", async () => {
    const { buildPostSitemap } = await import("../server/postSitemap");
    const { xml, urls, unplaced } = await buildPostSitemap();
    expect(urls).toBe(2);
    expect(unplaced).toBe(1);
    expect(xml).toContain("<loc>https://alphaday.com/security/exploits/meter-exploit-analysis</loc>");
    expect(xml).toContain("<lastmod>2026-10-14T08:00:00.000Z</lastmod>");
    expect(xml).toContain("bitget-exploit-analysis");
    expect(xml).not.toContain("a-draft");
  });

  it("refuses a failed read rather than serving a short sitemap", async () => {
    pages["https://api.test/posts/?limit=100&page=2"] = new Error("upstream down");
    const { buildPostSitemap } = await import("../server/postSitemap");
    await expect(buildPostSitemap()).rejects.toThrow();
  });

  it("refuses to walk past the page cap rather than truncate", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    // Every page points at another: an endless list.
    vi.mocked(fetchWithRetry).mockImplementation(
      async (url: string) => page([post()], `${url}x`) as never
    );
    const { buildPostSitemap, MAX_PAGES } = await import("../server/postSitemap");
    await expect(buildPostSitemap()).rejects.toThrow(/refusing a truncated sitemap/);
    expect(vi.mocked(fetchWithRetry).mock.calls.length).toBe(MAX_PAGES);
  });

  it("answers XML with the edge cache headers", async () => {
    const { postSitemapResponse } = await import("../server/postSitemap");
    const res = await postSitemapResponse();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toContain("stale-if-error");
    expect(await res.text()).toContain("<urlset");
  });

  /*
   * A 503 with no-store is what lets the edge keep its last good copy. A 200
   * with a short list would replace it.
   */
  it("answers an uncached 503 when it has never read the list", async () => {
    pages["https://api.test/posts/?limit=100"] = new Error("upstream down");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { postSitemapResponse } = await import("../server/postSitemap");
    const res = await postSitemapResponse();
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Retry-After")).toBe("300");
  });

  describe("held between requests", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
    });
    afterEach(() => vi.useRealTimers());

    it("walks the list once for concurrent and repeated requests", async () => {
      const { readPostSitemap } = await import("../server/postSitemap");
      await Promise.all([readPostSitemap(), readPostSitemap(), readPostSitemap()]);
      await readPostSitemap();
      expect(calls).toHaveLength(2);
    });

    it("answers a stale read at once and rebuilds behind it", async () => {
      const { readPostSitemap, FRESH_MS } = await import("../server/postSitemap");
      const first = await readPostSitemap();
      pages["https://api.test/posts/?limit=100"] = page([post()]);
      vi.setSystemTime(Date.now() + FRESH_MS);

      expect(await readPostSitemap()).toEqual(first);
      await vi.advanceTimersByTimeAsync(0);
      expect((await readPostSitemap()).urls).toBe(1);
    });

    it("keeps serving the held one when a rebuild fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { readPostSitemap, FRESH_MS } = await import("../server/postSitemap");
      const first = await readPostSitemap();
      pages["https://api.test/posts/?limit=100"] = new Error("upstream down");
      vi.setSystemTime(Date.now() + FRESH_MS);

      expect(await readPostSitemap()).toEqual(first);
      await vi.advanceTimersByTimeAsync(0);
      expect(await readPostSitemap()).toEqual(first);
    });

    it("logs a failed rebuild once, however many requests share it", async () => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      const { readPostSitemap, FRESH_MS } = await import("../server/postSitemap");
      await readPostSitemap();
      pages["https://api.test/posts/?limit=100"] = new Error("upstream down");
      vi.setSystemTime(Date.now() + FRESH_MS);

      await Promise.all(Array.from({ length: 20 }, () => readPostSitemap()));
      await vi.advanceTimersByTimeAsync(0);
      expect(errors).toHaveBeenCalledTimes(1);
    });
  });
});

describe("the sitemap index", () => {
  it("lists the live posts file beside the two built at deploy", () => {
    expect(SITEMAP_FILES).toEqual([
      "https://alphaday.com/sitemaps/pages.xml",
      "https://alphaday.com/sitemaps/projects.xml",
      "https://alphaday.com/sitemaps/posts.xml",
    ]);
  });

  it("escapes what it writes and omits an unknown lastmod", () => {
    const xml = urlsetXml([{ loc: "https://alphaday.com/a?b=1&c=2" }]);
    expect(xml).toContain("<loc>https://alphaday.com/a?b=1&amp;c=2</loc>");
    expect(xml).not.toContain("<lastmod>");
  });
});
