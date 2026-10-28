import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HUB_PAGE_SIZE,
  TRENDING_HUB,
  TRENDING_HUB_FLOOR,
  UPDATES_PAGE_SIZE,
  checkTrendingPost,
  groupTopics,
  pageOf,
  parsePage,
  toTrendingRow,
} from "../data/trending";
import type { TrendingRow } from "../data/trending";
import { toExploitRow } from "../data/exploitPosts";
import { POST_HUBS, postPagePath, postPages } from "../data/postPages";
import { indexStateFor } from "../seo/indexState";
import { trendingArticleHead, trendingHubHead } from "../seo/trendingHead";

/**
 * Trending topic pages (B3), read as posts.
 *
 * These pin that a topic is one page at its post's slug, with its updates shown
 * on it newest first and never given a URL of their own; that the hub and the
 * sitemap are built from the list rows alone; that a topic page opens only the
 * posts it shows; and that a failed read is an error, never a smaller page.
 *
 * Only the transport is mocked.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

const meta = (over: Record<string, unknown> = {}) => ({
  schema: 1,
  tag: "xrpl",
  topic: "XRP",
  kind: "page",
  sourcesRead: ["https://example.com/a", "https://api.alphaday.com/v1/items/news/"],
  ...over,
});

const post = (overrides: Record<string, unknown> = {}) => ({
  slug: "xrp-narrative",
  title: "XRP narrative",
  excerpt: "Ripple's court win reopens the US market.",
  status: 1,
  type: "trending-narrative",
  published_at: "2026-10-01T09:00:00Z",
  modified: "2026-10-01T09:00:00Z",
  metadata: meta(),
  content: "## What happened\n\nWords, with a [source](https://example.com/a).",
  ...overrides,
});

/** An update on `parent`, published on `day` of October. */
const update = (parent: string, day: number, over: Record<string, unknown> = {}) => {
  const at = `2026-10-${String(day).padStart(2, "0")}T09:00:00Z`;
  return post({
    slug: `${parent}-update-${day}`,
    title: `Update of ${day} October`,
    excerpt: `What changed on ${day} October.`,
    published_at: at,
    modified: at,
    metadata: meta({ kind: "update", updates: parent, sourcesRead: [`https://example.com/${day}`] }),
    content: `Something new on ${day} October.`,
    ...over,
  });
};

const row = (raw: Record<string, unknown>): TrendingRow => {
  const shaped = toTrendingRow(raw);
  if (!shaped) throw new Error("fixture is not a row");
  return shaped;
};

describe("trending posts, from their list rows", () => {
  it("reads a page from its row, and drops our own API from its sources", () => {
    expect(toTrendingRow(post())).toMatchObject({
      slug: "xrp-narrative",
      kind: "page",
      parent: null,
      topic: "XRP",
      sourcesRead: ["https://example.com/a"],
    });
  });

  it("names the topic from the title when the metadata does not", () => {
    expect(toTrendingRow(post({ metadata: meta({ topic: null }) }))?.topic).toBe("XRP");
  });

  it("shows only published posts of its type, and no decline", () => {
    expect(toTrendingRow(post({ status: 2 }))).toBeNull();
    expect(toTrendingRow(post({ status: 0 }))).toBeNull();
    expect(toTrendingRow(post({ type: "exploit-analysis" }))).toBeNull();
    expect(toTrendingRow(post({ metadata: meta({ declined: true }) }))).toBeNull();
    expect(toTrendingRow(post({ excerpt: "Declined: not a topic." }))).toBeNull();
  });

  it("does not take a real excerpt that starts with the word for a decline", () => {
    expect(toTrendingRow(post({ excerpt: "Declined ETF applications pile up." }))).not.toBeNull();
  });

  it("makes a page only of a post whose kind says so, and guesses no kind", () => {
    for (const kind of ["updates", "Update", "PAGE", "", null, undefined]) {
      expect(toTrendingRow(post({ metadata: meta({ kind }) }))).toBeNull();
    }
    expect(toTrendingRow(post({ metadata: null }))).toBeNull();
  });

  it("drops an update that names no page", () => {
    expect(toTrendingRow(update("xrp-narrative", 5, { metadata: meta({ kind: "update" }) }))).toBeNull();
    expect(toTrendingRow(update("xrp-narrative", 5))).toMatchObject({
      kind: "update",
      parent: "xrp-narrative",
    });
  });

  it("never mistakes an exploit analysis for a trending post, or the reverse", () => {
    expect(toExploitRow(post())).toBeNull();
  });

  it("refuses a body that is a decline or renders nothing, and says which", () => {
    expect(checkTrendingPost(post({ content: "> DECLINED: not a topic" }))).toEqual({
      problem: "its body is a decline",
    });
    expect(checkTrendingPost(post({ content: "  " }))).toEqual({ problem: "its body is empty" });
    expect("post" in checkTrendingPost(post())).toBe(true);
  });
});

describe("topics", () => {
  it("puts each update on its page, newest first, and dates the topic by it", () => {
    const { topics, orphans } = groupTopics([
      row(update("xrp-narrative", 5)),
      row(post()),
      row(update("xrp-narrative", 9)),
    ]);
    expect(orphans).toEqual([]);
    expect(topics).toHaveLength(1);
    expect(topics[0].updates.map((u) => u.slug)).toEqual([
      "xrp-narrative-update-9",
      "xrp-narrative-update-5",
    ]);
    expect(topics[0].latest).toBe("2026-10-09T09:00:00.000Z");
  });

  it("orders topics by their newest change, an update included", () => {
    const { topics } = groupTopics([
      row(post()),
      row(post({ slug: "sui-narrative", title: "Sui narrative", modified: "2026-10-07T00:00:00Z" })),
      row(update("xrp-narrative", 8)),
    ]);
    expect(topics.map((t) => t.page.slug)).toEqual(["xrp-narrative", "sui-narrative"]);
  });

  it("counts an update whose page is not published, rather than place it", () => {
    const { topics, orphans } = groupTopics([row(update("gone-narrative", 5))]);
    expect(topics).toEqual([]);
    expect(orphans.map((o) => o.slug)).toEqual(["gone-narrative-update-5"]);
  });

  it("compares times as instants, not as strings", () => {
    const { topics } = groupTopics([
      row(post({ modified: "2026-10-10T09:00:00+02:00" })),
      row(post({ slug: "sui-narrative", title: "Sui narrative", modified: "2026-10-10T08:30:00Z" })),
    ]);
    expect(topics[0].page.slug).toBe("sui-narrative");
  });
});

describe("pages", () => {
  it("reads ?page= as a whole number from 1, and nothing else", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage(2)).toBe(2);
    expect(parsePage("3")).toBe(3);
    for (const bad of [0, -1, 1.5, "01", "abc", "", null, "1e3"]) expect(parsePage(bad)).toBeNull();
  });

  it("has a first page however short the list, and none past the last", () => {
    expect(pageOf([], 1, 10)).toEqual([]);
    expect(pageOf([1, 2, 3], 2, 2)).toEqual([3]);
    expect(pageOf([1, 2, 3], 3, 2)).toBeNull();
  });
});

describe("the sitemap", () => {
  const topic = (name: string, modified: string) =>
    post({ slug: `${name}-narrative`, title: `${name} narrative`, modified, metadata: meta({ topic: name }) });

  it("places a page at its own slug, and an update nowhere of its own", () => {
    expect(postPagePath(post())).toBe("/research/trending/xrp-narrative");
    expect(postPagePath(update("xrp-narrative", 5))).toBeNull();
  });

  it("lists a topic once, dated by its newest update", () => {
    const { pages, unplaced } = postPages([post(), update("xrp-narrative", 9), update("xrp-narrative", 5)]);
    expect(unplaced).toBe(0);
    expect(pages).toEqual([
      { path: "/research/trending/xrp-narrative", lastmod: "2026-10-09T09:00:00.000Z" },
    ]);
  });

  it("counts an update whose page is not published as unplaced", () => {
    const { pages, unplaced } = postPages([update("gone-narrative", 5)]);
    expect(pages).toEqual([]);
    expect(unplaced).toBe(1);
  });

  it("lists the hub only once enough topics are written up", () => {
    const two = [topic("aave", "2026-10-11T00:00:00Z"), topic("sui", "2026-10-13T00:00:00Z")];
    // Updates are not topics, and do not count toward the floor.
    const updates = [update("sui-narrative", 14), update("sui-narrative", 15)];
    expect(postPages([...two, ...updates]).pages.map((p) => p.path)).not.toContain(TRENDING_HUB);

    const { pages } = postPages([...two, ...updates, topic("etf", "2026-10-12T00:00:00Z")]);
    expect(TRENDING_HUB_FLOOR).toBe(3);
    expect(pages).toContainEqual({ path: TRENDING_HUB, lastmod: "2026-10-15T09:00:00.000Z" });
  });

  it("places nothing for a type that names an inherited property", () => {
    for (const type of ["constructor", "toString", "__proto__"]) {
      expect(postPagePath(post({ type }))).toBeNull();
    }
  });

  it("lists live only promoted hubs", () => {
    // `scripts/build-sitemap.mjs` leaves these same paths out of pages.xml, and
    // `postPages` checks the state itself, so a demotion there takes them out.
    expect(POST_HUBS.map((hub) => hub.path)).toEqual([TRENDING_HUB, "/research/podcasts"]);
    for (const hub of POST_HUBS) expect(indexStateFor(hub.path)).toBe("promoted");
  });
});

describe("reading the pages", () => {
  let posts: Array<Record<string, unknown> | null>;
  let listDown: boolean;
  /** What opening a post returns, where it differs from its list row. */
  let detail: Record<string, unknown>;
  let seen: string[];

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T12:00:00Z"));
    posts = [
      post(),
      update("xrp-narrative", 5),
      update("xrp-narrative", 9),
      post({
        slug: "sui-narrative",
        title: "Sui narrative",
        modified: "2026-10-07T00:00:00Z",
        metadata: meta({ topic: "Sui" }),
      }),
      post({ slug: "aave-narrative", title: "Aave narrative", status: 2 }),
      null,
    ];
    listDown = false;
    detail = {};
    seen = [];

    const { fetchJsonSoft, fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      seen.push(url);
      // List rows carry no body.
      const rows = posts.map((p) => {
        if (!p) return p;
        const { content: _content, ...listed } = p;
        return listed;
      });
      return (listDown ? null : { results: rows, links: { next: null } }) as never;
    });
    vi.mocked(fetchWithRetry).mockImplementation(async (url: string) => {
      seen.push(url);
      const slug = url.split("/posts/")[1].replace(/\/$/, "");
      const found = slug in detail ? detail[slug] : posts.find((p) => p?.slug === slug);
      if (found instanceof Error) throw found;
      return (found ? { json: async () => found } : null) as never;
    });

    const { resetTrending } = await import("../server/trending");
    resetTrending();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const opens = () => seen.filter((url) => /\/posts\/[^?]+\/$/.test(url));

  it("builds the hub from one list, without opening any post", async () => {
    const { buildTrendingHub } = await import("../server/trending");
    const hub = await buildTrendingHub(1);
    expect(hub?.rows.map((r) => [r.slug, r.lead, r.updates])).toEqual([
      ["xrp-narrative", "What changed on 9 October.", 2],
      ["sui-narrative", "Ripple's court win reopens the US market.", 0],
    ]);
    expect(hub).toMatchObject({ total: 2, page: 1, pages: 1 });
    expect(opens()).toEqual([]);
  });

  it("pages the hub, and has no page past the last", async () => {
    posts = Array.from({ length: HUB_PAGE_SIZE + 1 }, (_, i) =>
      post({ slug: `t${i}-narrative`, title: `T${i} narrative`, modified: `2026-10-01T00:${String(i).padStart(2, "0")}:00Z` })
    );
    const { buildTrendingHub } = await import("../server/trending");
    expect((await buildTrendingHub(1))?.rows).toHaveLength(HUB_PAGE_SIZE);
    expect((await buildTrendingHub(2))?.rows.map((r) => r.slug)).toEqual(["t0-narrative"]);
    expect(await buildTrendingHub(3)).toBeNull();
  });

  it("fails rather than render a hub short of its topics", async () => {
    listDown = true;
    const { buildTrendingHub, buildTrendingArticle } = await import("../server/trending");
    await expect(buildTrendingHub(1)).rejects.toThrow(/read short/);
    await expect(buildTrendingArticle("xrp-narrative", 1)).rejects.toThrow(/read short/);
  });

  it("shows a topic's updates newest first, then its page, and holds what it opened", async () => {
    const { buildTrendingArticle } = await import("../server/trending");
    const article = await buildTrendingArticle("xrp-narrative", 1);
    expect(article?.updates.map((u) => u.slug)).toEqual([
      "xrp-narrative-update-9",
      "xrp-narrative-update-5",
    ]);
    expect(article?.post.blocks).not.toBeNull();
    expect(article?.lead).toEqual({ title: "Update of 9 October", excerpt: "What changed on 9 October." });
    expect(article?.others.map((o) => o.slug)).toEqual(["sui-narrative"]);
    expect(opens()).toHaveLength(3);

    await buildTrendingArticle("xrp-narrative", 1);
    expect(opens()).toHaveLength(3);
  });

  it("opens an edited post again", async () => {
    const { buildTrendingArticle } = await import("../server/trending");
    const { POST_LIST_FRESH_MS } = await import("../server/postList");
    await buildTrendingArticle("sui-narrative", 1);
    const sui = posts[3] as Record<string, unknown>;
    sui.modified = "2026-10-18T00:00:00Z";
    sui.content = "Rewritten.";
    vi.setSystemTime(Date.now() + POST_LIST_FRESH_MS);
    await buildTrendingArticle("sui-narrative", 1); // answers the stale list, refreshes behind it
    await vi.advanceTimersByTimeAsync(0);
    const article = await buildTrendingArticle("sui-narrative", 1);
    expect(article?.post.blocks?.[0].spans[0]).toEqual({ kind: "text", text: "Rewritten." });
  });

  it("pages older updates without the page's body, and has no page past the last", async () => {
    posts = [post(), ...Array.from({ length: UPDATES_PAGE_SIZE + 2 }, (_, i) => update("xrp-narrative", i + 2))];
    const { buildTrendingArticle } = await import("../server/trending");
    const first = await buildTrendingArticle("xrp-narrative", 1);
    expect(first?.updates).toHaveLength(UPDATES_PAGE_SIZE);
    expect(first?.pages).toBe(2);

    const second = await buildTrendingArticle("xrp-narrative", 2);
    expect(second?.updates.map((u) => u.slug)).toEqual(["xrp-narrative-update-3", "xrp-narrative-update-2"]);
    expect(second?.post.blocks).toBeNull();
    expect(await buildTrendingArticle("xrp-narrative", 3)).toBeNull();
  });

  it("gives an update no page of its own, and 404s what is not a topic", async () => {
    const { buildTrendingArticle } = await import("../server/trending");
    expect(await buildTrendingArticle("xrp-narrative-update-5", 1)).toBeNull();
    expect(await buildTrendingArticle("aave-narrative", 1)).toBeNull();
    expect(await buildTrendingArticle("nothing-here", 1)).toBeNull();
    expect(await buildTrendingArticle("sui-narrative", 2)).toBeNull();
  });

  it("shows a page published since the list was read", async () => {
    const { buildTrendingArticle } = await import("../server/trending");
    await buildTrendingArticle("xrp-narrative", 1);
    detail["eth-narrative"] = post({ slug: "eth-narrative", title: "ETH narrative" });
    const before = opens().length;
    const article = await buildTrendingArticle("eth-narrative", 1);
    expect(article?.post.slug).toBe("eth-narrative");
    expect(article?.post.blocks).not.toBeNull();
    expect(article?.updates).toEqual([]);
    // Opened once, and checked from that copy.
    expect(opens().length - before).toBe(1);
  });

  it("404s a page whose body cannot be shown, and leaves out such an update", async () => {
    detail["sui-narrative"] = post({ slug: "sui-narrative", title: "Sui narrative", content: "" });
    detail["xrp-narrative-update-9"] = { ...update("xrp-narrative", 9), content: "> DECLINED: no" };
    const { buildTrendingArticle } = await import("../server/trending");
    expect(await buildTrendingArticle("sui-narrative", 1)).toBeNull();
    const article = await buildTrendingArticle("xrp-narrative", 1);
    expect(article?.updates.map((u) => u.slug)).toEqual(["xrp-narrative-update-5"]);
  });

  it("leads, dates and counts by what it shows, not by a refused update", async () => {
    detail["xrp-narrative-update-9"] = { ...update("xrp-narrative", 9), content: "" };
    const { buildTrendingArticle } = await import("../server/trending");
    const article = await buildTrendingArticle("xrp-narrative", 1);
    expect(article?.lead).toEqual({ title: "Update of 5 October", excerpt: "What changed on 5 October." });
    expect(article?.updateCount).toBe(1);
    expect(article?.latest).toBe("2026-10-05T09:00:00.000Z");
  });

  it("leads later pages with the page itself, and lists only their own sources", async () => {
    posts = [post(), ...Array.from({ length: UPDATES_PAGE_SIZE + 1 }, (_, i) => update("xrp-narrative", i + 2))];
    const { buildTrendingArticle } = await import("../server/trending");
    const second = await buildTrendingArticle("xrp-narrative", 2);
    expect(second?.lead.excerpt).toBe("Ripple's court win reopens the US market.");
    const head = trendingArticleHead({ article: second!, indexable: true });
    const script = head.scripts?.find((tag) => tag.type === "application/ld+json");
    expect(JSON.parse(String(script?.children)).citation).toEqual([
      { "@type": "CreativeWork", url: "https://example.com/2" },
    ]);
  });

  it("logs a refused post once, not on every render", async () => {
    detail["xrp-narrative-update-9"] = { ...update("xrp-narrative", 9), content: "" };
    const { buildTrendingArticle } = await import("../server/trending");
    for (let i = 0; i < 3; i += 1) await buildTrendingArticle("xrp-narrative", 1);
    expect(vi.mocked(console.warn)).toHaveBeenCalledTimes(1);
  });

  it("leaves out an update that has gone or moved since the list was read", async () => {
    detail["xrp-narrative-update-9"] = null;
    detail["xrp-narrative-update-5"] = update("sui-narrative", 5, { slug: "xrp-narrative-update-5" });
    const { buildTrendingArticle } = await import("../server/trending");
    expect((await buildTrendingArticle("xrp-narrative", 1))?.updates).toEqual([]);
  });

  it("fails its page, not a smaller page, on an outage opening a post", async () => {
    detail["xrp-narrative-update-5"] = new Error("upstream down");
    const { buildTrendingArticle } = await import("../server/trending");
    await expect(buildTrendingArticle("xrp-narrative", 1)).rejects.toThrow("upstream down");
  });

  it("does not retry a failing open on every render", async () => {
    detail["xrp-narrative-update-5"] = new Error("upstream down");
    const { buildTrendingArticle, FAILED_OPEN_MS } = await import("../server/trending");
    await expect(buildTrendingArticle("xrp-narrative", 1)).rejects.toThrow();
    const after = opens().length;
    for (let i = 0; i < 3; i += 1) await expect(buildTrendingArticle("xrp-narrative", 1)).rejects.toThrow();
    expect(opens().length).toBe(after);

    delete detail["xrp-narrative-update-5"];
    vi.setSystemTime(Date.now() + FAILED_OPEN_MS);
    expect((await buildTrendingArticle("xrp-narrative", 1))?.updates).toHaveLength(2);
  });
});

describe("the heads", () => {
  const robots = (head: { meta?: Array<Record<string, string>> }) =>
    head.meta?.find((tag) => tag.name === "robots")?.content;
  const title = (head: { meta?: Array<Record<string, string>> }) =>
    head.meta?.find((tag) => "title" in tag)?.title;

  const article = (over: Record<string, unknown> = {}) => {
    const checked = checkTrendingPost(post());
    const page = "post" in checked ? checked.post : null;
    const latest = checkTrendingPost(update("xrp-narrative", 9));
    return {
      post: page!,
      updates: "post" in latest ? [latest.post] : [],
      updateCount: 1,
      latest: "2026-10-09T09:00:00.000Z",
      lead: { title: "Update of 9 October", excerpt: "What changed on 9 October." },
      page: 1,
      pages: 1,
      others: [],
      asOf: "2026-10-19T00:00:00Z",
      ...over,
    };
  };

  it("titles a topic page by its topic and why it is in the news now", () => {
    const head = trendingArticleHead({ article: article(), indexable: true });
    expect(title(head)).toBe("XRP narrative: Update of 9 October | Alphaday");
    expect(robots(head)).not.toMatch(/noindex/);
  });

  it("cites every source on the page", () => {
    const head = trendingArticleHead({ article: article(), indexable: true });
    const script = head.scripts?.find((tag) => tag.type === "application/ld+json");
    const ld = JSON.parse(String(script?.children));
    expect(ld.citation.map((c: { url: string }) => c.url)).toEqual([
      "https://example.com/9",
      "https://example.com/a",
    ]);
    expect(ld.dateModified).toBe("2026-10-09T09:00:00.000Z");
  });

  it("serves older pages noindex, under their own title", () => {
    const head = trendingArticleHead({ article: article({ page: 2 }), indexable: false });
    expect(robots(head)).toMatch(/noindex/);
    expect(title(head)).toBe("XRP narrative: earlier updates, page 2 | Alphaday");
  });

  it("is noindex on the hub when the route says so", () => {
    const hub = { rows: [], total: 1, page: 1, pages: 1, asOf: "2026-10-19T00:00:00Z" };
    expect(robots(trendingHubHead({ hub, indexable: false }))).toMatch(/noindex/);
  });
});
