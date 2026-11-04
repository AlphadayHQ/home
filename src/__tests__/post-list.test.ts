import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The one reader behind every post type's pages. Only the transport is mocked:
 * what a short read returns, and what is logged, are what the copies it replaced
 * disagreed on.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

const post = (slug: string) => ({ slug, type: "x-type", status: 1 });

describe("walking a type's posts", () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    return () => error.mockRestore();
  });

  it("follows the pages until the last, and skips a row that is not an object", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const full = Array.from({ length: 100 }, (_, n) => post(`p-${n}`));
    vi.mocked(fetchJsonSoft)
      .mockResolvedValueOnce({ results: full, links: { next: "https://api.test/next" } } as never)
      .mockResolvedValueOnce({ results: [post("last"), null, 3], links: { next: null } } as never);
    const { walkPostList } = await import("../server/postList");
    const { raw, ok } = await walkPostList("x-type");
    expect(ok).toBe(true);
    expect(raw).toHaveLength(101);
    expect(vi.mocked(fetchJsonSoft).mock.calls.map((call) => call[0])).toEqual([
      "https://api.test/posts/?type=x-type&limit=100&page=1",
      "https://api.test/posts/?type=x-type&limit=100&page=2",
    ]);
    expect(error).not.toHaveBeenCalled();
  });

  it("answers what it read before a page failed, says the read was short, and logs it", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const full = Array.from({ length: 100 }, (_, n) => post(`p-${n}`));
    vi.mocked(fetchJsonSoft)
      .mockResolvedValueOnce({ results: full, links: { next: "https://api.test/next" } } as never)
      .mockResolvedValueOnce(null as never);
    const { walkPostList } = await import("../server/postList");
    const { raw, ok } = await walkPostList("x-type");
    expect(ok).toBe(false);
    expect(raw).toHaveLength(100);
    expect(String(error.mock.calls[0][0])).toContain("did not answer on page 2");
  });

  it("names the cap when it is reached, rather than reading like an outage", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const full = Array.from({ length: 100 }, (_, n) => post(`p-${n}`));
    vi.mocked(fetchJsonSoft).mockResolvedValue({ results: full, links: { next: "https://api.test/next" } } as never);
    const { walkPostList, MAX_PAGES } = await import("../server/postList");
    const { raw, ok } = await walkPostList("x-type");
    expect(ok).toBe(false);
    expect(raw).toHaveLength(MAX_PAGES * 100);
    expect(String(error.mock.calls[0][0])).toContain("more than 2000 posts");
  });
});

describe("opening one post", () => {
  it("is null for a 404, the post when found, and an error for anything else", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    const { fetchPost } = await import("../server/postList");
    vi.mocked(fetchWithRetry).mockResolvedValueOnce(null);
    expect(await fetchPost("gone")).toBeNull();
    vi.mocked(fetchWithRetry).mockResolvedValueOnce({ json: async () => post("here") } as never);
    expect(await fetchPost("here")).toMatchObject({ slug: "here" });
    vi.mocked(fetchWithRetry).mockResolvedValueOnce({ json: async () => null } as never);
    await expect(fetchPost("odd")).rejects.toThrow(/not a post/);
    expect(vi.mocked(fetchWithRetry).mock.calls.at(-1)?.[0]).toBe("https://api.test/posts/odd/");
  });
});

describe("warning once per version", () => {
  it("logs a key once until cleared", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { warnOncePer } = await import("../server/postList");
    const once = warnOncePer();
    once.warn("a@1", "a");
    once.warn("a@1", "a");
    once.warn("a@2", "a, edited");
    expect(warn).toHaveBeenCalledTimes(2);
    once.clear();
    once.warn("a@1", "a");
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe("the others a post's page links to", () => {
  const rows = Array.from({ length: 22 }, (_, n) => `t${n}`);

  it("links every page from as many pages as it links, the ends included", async () => {
    const { neighbours } = await import("../server/postList");
    // Eight is the shortest list of six others that wraps.
    for (const list of [rows.slice(0, 8), rows]) {
      const shownBy = new Map(list.map((row) => [row, 0]));
      list.forEach((row, at) => {
        const others = neighbours(list, at, 6);
        expect(others).toHaveLength(6);
        expect(others).not.toContain(row);
        others.forEach((other) => shownBy.set(other, (shownBy.get(other) ?? 0) + 1));
      });
      expect(new Set(shownBy.values())).toEqual(new Set([6]));
    }
  });

  it("takes half from each side, wrapping at the ends, in list order", async () => {
    const { neighbours } = await import("../server/postList");
    expect(neighbours(rows, 10, 6)).toEqual(["t7", "t8", "t9", "t11", "t12", "t13"]);
    expect(neighbours(rows, 21, 6)).toEqual(["t0", "t1", "t2", "t18", "t19", "t20"]);
    expect(neighbours(rows, 0, 6)).toEqual(["t1", "t2", "t3", "t19", "t20", "t21"]);
    expect(neighbours(rows.slice(0, 8), 0, 6)).toEqual(["t1", "t2", "t3", "t5", "t6", "t7"]);
  });

  it("links every other row from a short list, and the first from a row not in it", async () => {
    const { neighbours } = await import("../server/postList");
    expect(neighbours(["a", "b", "c"], 1, 6)).toEqual(["a", "c"]);
    expect(neighbours(rows, -1, 6)).toEqual(["t0", "t1", "t2", "t3", "t4", "t5"]);
  });
});
