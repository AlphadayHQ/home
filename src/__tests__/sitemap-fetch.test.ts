import { afterEach, beforeEach, expect, it, vi } from "vitest";

const epoch = new Date("2026-11-09T12:00:00Z").getTime();
let calls: number[];

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(epoch);
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("paces event, pagination, and landing-page reads in one quota", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => {
    calls.push(Date.now() - epoch);
    return Response.json({ results: [] });
  }));
  const { sitemapFetch } = await import("../../scripts/sitemapFetch");
  const reads = (async () => {
    for (const path of ["/items/events/?page=1", "/items/events/?page=2", "/ui/landing-pages/"]) {
      const response = await sitemapFetch(`https://api.test${path}`);
      expect(await response.json()).toEqual({ results: [] });
    }
  })();
  await vi.runAllTimersAsync();
  await reads;
  expect(calls).toEqual([0, 7000, 14_000]);
});

it.each([
  ["30", 30_000],
  ["Mon, 09 Nov 2026 12:00:45 GMT", 45_000],
  [null, 60_000],
  ["invalid", 60_000],
  ["0", 7000],
])("recovers from 429 after Retry-After %s", async (header, delay) => {
  vi.stubGlobal("fetch", vi.fn(async () => {
    calls.push(Date.now() - epoch);
    return calls.length === 1
      ? new Response("throttled", {
        status: 429,
        headers: header === null ? {} : { "Retry-After": header },
      })
      : Response.json({ results: [{ slug: "ethereum" }] });
  }));
  const { sitemapFetch } = await import("../../scripts/sitemapFetch");
  const result = sitemapFetch("https://api.test/ui/landing-pages/");
  await vi.runAllTimersAsync();
  expect(await (await result).json()).toEqual({ results: [{ slug: "ethereum" }] });
  expect(calls).toEqual([0, delay]);
});

it("returns persistent throttling after three attempts", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => {
    calls.push(Date.now() - epoch);
    return new Response("throttled", { status: 429 });
  }));
  const { sitemapFetch } = await import("../../scripts/sitemapFetch");
  const result = sitemapFetch("https://api.test/items/events/");
  await vi.runAllTimersAsync();
  expect((await result).status).toBe(429);
  expect(calls).toEqual([0, 60_000, 120_000]);
});

it("does not retry early when Retry-After exceeds the wait budget", async () => {
  const fetch = vi.fn(async () => new Response("throttled", {
    status: 429,
    headers: { "Retry-After": "121" },
  }));
  vi.stubGlobal("fetch", fetch);
  const { sitemapFetch } = await import("../../scripts/sitemapFetch");
  expect((await sitemapFetch("https://api.test/items/events/")).status).toBe(429);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("preserves other HTTP failures for the partial-sitemap guard", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
  const { sitemapFetch } = await import("../../scripts/sitemapFetch");
  expect((await sitemapFetch("https://api.test/items/events/")).status).toBe(503);
  expect(vi.getTimerCount()).toBe(0);
});
