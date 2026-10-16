import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NARRATIVE_HUB,
  NARRATIVE_HUB_FLOOR,
  bodyProblem,
  byNarrative,
  displayName,
  isAboutNarrative,
  isNarrativeSlug,
  paceOf,
  shapeTrending,
  shareOf,
  toNarrativePost,
  toNarrativeRow,
  validDate,
} from "../data/narratives";
import { toExploitRow } from "../data/exploitPosts";
import { isDeclineExcerpt } from "../data/analysis";
import { POST_HUBS, postPagePath, postPages } from "../data/postPages";
import { indexStateFor } from "../seo/indexState";
import { narrativeHead } from "../seo/narrativesHead";
import { RETRY_AFTER_FAILURE_MS, hold, holdByKey } from "../server/hold";

/**
 * Narrative pages (B3), read as posts.
 *
 * These pin that a topic is identified by its tag, so two keywords never make
 * two pages; that a post reaches a page from its `metadata` alone, and only when
 * its title names the topic; that the pages never open a post to find out what
 * it is about; and that a failed read is an error, never a smaller page.
 *
 * Only the transport is mocked.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

const trendingRow = (name: string, slug: string | null, trendiness: string) => ({
  keyword: { name, tag: slug === null ? null : { slug } },
  trendiness,
});

const meta = (over: Record<string, unknown> = {}) => ({
  schema: 1,
  tag: "xrpl",
  topic: "Ripple",
  kind: "page",
  sourcesRead: ["https://example.com/a", "https://api.alphaday.com/v1/items/news/"],
  ...over,
});

const post = (overrides: Record<string, unknown> = {}) => ({
  slug: "ripples-court-win",
  title: "Ripple's court win and what it means for XRP",
  excerpt: "What changed.",
  status: 1,
  type: "trending-narrative",
  published_at: "2026-10-10T09:00:00Z",
  modified: "2026-10-12T09:00:00Z",
  metadata: meta(),
  content: "## What happened\n\nWords, with a [source](https://example.com/a).",
  ...overrides,
});

describe("trending topics", () => {
  it("keys each topic on its tag, keeping the hotter keyword", () => {
    const topics = shapeTrending([
      trendingRow("ripple", "xrpl", "0.55"),
      trendingRow("XRP", "xrpl", "0.61"),
      trendingRow("Bitcoin", "bitcoin", "0.58"),
    ]);
    expect(topics).toEqual([
      { slug: "xrpl", name: "XRP", trendiness: 0.61 },
      { slug: "bitcoin", name: "Bitcoin", trendiness: 0.58 },
    ]);
  });

  it("drops keywords with no tag, a malformed tag or no score", () => {
    expect(
      shapeTrending([
        trendingRow("orphan", null, "0.9"),
        trendingRow("bad", "Not A Slug", "0.9"),
        trendingRow("noscore", "noscore", "n/a"),
      ])
    ).toEqual([]);
  });

  it("reads no score into a missing, blank or boolean one", () => {
    // `Number` would read these as 0 or 1 and keep each as a trending topic.
    const rows = [null, "", " ", true, false].map((trendiness) => ({
      keyword: { name: "Aave", tag: { slug: "aave" } },
      trendiness,
    }));
    expect(shapeTrending(rows)).toEqual([]);
    expect(shapeTrending([{ ...rows[0], trendiness: 0.4 }])).toEqual([
      { slug: "aave", name: "Aave", trendiness: 0.4 },
    ]);
  });

  it("capitalises lowercase keywords and leaves styled ones alone", () => {
    expect(displayName("ripple")).toBe("Ripple");
    expect(displayName("federal reserve")).toBe("Federal Reserve");
    expect(displayName("DeFi")).toBe("DeFi");
    expect(displayName("SUI")).toBe("SUI");
    // Not "Trump'S": only a letter after a space or hyphen is raised.
    expect(displayName("trump's tariffs")).toBe("Trump's Tariffs");
  });

  it("accepts every slug the backend can make, and nothing else", () => {
    expect(isNarrativeSlug("federal-reserve-system")).toBe(true);
    expect(isNarrativeSlug("layer_2")).toBe(true);
    expect(isNarrativeSlug("ETH")).toBe(true);
    expect(isNarrativeSlug("../etc")).toBe(false);
    expect(isNarrativeSlug("a b")).toBe(false);
    expect(isNarrativeSlug("x".repeat(51))).toBe(false);
  });
});

describe("narrative posts, from their metadata", () => {
  it("reads a published post's page from its list row, and drops our own API from its sources", () => {
    const row = toNarrativeRow({ ...post(), content: undefined });
    expect(row).toMatchObject({
      slug: "ripples-court-win",
      tag: "xrpl",
      topic: "Ripple",
      modified: "2026-10-12T09:00:00.000Z",
      sourcesRead: ["https://example.com/a"],
    });
  });

  it("requires the title to name the topic, by its name or its tag", () => {
    expect(isAboutNarrative({ title: "Ripple wins in court", topic: "Ripple" }, "xrpl")).toBe(true);
    expect(isAboutNarrative({ title: "XRPL validators upgrade", topic: null }, "xrpl")).toBe(true);
    expect(isAboutNarrative({ title: "Layer 2 fees fall", topic: null }, "layer_2")).toBe(true);
    expect(
      isAboutNarrative({ title: "Rate cut odds and Bitcoin", topic: null }, "federal-reserve-system")
    ).toBe(false);
    // Whole words: "Sui" is not in "Suitable".
    expect(isAboutNarrative({ title: "A suitable time", topic: "Sui" }, "sui")).toBe(false);
    expect(toNarrativeRow(post({ title: "Solana's busy week" }))).toBeNull();
  });

  it("shows only published pages: no draft, archive, update draft or decline", () => {
    expect(toNarrativeRow(post({ status: 2 }))).toBeNull();
    expect(toNarrativeRow(post({ status: 0 }))).toBeNull();
    // An update is a section for a reviewer to fold in; published by mistake it
    // would replace the page with one dated paragraph.
    expect(toNarrativeRow(post({ metadata: meta({ kind: "update" }) }))).toBeNull();
    expect(toNarrativeRow(post({ metadata: meta({ declined: true }) }))).toBeNull();
    // Published without the flag, as four exploit declines were on 14 October:
    // caught by the excerpt every decline carries, from the list row alone.
    expect(toNarrativeRow(post({ excerpt: "Declined: not a topic." }))).toBeNull();
  });

  it("never shows a body that is a decline or renders nothing", () => {
    for (const content of ["> DECLINED: generic word.", "", "   "]) {
      expect(toNarrativeRow(post({ content }))?.slug).toBe("ripples-court-win");
      expect(toNarrativePost(post({ content }))).toBeNull();
      expect(bodyProblem(content)).not.toBeNull();
    }
    expect(bodyProblem(post().content)).toBeNull();
  });

  it("does not take a real excerpt that starts with the word for a decline", () => {
    expect(isDeclineExcerpt("Declined ETF applications pile up at the SEC")).toBe(false);
    expect(isDeclineExcerpt("Declined: not a topic.")).toBe(true);
    expect(isDeclineExcerpt("Declined: not a security incident.")).toBe(true);
    expect(toNarrativeRow(post({ excerpt: "Declined ETF applications pile up" }))).not.toBeNull();
  });

  it("never mistakes an exploit analysis for a narrative, or the reverse", () => {
    expect(toNarrativeRow(post({ type: "exploit-analysis" }))).toBeNull();
    expect(toExploitRow(post())).toBeNull();
  });

  it("falls back to the publish date when the edit date is unusable", () => {
    expect(toNarrativeRow(post({ modified: "" }))?.modified).toBe("2026-10-10T09:00:00.000Z");
    expect(toNarrativeRow(post({ published_at: "" }))).toBeNull();
    expect(validDate("not a date")).toBeNull();
  });

  it("renders the body from spans", () => {
    expect(toNarrativePost(post())?.blocks[0]).toEqual({
      kind: "heading",
      spans: [{ kind: "text", text: "What happened" }],
    });
  });

  it("keeps the most recently changed post per topic", () => {
    const rows = [
      post({ slug: "older-ripple", modified: "2026-10-01T00:00:00Z" }),
      post({ slug: "newer-ripple", modified: "2026-10-13T00:00:00Z" }),
    ].map(toNarrativeRow);
    const map = byNarrative(rows.filter((row) => row !== null));
    expect(map.size).toBe(1);
    expect(map.get("xrpl")?.slug).toBe("newer-ripple");
  });

  it("compares edit times as instants, not as strings", () => {
    // 01:00 at +02:00 is 23:00 UTC the day before, so the Z row is newer, and
    // a fraction of a second does not reorder two rows either.
    const rows = [
      post({ slug: "offset-ripple", modified: "2026-10-13T01:00:00+02:00" }),
      post({ slug: "utc-ripple", modified: "2026-10-12T23:30:00Z" }),
    ].map(toNarrativeRow);
    expect(byNarrative(rows.filter((row) => row !== null)).get("xrpl")?.slug).toBe("utc-ripple");
    expect(toNarrativeRow(post({ modified: "2026-10-12T09:00:00.123456Z" }))?.modified).toBe(
      "2026-10-12T09:00:00.123Z"
    );
  });
});

describe("attention numbers", () => {
  const attention = { news7: 70, news30: 150, podcasts7: 2, videos7: 1, allNews7: 3500 };

  it("gives the share of all news and the pace against 30 days", () => {
    expect(shareOf(attention)).toBeCloseTo(0.02);
    // 10 a day this week against 5 a day over 30 days.
    expect(paceOf(attention)).toBeCloseTo(2);
  });

  it("refuses a pace on too little coverage, and anything on a failed read", () => {
    expect(paceOf({ ...attention, news7: 2, news30: 3 })).toBeNull();
    expect(paceOf({ ...attention, news30: null })).toBeNull();
    expect(shareOf({ ...attention, allNews7: null })).toBeNull();
  });
});

describe("the sitemap", () => {
  const topic = (tag: string, modified: string) =>
    post({
      slug: `${tag}-narrative`,
      title: `${tag} this week`,
      modified,
      metadata: meta({ tag, topic: tag }),
    });

  it("places a narrative post on its topic's page, and nothing it would not show", () => {
    expect(postPagePath(post())).toBe("/research/narratives/xrpl");
    expect(postPagePath(post({ title: "Solana's busy week" }))).toBeNull();
    expect(postPagePath(post({ metadata: meta({ kind: "update" }) }))).toBeNull();
  });

  it("lists the hub only once it links to enough written topics", () => {
    const two = [topic("aave", "2026-10-11T00:00:00Z"), topic("sui", "2026-10-13T00:00:00Z")];
    // Two posts on one topic are one page, and do not count twice.
    const repeat = topic("sui", "2026-10-09T00:00:00Z");
    expect(postPages([...two, repeat]).pages.map((page) => page.path)).not.toContain(NARRATIVE_HUB);

    const { pages } = postPages([...two, repeat, topic("etf", "2026-10-12T00:00:00Z")]);
    expect(NARRATIVE_HUB_FLOOR).toBe(3);
    expect(pages).toContainEqual({ path: NARRATIVE_HUB, lastmod: "2026-10-13T00:00:00.000Z" });
    expect(pages).toContainEqual({
      path: "/research/narratives/sui",
      lastmod: "2026-10-13T00:00:00.000Z",
    });
  });

  it("lists live only promoted hubs", () => {
    // `scripts/build-sitemap.mjs` leaves these same paths out of pages.xml.
    expect(POST_HUBS.map((hub) => hub.path)).toEqual([NARRATIVE_HUB]);
    for (const hub of POST_HUBS) expect(indexStateFor(hub.path)).toBe("promoted");
  });

  it("does not place a decline published without its flag", () => {
    expect(postPagePath(post({ excerpt: "Declined: not a topic." }))).toBeNull();
  });
});

describe("the topic page head", () => {
  const page = (over: Record<string, unknown> = {}) => ({
    slug: "xrpl",
    name: "Ripple",
    trendiness: 0.6,
    attention: { news7: 1, news30: 2, podcasts7: 0, videos7: 0, allNews7: 10 },
    headlines: [],
    post: null,
    asOf: "2026-10-16T00:00:00Z",
    ...over,
  });

  const robots = (head: { meta?: Array<Record<string, string>> }) =>
    head.meta?.find((tag) => tag.name === "robots")?.content;

  it("is noindex with nothing written, however it is asked", () => {
    expect(robots(narrativeHead({ page: page(), indexable: true }))).toMatch(/noindex/);
  });

  it("cites every source read", () => {
    const head = narrativeHead({ page: page({ post: toNarrativePost(post()) }), indexable: true });
    expect(robots(head)).not.toMatch(/noindex/);
    const script = head.scripts?.find((tag) => tag.type === "application/ld+json");
    const ld = JSON.parse(String(script?.children));
    expect(ld.citation).toEqual([{ "@type": "CreativeWork", url: "https://example.com/a" }]);
  });
});

describe("holding a read", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("answers a stale value at once and refreshes behind it", async () => {
    let value = 1;
    const load = vi.fn(async () => value);
    const held = hold(load, 1000);
    expect(await held.read()).toBe(1);
    value = 2;
    vi.setSystemTime(Date.now() + 1000);
    expect(await held.read()).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(await held.read()).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never holds a failed read, and never lets one replace a good one", async () => {
    let value: number | null = null;
    const load = vi.fn(async () => value);
    const held = hold(load, 1000, { keep: (v) => v !== null });
    expect(await held.read()).toBeNull();
    value = 5;
    expect(await held.read()).toBe(5);
    value = null;
    vi.setSystemTime(Date.now() + 1000);
    await held.read();
    await vi.advanceTimersByTimeAsync(0);
    expect(await held.read()).toBe(5);
  });

  it("answers a failed read for failMs, then waits for a fresh one", async () => {
    let value: number | null = null;
    const load = vi.fn(async () => value);
    const held = hold(load, 10_000, { keep: (v) => v !== null, failMs: 1000 });
    expect(await held.read()).toBeNull();
    expect(await held.read()).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    value = 3;
    vi.setSystemTime(Date.now() + 1000);
    // Not the failure again: the first read after it expires gets the new value.
    expect(await held.read()).toBe(3);
  });

  it("does not let a load that started before a reset write after it", async () => {
    let calls = 0;
    let finish: (v: number) => void = () => {};
    const load = vi.fn(() => {
      calls += 1;
      return new Promise<number>((resolve) => (finish = resolve));
    });
    const held = hold(load, 1000);
    const first = held.read();
    held.reset();
    finish(1);
    expect(await first).toBe(1);
    // Had the old load written, this would answer 1 without loading.
    const next = held.read();
    expect(calls).toBe(2);
    finish(2);
    expect(await next).toBe(2);
  });

  it("holds per key", async () => {
    const load = vi.fn(async (key: string) => key.length);
    const held = holdByKey(load, 1000);
    expect(await held.read("ab")).toBe(2);
    expect(await held.read("abc")).toBe(3);
    expect(await held.read("ab")).toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("drops the least recently read key at the cap, not every key", async () => {
    const load = vi.fn(async (key: string) => key);
    const held = holdByKey(load, 1000, {}, 2);
    await held.read("hub");
    await held.read("old");
    await held.read("hub");
    await held.read("new");
    expect(load).toHaveBeenCalledTimes(3);
    await held.read("hub");
    expect(load).toHaveBeenCalledTimes(3);
    await held.read("old");
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("waits before retrying a refresh that failed behind a good value", async () => {
    let fail = false;
    const load = vi.fn(async () => {
      if (fail) throw new Error("down");
      return 1;
    });
    const held = hold(load, 1000);
    await held.read();
    fail = true;
    vi.setSystemTime(Date.now() + 1000);
    expect(await held.read()).toBe(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(2);
    // An outage: every request still gets the held value, and none retries yet.
    for (let i = 0; i < 5; i += 1) expect(await held.read()).toBe(1);
    expect(load).toHaveBeenCalledTimes(2);
    fail = false;
    vi.setSystemTime(Date.now() + RETRY_AFTER_FAILURE_MS);
    await held.read();
    await vi.advanceTimersByTimeAsync(0);
    expect(load).toHaveBeenCalledTimes(3);
  });
});

describe("reading the pages", () => {
  let posts: Array<Record<string, unknown>>;
  let trendingDown: boolean;
  let postsDown: boolean;
  let countsDown: boolean;
  let duplicateHeadline: boolean;
  let seen: string[];

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    posts = [
      post(),
      post({
        slug: "starknet-staking",
        title: "Starknet staking opens",
        modified: "2026-10-14T00:00:00Z",
        metadata: meta({ tag: "starknet", topic: "Starknet" }),
      }),
      post({ slug: "draft-about-aave", status: 2, metadata: meta({ tag: "aave" }) }),
    ];
    trendingDown = false;
    postsDown = false;
    countsDown = false;
    duplicateHeadline = false;
    seen = [];

    const { fetchJsonSoft, fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      seen.push(url);
      const path = url.replace("https://api.test/", "");
      if (path.startsWith("posts/")) {
        return (postsDown ? null : { results: posts, links: { next: null } }) as never;
      }
      if (path.startsWith("keywords/trending/")) {
        return (
          trendingDown
            ? null
            : { results: [trendingRow("XRP", "xrpl", "0.6"), trendingRow("AAVE", "aave", "0.5")] }
        ) as never;
      }
      if (countsDown && path.startsWith("items/")) return null as never;
      if (path.includes("limit=8")) {
        return {
          total: 70,
          results: [
            {
              title: "XRP rallies",
              url: "https://news.example/xrp",
              published_at: "2026-10-15T08:00:00Z",
              source: { name: "Example" },
            },
            { title: "No date", url: "https://news.example/x", published_at: "" },
            ...(duplicateHeadline
              ? [
                  {
                    title: "XRP rallies, again",
                    url: "https://news.example/xrp",
                    published_at: "2026-10-15T09:00:00Z",
                  },
                ]
              : []),
          ],
        } as never;
      }
      return { total: path.includes("tags=") ? 70 : 3500 } as never;
    });
    vi.mocked(fetchWithRetry).mockImplementation(async (url: string) => {
      seen.push(url);
      const slug = url.split("/posts/")[1].replace(/\/$/, "");
      const found = posts.find((row) => row.slug === slug);
      return (found ? { json: async () => found } : null) as never;
    });

    const { resetNarratives } = await import("../server/narratives");
    resetNarratives();
  });

  afterEach(() => vi.useRealTimers());

  it("builds the hub from one post list, without opening any post", async () => {
    const { buildNarrativeHub } = await import("../server/narratives");
    const hub = await buildNarrativeHub();

    expect(seen.filter((url) => url.includes("/posts/"))).toEqual([
      "https://api.test/posts/?type=trending-narrative&limit=100&page=1",
    ]);
    // Trending first, hottest first, then the written topic that has cooled.
    expect(hub.rows.map((row) => [row.slug, row.name, row.trendiness])).toEqual([
      ["xrpl", "Ripple", 0.6],
      ["aave", "AAVE", 0.5],
      ["starknet", "Starknet", null],
    ]);
    expect(hub.written).toBe(2);
    expect(hub.rows[0].attention).toMatchObject({ news7: 70, allNews7: 3500, podcasts7: null });
  });

  it("does not count a decline published without its flag as written", async () => {
    posts.push(
      post({
        slug: "aave-not-a-topic",
        title: "Aave — not a topic",
        excerpt: "Declined: not a topic.",
        metadata: meta({ tag: "aave", topic: "Aave" }),
      })
    );
    const { buildNarrativeHub } = await import("../server/narratives");
    const hub = await buildNarrativeHub();
    expect(hub.written).toBe(2);
    expect(hub.rows.find((row) => row.slug === "aave")?.post).toBeNull();
  });

  it("does not retry a failing count on every render", async () => {
    countsDown = true;
    const { buildNarrativeHub } = await import("../server/narratives");
    const hub = await buildNarrativeHub();
    expect(hub.rows[0].attention.news7).toBeNull();
    seen = [];
    await buildNarrativeHub();
    expect(seen).toEqual([]);
  });

  it("makes no upstream request while what it read is fresh", async () => {
    const { buildNarrativeHub } = await import("../server/narratives");
    await buildNarrativeHub();
    seen = [];
    await buildNarrativeHub();
    expect(seen).toEqual([]);
  });

  it("still lists the written topics when the trending list is down", async () => {
    trendingDown = true;
    const { buildNarrativeHub } = await import("../server/narratives");
    const hub = await buildNarrativeHub();
    expect(hub.trendingOk).toBe(false);
    expect(hub.rows.map((row) => row.slug)).toEqual(["starknet", "xrpl"]);
  });

  it("fails rather than render a hub short of its written topics", async () => {
    postsDown = true;
    const { buildNarrativeHub } = await import("../server/narratives");
    await expect(buildNarrativeHub()).rejects.toThrow(/read short/);
  });

  it("opens one post for a written topic, its own", async () => {
    const { buildNarrativePage } = await import("../server/narratives");
    const page = await buildNarrativePage("xrpl");
    expect(seen.filter((url) => /\/posts\/[^?]/.test(url))).toEqual([
      "https://api.test/posts/ripples-court-win/",
    ]);
    expect(page?.post?.title).toBe("Ripple's court win and what it means for XRP");
    // The week's count comes with its headlines: no separate limit=1 read of it.
    expect(seen).not.toContain("https://api.test/items/news/?tags=xrpl&period=1&limit=1");
    expect(page?.attention).toMatchObject({ news7: 70, podcasts7: 70, allNews7: 3500 });
    // The undated headline is skipped, not rendered.
    expect(page?.headlines.map((item) => item.title)).toEqual(["XRP rallies"]);
  });

  it("renders a trending topic with nothing written, and 404s one that is neither", async () => {
    const { buildNarrativePage } = await import("../server/narratives");
    const aave = await buildNarrativePage("aave");
    expect(aave?.post).toBeNull();
    expect(aave?.name).toBe("AAVE");
    expect(await buildNarrativePage("dogecoin")).toBeNull();
  });

  it("will not 404 a topic it could not check", async () => {
    trendingDown = true;
    const { buildNarrativePage } = await import("../server/narratives");
    await expect(buildNarrativePage("aave")).rejects.toThrow(/trending list unavailable/);
    // A written topic does not need the trending list to exist.
    expect((await buildNarrativePage("starknet"))?.post?.slug).toBe("starknet-staking");
  });

  it("refuses a listed post with a broken body, logs it, and shows the next one on the topic", async () => {
    posts[0] = post({ content: "" });
    posts.push(post({ slug: "older-ripple", modified: "2026-10-01T00:00:00Z" }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { buildNarrativePage } = await import("../server/narratives");
    const page = await buildNarrativePage("xrpl");
    expect(page?.post?.slug).toBe("older-ripple");
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ripples-court-win.*empty/));
    warn.mockRestore();
  });

  it("leaves a trending topic unwritten when its only post cannot be shown", async () => {
    posts[0] = post({ content: "> DECLINED: generic word." });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { buildNarrativePage } = await import("../server/narratives");
    const page = await buildNarrativePage("xrpl");
    expect(page?.post).toBeNull();
    warn.mockRestore();
  });

  it("does not show a post retagged since the list was read", async () => {
    const { buildNarrativePage } = await import("../server/narratives");
    await buildNarrativePage("starknet");
    // Retagged in the admin: the held list still places it on starknet.
    posts[1] = { ...posts[1], metadata: meta({ tag: "xrpl", topic: "Starknet" }) };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Not trending and nothing it can show: no page, rather than this post
    // indexed under the old topic's URL.
    expect(await buildNarrativePage("starknet")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/starknet-staking.*now on xrpl/));
    warn.mockRestore();
  });

  it("reads the hub's week counts bare, and dedupes a page's headlines", async () => {
    const { buildNarrativeHub, buildNarrativePage } = await import("../server/narratives");
    await buildNarrativeHub();
    expect(seen.some((url) => url.includes("limit=8"))).toBe(false);
    expect(seen).toContain("https://api.test/items/news/?tags=xrpl&period=1&limit=1");
    duplicateHeadline = true;
    const page = await buildNarrativePage("aave");
    expect(page?.headlines.map((item) => item.url)).toEqual(["https://news.example/xrp"]);
  });

  it("fails on an outage reading the post, rather than render the page without it", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockRejectedValueOnce(new Error("upstream down"));
    const { buildNarrativePage } = await import("../server/narratives");
    await expect(buildNarrativePage("xrpl")).rejects.toThrow(/upstream down/);
  });
});
