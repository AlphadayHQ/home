import { afterEach, beforeEach, expect, it, vi } from "vitest";

const epoch = new Date("2026-11-09T12:00:00Z").getTime();

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(epoch);
  vi.stubEnv("API_APP_ID", "");
  vi.stubEnv("API_APP_SECRET", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it.each(["58", "Mon, 09 Nov 2026 12:00:58 GMT"])("honors the full Retry-After %s across queued reads", async (header) => {
  const calls: number[] = [];
  vi.stubGlobal("fetch", vi.fn(async () => {
    calls.push(Date.now() - epoch);
    return calls.length === 1
      ? new Response("throttled", { status: 429, headers: { "Retry-After": header } })
      : Response.json({ ok: true });
  }));
  const { fetchWithRetry } = await import("../server/apiFetch");
  const result = Promise.all(["one", "two", "three"].map((slug) => fetchWithRetry(`https://api.test/${slug}`)));
  await vi.advanceTimersByTimeAsync(57_999);
  expect(calls).toEqual([0]);
  await vi.runAllTimersAsync();
  expect((await result).every((response) => response?.ok)).toBe(true);
  expect(calls).toEqual([0, 58_000, 58_000, 58_000]);
});

it("completes the concurrent SSR burst against a ten-per-minute backend", async () => {
  let windowStart = epoch;
  let used = 0;
  let throttled = 0;
  vi.stubGlobal("fetch", vi.fn(async () => {
    if (Date.now() - windowStart >= 60_000) {
      windowStart = Date.now();
      used = 0;
    }
    if (used === 10) {
      throttled += 1;
      return new Response("throttled", { status: 429, headers: { "Retry-After": "60" } });
    }
    used += 1;
    return Response.json({ ok: true });
  }));
  const { fetchWithRetry } = await import("../server/apiFetch");
  const result = Promise.all(Array.from({ length: 17 }, (_, i) => fetchWithRetry(`https://api.test/projects/${i}`)));
  await vi.runAllTimersAsync();
  expect((await result).every((response) => response?.status === 200)).toBe(true);
  expect(throttled).toBe(1);
});

it.each([null, "invalid"])("waits a full quota window when Retry-After is %s", async (header) => {
  const calls: number[] = [];
  vi.stubGlobal("fetch", vi.fn(async () => {
    calls.push(Date.now() - epoch);
    return calls.length === 1
      ? new Response("throttled", { status: 429, headers: header ? { "Retry-After": header } : {} })
      : Response.json({ ok: true });
  }));
  const { fetchWithRetry } = await import("../server/apiFetch");
  const result = fetchWithRetry("https://api.test/project");
  await vi.runAllTimersAsync();
  expect((await result)?.ok).toBe(true);
  expect(calls).toEqual([0, 60_000]);
});

it("fails within its attempt limit when throttling persists", async () => {
  const fetch = vi.fn(async () => new Response("throttled", { status: 429, headers: { "Retry-After": "1" } }));
  vi.stubGlobal("fetch", fetch);
  const { fetchWithRetry } = await import("../server/apiFetch");
  const assertion = expect(fetchWithRetry("https://api.test/project")).rejects.toThrow("returned 429");
  await vi.runAllTimersAsync();
  await assertion;
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("fails instead of retrying before an excessive Retry-After expires", async () => {
  const fetch = vi.fn(async () => new Response("throttled", { status: 429, headers: { "Retry-After": "121" } }));
  vi.stubGlobal("fetch", fetch);
  const { fetchWithRetry } = await import("../server/apiFetch");
  await expect(fetchWithRetry("https://api.test/project")).rejects.toThrow("returned 429");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it("keeps 404s as missing records and does not retry permission failures", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 }))
    .mockResolvedValueOnce(new Response(null, { status: 403 }));
  vi.stubGlobal("fetch", fetch);
  const { fetchWithRetry } = await import("../server/apiFetch");
  expect(await fetchWithRetry("https://api.test/missing")).toBeNull();
  await expect(fetchWithRetry("https://api.test/forbidden")).rejects.toThrow("returned 403");
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("forwards server-only client credentials to the backend", async () => {
  vi.stubEnv("API_APP_ID", "test-app");
  vi.stubEnv("API_APP_SECRET", "test-secret");
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    return Response.json({ accepted: headers.get("x-app-id") === "test-app" && headers.get("x-app-secret") === "test-secret" });
  });
  vi.stubGlobal("fetch", fetch);
  const { fetchWithRetry } = await import("../server/apiFetch");
  expect(await (await fetchWithRetry("https://api.test/project"))?.json()).toEqual({ accepted: true });
});

it("releases the shared request queue when one backend request hangs", async () => {
  let first = true;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    if (first) {
      first = false;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("request timed out")));
      });
    }
    return Response.json({ ok: true });
  }));
  const { fetchWithRetry } = await import("../server/apiFetch");
  const result = Promise.all([fetchWithRetry("https://api.test/slow"), fetchWithRetry("https://api.test/other")]);
  await vi.runAllTimersAsync();
  expect((await result).every((response) => response?.ok)).toBe(true);
});
