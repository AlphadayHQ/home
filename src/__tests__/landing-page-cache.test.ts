import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchWithRetry: vi.fn(),
}));

beforeEach(async () => {
  vi.useFakeTimers();
  const { resetLandingPages } = await import("../server/landingPages");
  resetLandingPages();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

it("shares one detail read across concurrent and repeated project renders", async () => {
  const { fetchWithRetry } = await import("../server/apiFetch");
  const { readLandingPage } = await import("../server/landingPages");
  vi.mocked(fetchWithRetry).mockResolvedValue(Response.json({ slug: "ethereum", name: "Ethereum" }));
  const results = await Promise.all([readLandingPage("ethereum"), readLandingPage("ethereum")]);
  expect(results.map((page) => page?.slug)).toEqual(["ethereum", "ethereum"]);
  expect((await readLandingPage("ethereum"))?.name).toBe("Ethereum");
  expect(fetchWithRetry).toHaveBeenCalledTimes(1);
});

it("keeps a good detail page when its background refresh is throttled", async () => {
  const { fetchWithRetry } = await import("../server/apiFetch");
  const { readLandingPage, PROJECTS_FRESH_MS } = await import("../server/landingPages");
  vi.mocked(fetchWithRetry).mockResolvedValueOnce(Response.json({ slug: "ethereum", name: "Ethereum" }))
    .mockRejectedValueOnce(new Error("returned 429"));
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await readLandingPage("ethereum");
    await vi.advanceTimersByTimeAsync(PROJECTS_FRESH_MS);
    expect((await readLandingPage("ethereum"))?.name).toBe("Ethereum");
    await vi.advanceTimersByTimeAsync(0);
    expect((await readLandingPage("ethereum"))?.name).toBe("Ethereum");
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);
  } finally {
    error.mockRestore();
  }
});

it("keeps missing slugs separate and allows newly created pages after the short miss cache", async () => {
  const { fetchWithRetry } = await import("../server/apiFetch");
  const { readLandingPage, FAILED_PROJECTS_MS } = await import("../server/landingPages");
  vi.mocked(fetchWithRetry).mockResolvedValueOnce(null)
    .mockResolvedValueOnce(Response.json({ slug: "base", name: "Base" }))
    .mockResolvedValueOnce(Response.json({ slug: "new", name: "New" }));
  expect(await readLandingPage("new")).toBeNull();
  expect((await readLandingPage("base"))?.slug).toBe("base");
  expect(await readLandingPage("new")).toBeNull();
  await vi.advanceTimersByTimeAsync(FAILED_PROJECTS_MS);
  expect((await readLandingPage("new"))?.slug).toBe("new");
});
