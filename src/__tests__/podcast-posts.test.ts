import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import {
  PODCAST_HUB,
  PODCAST_HUB_FLOOR,
  byNewest,
  latestAired,
  podcastPostPath,
  readPodcastMeta,
  showsOf,
  toPodcastPost,
  toPodcastRow,
} from "../data/podcastPosts";
import { postPagePath, postPages } from "../data/postPages";
import { belongsInSitemap, indexStateFor } from "../seo/indexState";
import { podcastArticleHead, podcastHubHead } from "../seo/podcastHead";

/**
 * Podcast insight pages, read as posts. Only the transport is mocked: the
 * metadata reading, the filtering and the held list run for real, because those
 * are the parts that can be wrong without throwing, a run log shown as a page,
 * a draft on the site, or the hub's route swallowing every page under it.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

// The shape the agent writes, from the first drafts (26 October 2026).
const meta = (over: Record<string, unknown> = {}) => ({
  schema: 1,
  kind: "insight",
  episodes: [
    {
      itemId: "161971",
      show: "Unchained",
      title: "How Crypto Can Survive If AI or Quantum Computers Break Its Cryptography",
      publishedAt: "2026-10-21T04:49:00Z",
      pageUrl: "https://podcasts.apple.com/us/podcast/how-crypto-can-survive/id1123922160?i=1000797381971",
      timestamps: ["0:01:59", "0:48:15"],
    },
    {
      itemId: "161992",
      show: "ETH Daily - Ethereum News",
      title: "Glamsterdam Hoodi Upgrade Postponed",
      publishedAt: "2026-10-22T21:28:00Z",
      pageUrl: "https://ethdaily.io/glamsterdam-hoodi-upgrade-postponed",
      timestamps: ["0:01:52"],
    },
  ],
  quotes: [{ episodeId: "161971", at: "0:48:15", verbatim: "x", corrected: "x" }],
  topics: ["Project Eleven", "post-quantum cryptography", "ECDSA"],
  sourcesRead: [
    "https://thequantuminsider.com/2026/07/29/ai-finds-new-weaknesses-in-cryptographic-algorithms-anthropic-says/",
    "https://api.alphaday.com/items/podcasts/161971/",
  ],
  pilot: true,
  ...over,
});

const raw = (over: Record<string, unknown> = {}) => ({
  slug: "justin-drake-ai-not-quantum-may-be-first-to-break-cryptos-signatures",
  title: "Justin Drake: AI, not quantum, may be first to break crypto's signatures",
  excerpt: "Ethereum researcher Justin Drake warned that AI-driven cryptanalysis could break them first.",
  content: "The opening.\n\n## The argument\n\nA quote.\n\n## Where it was discussed\n\n- [Unchained: x](https://x.test), 21 October 2026",
  status: 1,
  type: "podcast-insight",
  published_at: "2026-10-29T09:00:00Z",
  modified: "2026-10-29T09:00:00Z",
  metadata: meta(),
  ...over,
});

describe("reading metadata", () => {
  it("reads the episodes in order, with the day each aired", () => {
    const read = readPodcastMeta(meta());
    expect(read.episodes.map((episode) => episode.show)).toEqual([
      "Unchained",
      "ETH Daily - Ethereum News",
    ]);
    expect(read.episodes[0]).toMatchObject({ itemId: "161971", aired: "2026-10-21" });
    expect(latestAired(read)).toBe("2026-10-22");
    expect(read.topics).toEqual(["Project Eleven", "post-quantum cryptography", "ECDSA"]);
  });

  it("names each show once", () => {
    const read = readPodcastMeta(
      meta({ episodes: [{ show: "Bankless" }, { show: "Unchained" }, { show: "Bankless" }] })
    );
    expect(showsOf(read)).toEqual(["Bankless", "Unchained"]);
  });

  it("drops an episode with no show, and an id or link it cannot use", () => {
    const read = readPodcastMeta(
      meta({
        episodes: [
          { title: "No show" },
          null,
          { show: "Unchained", itemId: "../posts/1", pageUrl: "javascript:alert(1)", publishedAt: "soon" },
          { show: "Bankless", itemId: 161980 },
        ],
      })
    );
    expect(read.episodes).toEqual([
      { itemId: null, show: "Unchained", title: null, aired: null, pageUrl: null },
      { itemId: "161980", show: "Bankless", title: null, aired: null, pageUrl: null },
    ]);
  });

  it("refuses our own API as a source", () => {
    expect(readPodcastMeta(meta()).sourcesRead).toEqual([
      "https://thequantuminsider.com/2026/07/29/ai-finds-new-weaknesses-in-cryptographic-algorithms-anthropic-says/",
    ]);
  });

  it("survives metadata that is missing or the wrong shape", () => {
    for (const bad of [null, undefined, "x", 3, [], { episodes: "x", topics: 4 }]) {
      const read = readPodcastMeta(bad);
      expect(read.episodes).toEqual([]);
      expect(read.topics).toEqual([]);
      expect(latestAired(read)).toBeNull();
    }
  });
});

describe("which posts are shown", () => {
  it("shows a published insight", () => {
    expect(toPodcastRow(raw())?.slug).toBe(raw().slug);
  });

  it("never shows a draft, an archived post, another type, or a bad slug", () => {
    expect(toPodcastRow(raw({ status: 2 }))).toBeNull();
    expect(toPodcastRow(raw({ status: 0 }))).toBeNull();
    expect(toPodcastRow(raw({ type: "governance-proposal" }))).toBeNull();
    expect(toPodcastRow(raw({ slug: "Not A Slug" }))).toBeNull();
  });

  it("never shows a run log, even published, and treats a missing or recased kind as an insight", () => {
    expect(toPodcastRow(raw({ metadata: meta({ kind: "run-log" }) }))).toBeNull();
    const { kind: _kind, ...noKind } = meta();
    expect(toPodcastRow(raw({ metadata: noKind }))).not.toBeNull();
    for (const kind of [null, "", " ", "Insight", " INSIGHT "]) {
      expect(toPodcastRow(raw({ metadata: meta({ kind }) }))).not.toBeNull();
    }
  });

  it("never shows a decline, by flag, by excerpt or by body", () => {
    expect(toPodcastRow(raw({ metadata: meta({ declined: true }) }))).toBeNull();
    expect(toPodcastRow(raw({ excerpt: "Declined: not an idea." }))).toBeNull();
    expect(toPodcastPost(raw({ content: "> DECLINED: an ad read, not an idea" }))).toBeNull();
    expect(toPodcastRow(raw({ excerpt: "Declined ETF filings are back in the news." }))).not.toBeNull();
  });

  it("strips a provenance block, and has no page for an empty body", () => {
    const post = toPodcastPost(raw({ content: "The opening.\n\n```alphaday-provenance\n{\"x\": 1}\n```" }));
    expect(JSON.stringify(post?.blocks)).not.toContain("alphaday-provenance");
    expect(toPodcastPost(raw({ content: "   " }))).toBeNull();
  });

  it("orders newest first, stably", () => {
    const rows = [
      toPodcastRow(raw({ slug: "older-one", published_at: "2026-10-01T00:00:00Z" }))!,
      toPodcastRow(raw({ slug: "b-newer" }))!,
      toPodcastRow(raw({ slug: "a-newer" }))!,
    ];
    expect(rows.sort(byNewest).map((row) => row.slug)).toEqual(["a-newer", "b-newer", "older-one"]);
  });
});

describe("where a page is read", () => {
  it("is under the podcast hub, which is promoted", () => {
    expect(postPagePath(raw())).toBe(podcastPostPath(raw().slug));
    expect(podcastPostPath("x-y")).toBe("/research/podcasts/x-y");
    expect(belongsInSitemap(indexStateFor(PODCAST_HUB))).toBe(true);
  });

  it("is in the sitemap once published, not as a draft, and a run log is unplaced", () => {
    const { pages, unplaced } = postPages([
      raw(),
      raw({ slug: "a-draft-one", status: 2 }),
      raw({ slug: "a-published-run-log", metadata: meta({ kind: "run-log" }) }),
    ]);
    expect(pages).toEqual([{ path: podcastPostPath(raw().slug), lastmod: "2026-10-29T09:00:00.000Z" }]);
    expect(unplaced).toBe(1);
  });

  it("lists the hub once it reaches its floor, dated by its newest page", () => {
    const pagesOf = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        raw({ slug: `idea-${i}`, modified: `2026-10-2${i}T09:00:00Z` })
      );
    expect(PODCAST_HUB_FLOOR).toBe(3);
    expect(postPages(pagesOf(2)).pages.map((page) => page.path)).not.toContain(PODCAST_HUB);
    expect(postPages(pagesOf(3)).pages).toContainEqual({
      path: PODCAST_HUB,
      lastmod: "2026-10-22T09:00:00.000Z",
    });
  });
});

describe("routes", () => {
  const router = createRouter({ routeTree });
  const idFor = (pathname: string) => {
    const matches = router.matchRoutes({ pathname, search: {} } as never);
    return matches[matches.length - 1]?.routeId;
  };

  it("gives the hub an index route and each idea its own", () => {
    expect(idFor("/research/podcasts")).toBe("/research/podcasts/");
    expect(idFor("/research/podcasts/justin-drake-ai")).toBe("/research/podcasts/$slug");
  });
});

describe("the head", () => {
  it("is an Article based on the episodes it quotes, citing its sources", () => {
    const post = toPodcastPost(raw())!;
    const head = podcastArticleHead({ article: { post, others: [] }, indexable: true });
    const text = JSON.stringify(head);
    expect(text).toContain(`${raw().title} | Alphaday`);
    expect(text).toContain(`https://alphaday.com/research/podcasts/${raw().slug}`);
    const ld = JSON.parse(head.scripts?.[0]?.children ?? "{}");
    expect(ld["@type"]).toBe("Article");
    expect(ld.isBasedOn).toHaveLength(2);
    expect(ld.isBasedOn[0]).toMatchObject({
      "@type": "PodcastEpisode",
      datePublished: "2026-10-21",
      partOfSeries: { "@type": "PodcastSeries", name: "Unchained" },
    });
    expect(ld.citation).toHaveLength(1);
    expect(ld.keywords).toContain("ECDSA");
  });

  it("is noindex with no canonical when the section is not promoted", () => {
    const post = toPodcastPost(raw())!;
    const text = JSON.stringify(podcastArticleHead({ article: { post, others: [] }, indexable: false }));
    expect(text).toContain("noindex");
    expect(text).not.toContain("canonical");
  });

  it("titles a later page of the hub as one", () => {
    const head = podcastHubHead({ hub: { rows: [], total: 25, page: 2, pages: 2 }, indexable: false });
    expect(JSON.stringify(head)).toContain("What crypto podcasts are arguing, page 2 | Alphaday");
  });
});

describe("reading the posts", () => {
  let list: Array<Record<string, unknown>>;
  let failing: boolean;
  let seen: string[];

  const other = (slug: string, show: string, published_at = "2026-10-29T09:00:00Z") =>
    raw({ slug, title: slug, published_at, metadata: meta({ episodes: [{ show, itemId: "1" }] }) });

  beforeEach(async () => {
    list = [
      raw(),
      other("bankless-idea", "Bankless"),
      other("older-unchained-idea", "unchained", "2026-10-01T00:00:00Z"),
      raw({ slug: "a-draft-one", status: 2 }),
      raw({ slug: "a-run-log", status: 0, metadata: meta({ kind: "run-log" }) }),
    ];
    failing = false;
    seen = [];
    const { fetchJsonSoft, fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      seen.push(url);
      return (failing ? null : { results: list, links: { next: null } }) as never;
    });
    vi.mocked(fetchWithRetry).mockImplementation(async (url: string) => {
      seen.push(url);
      if (failing) throw new Error("upstream down");
      const slug = url.split("/posts/")[1].replace(/\/$/, "");
      const found = list.find((row) => row.slug === slug);
      return (found ? { json: async () => found } : null) as never;
    });
    const { resetPodcastList } = await import("../server/podcasts");
    resetPodcastList();
  });

  afterEach(() => vi.useRealTimers());

  it("asks only for podcast insights", async () => {
    const { readPodcastList } = await import("../server/podcasts");
    await readPodcastList();
    expect(seen).toEqual(["https://api.test/posts/?type=podcast-insight&limit=100&page=1"]);
  });

  it("links a page to the same shows first, never to itself, a draft or a run log", async () => {
    const { buildPodcastArticle } = await import("../server/podcasts");
    const article = await buildPodcastArticle(raw().slug);
    expect(article?.others.map((row) => row.slug)).toEqual(["older-unchained-idea", "bankless-idea"]);
  });

  it("ships only what a link shows of each other page", async () => {
    const { buildPodcastArticle } = await import("../server/podcasts");
    const article = await buildPodcastArticle(raw().slug);
    expect(article?.others[0]).toEqual({
      slug: "older-unchained-idea",
      title: "older-unchained-idea",
      shows: ["unchained"],
    });
  });

  it("logs a listed post whose body it refuses, once per version, and 404s it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    list.push(raw({ slug: "an-empty-one", content: "```alphaday-provenance\n{}\n```" }));
    const { buildPodcastArticle, readPodcastList } = await import("../server/podcasts");
    expect((await readPodcastList()).rows.map((row) => row.slug)).toContain("an-empty-one");
    expect(await buildPodcastArticle("an-empty-one")).toBeNull();
    expect(await buildPodcastArticle("an-empty-one")).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("an-empty-one");
    warn.mockRestore();
  });

  it("answers a post at its own slug only", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementationOnce(async () => ({ json: async () => raw() }) as never);
    const { buildPodcastArticle } = await import("../server/podcasts");
    expect(await buildPodcastArticle("some-other-slug")).toBeNull();
  });

  it("does not walk a failing list again on every page view", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { fetchJsonSoft } = await import("../server/apiFetch");
    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      seen.push(url);
      return null as never;
    });
    const { buildPodcastArticle } = await import("../server/podcasts");
    expect((await buildPodcastArticle(raw().slug))?.others).toEqual([]);
    expect((await buildPodcastArticle(raw().slug))?.others).toEqual([]);
    expect(seen.filter((url) => url.includes("?type="))).toHaveLength(1);
    error.mockRestore();
  });

  it("says so when the list outgrows its cap, rather than failing like an outage", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const full = Array.from({ length: 100 }, (_, n) => raw({ slug: `idea-${n}` }));
    const { fetchJsonSoft } = await import("../server/apiFetch");
    vi.mocked(fetchJsonSoft).mockImplementation(
      async () => ({ results: full, links: { next: "https://api.test/next" } }) as never
    );
    const { buildPodcastHub } = await import("../server/podcasts");
    await expect(buildPodcastHub(1)).rejects.toThrow(/read short/);
    expect(error.mock.calls.map((call) => String(call[0]))).toContainEqual(
      expect.stringContaining("more than 2000 posts")
    );
    error.mockRestore();
  });

  it("is a 404 for a draft, a run log or a missing post, and a 5xx when the API fails", async () => {
    const { buildPodcastArticle } = await import("../server/podcasts");
    expect(await buildPodcastArticle("a-draft-one")).toBeNull();
    expect(await buildPodcastArticle("a-run-log")).toBeNull();
    expect(await buildPodcastArticle("no-such-post")).toBeNull();
    failing = true;
    await expect(buildPodcastArticle(raw().slug)).rejects.toThrow();
  });

  it("fails the hub when the read fails, rather than showing it short", async () => {
    failing = true;
    const { buildPodcastHub } = await import("../server/podcasts");
    await expect(buildPodcastHub(1)).rejects.toThrow(/read short/);
  });

  it("pages the hub newest first, and ends", async () => {
    list = Array.from({ length: 23 }, (_, n) =>
      raw({ slug: `idea-${String(n).padStart(2, "0")}`, published_at: `2026-10-${String(n + 1).padStart(2, "0")}T00:00:00Z` })
    );
    const { buildPodcastHub } = await import("../server/podcasts");
    const first = await buildPodcastHub(1);
    expect(first).toMatchObject({ page: 1, pages: 2, total: 23 });
    expect(first?.rows).toHaveLength(20);
    expect(first?.rows[0].slug).toBe("idea-22");
    expect((await buildPodcastHub(2))?.rows.map((row) => row.slug)).toEqual(["idea-02", "idea-01", "idea-00"]);
    expect(await buildPodcastHub(3)).toBeNull();
  });

  it("shows an empty first page, not a 404, before anything is published", async () => {
    list = [];
    const { buildPodcastHub } = await import("../server/podcasts");
    expect(await buildPodcastHub(1)).toEqual({ rows: [], total: 0, page: 1, pages: 1 });
  });
});
