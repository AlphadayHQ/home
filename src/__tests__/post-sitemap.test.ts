import { beforeEach, describe, expect, it, vi } from "vitest";
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

  beforeEach(async () => {
    pages = {
      "https://api.test/posts/?limit=100": page(
        [post(), post({ slug: "a-draft", status: 2 })],
        "https://api.test/posts/?limit=100&page=2"
      ),
      "https://api.test/posts/?limit=100&page=2": page([
        post({ slug: "bitget-exploit-analysis", modified: "2026-10-12T00:00:00Z" }),
        post({ slug: "a-narrative", type: "trending-narrative" }),
      ]),
    };
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(async (url: string) => {
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
