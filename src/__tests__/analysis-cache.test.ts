import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The published analyses are read once per process, not once per render. On 14
 * October 180 posts were published at once and every incident page started
 * costing 182 API calls; these pin that a render costs nothing while the read is
 * fresh, that a refresh fetches only what changed, and that a failed refresh
 * never replaces a good read.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
}));

const provenance = (incidentId: number) =>
  "```alphaday-provenance\n" +
  JSON.stringify({ incidentId, incidentDate: null, sourcesRead: [] }) +
  "\n```";

const detail = (slug: string, incidentId: number) => ({
  slug,
  title: `${slug} exploit analysis`,
  status: 1,
  published_at: "2026-10-14T00:00:00Z",
  content: `Words about ${slug}.\n\n${provenance(incidentId)}`,
});

let list: Array<{ slug: string; status: number; modified: string }>;
let failing = false;
let seen: string[];

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
  failing = false;
  seen = [];
  list = [
    { slug: "alpha", status: 1, modified: "m1" },
    { slug: "beta", status: 1, modified: "m1" },
  ];
  const { fetchJsonSoft } = await import("../server/apiFetch");
  vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
    seen.push(url);
    if (failing) return null;
    if (url.includes("/posts/?")) return { results: list, links: { next: null } } as never;
    const slug = url.split("/posts/")[1].replace(/\/$/, "");
    return detail(slug, ["alpha", "beta", "gamma"].indexOf(slug) + 1) as never;
  });
});

afterEach(() => vi.useRealTimers());

const settle = () => vi.advanceTimersByTimeAsync(0);

describe("the analyses read", () => {
  it("serves every render from one read while it is fresh", async () => {
    const { readAnalyses } = await import("../server/analysis");
    const first = await readAnalyses();
    expect(first.byIncident.size).toBe(2);
    expect(seen).toHaveLength(3);

    await readAnalyses();
    await readAnalyses();
    expect(seen).toHaveLength(3);
  });

  it("refreshes in the background and fetches only the post that changed", async () => {
    const { readAnalyses, FRESH_MS } = await import("../server/analysis");
    await readAnalyses();
    seen = [];

    list = [...list, { slug: "gamma", status: 1, modified: "m1" }];
    list[0] = { ...list[0], modified: "m2" };
    vi.setSystemTime(Date.now() + FRESH_MS);

    // Stale: answered at once from the last read.
    expect((await readAnalyses()).byIncident.size).toBe(2);
    await settle();

    expect(seen.filter((url) => !url.includes("/posts/?")).sort()).toEqual([
      "https://api.test/posts/alpha/",
      "https://api.test/posts/gamma/",
    ]);
    expect((await readAnalyses()).byIncident.size).toBe(3);
  });

  it("drops a post that is no longer published", async () => {
    const { readAnalyses, FRESH_MS } = await import("../server/analysis");
    await readAnalyses();

    list = [list[0]];
    vi.setSystemTime(Date.now() + FRESH_MS);
    await readAnalyses();
    await settle();

    expect([...(await readAnalyses()).byIncident.keys()]).toEqual([1]);
  });

  it("keeps the last good read when a refresh fails", async () => {
    const { readAnalyses, FRESH_MS } = await import("../server/analysis");
    await readAnalyses();

    failing = true;
    vi.setSystemTime(Date.now() + FRESH_MS);
    await readAnalyses();
    await settle();

    const after = await readAnalyses();
    expect(after.ok).toBe(true);
    expect(after.byIncident.size).toBe(2);
  });
});
