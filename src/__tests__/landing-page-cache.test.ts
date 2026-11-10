import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The held project page behind every `/projects/$slug` render. Only the
 * transport is mocked: what is fetched, how often, and what a failed or missing
 * read answers are what the cache is for.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchWithRetry: vi.fn(),
}));

const page = (slug: string, name: string) => () =>
  Promise.resolve(Response.json({ slug, name }));

describe("reading a project page", () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { resetLandingPages } = await import("../server/landingPages");
    resetLandingPages();
    return () => {
      error.mockRestore();
      vi.useRealTimers();
    };
  });

  it("shares one request across concurrent and repeated renders of a slug", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(page("ethereum", "Ethereum"));
    const { readLandingPage } = await import("../server/landingPages");

    const first = await Promise.all([readLandingPage("ethereum"), readLandingPage("ethereum")]);
    expect(first.map((read) => read?.name)).toEqual(["Ethereum", "Ethereum"]);
    expect((await readLandingPage("ethereum"))?.name).toBe("Ethereum");
    expect(vi.mocked(fetchWithRetry).mock.calls).toEqual([
      ["https://api.test/ui/landing-pages/ethereum/"],
    ]);
  });

  it("encodes the slug into the detail URL", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(page("a b", "A B"));
    const { readLandingPage } = await import("../server/landingPages");

    await readLandingPage("a b");
    expect(fetchWithRetry).toHaveBeenCalledWith("https://api.test/ui/landing-pages/a%20b/");
  });

  it("answers a stale page at once and keeps it when the refresh behind it fails", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry)
      .mockImplementationOnce(page("ethereum", "Ethereum"))
      .mockRejectedValueOnce(new Error("https://api.test/ui/landing-pages/ethereum/ returned 429"));
    const { readLandingPage, PROJECTS_FRESH_MS } = await import("../server/landingPages");

    await readLandingPage("ethereum");
    await vi.advanceTimersByTimeAsync(PROJECTS_FRESH_MS);
    expect((await readLandingPage("ethereum"))?.name).toBe("Ethereum");
    await vi.advanceTimersByTimeAsync(0);

    // The failed refresh is logged once and not retried by the next render.
    expect(error).toHaveBeenCalledTimes(1);
    expect((await readLandingPage("ethereum"))?.name).toBe("Ethereum");
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);
  });

  it("holds a missing slug only briefly, so a page created since is found", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry)
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(page("base", "Base"))
      .mockImplementationOnce(page("new", "New"));
    const { readLandingPage, FAILED_PROJECTS_MS } = await import("../server/landingPages");

    expect(await readLandingPage("new")).toBeNull();
    // Another slug is its own read, not answered by the miss.
    expect((await readLandingPage("base"))?.name).toBe("Base");
    expect(await readLandingPage("new")).toBeNull();
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(FAILED_PROJECTS_MS);
    expect((await readLandingPage("new"))?.name).toBe("New");
  });

  it("answers a failed cold read with the same error until the short wait passes", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry)
      .mockRejectedValueOnce(new Error("returned 429"))
      .mockImplementationOnce(page("ethereum", "Ethereum"));
    const { readLandingPage, FAILED_PROJECTS_MS } = await import("../server/landingPages");

    await expect(readLandingPage("ethereum")).rejects.toThrow("returned 429");
    await expect(readLandingPage("ethereum")).rejects.toThrow("returned 429");
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(FAILED_PROJECTS_MS);
    expect((await readLandingPage("ethereum"))?.name).toBe("Ethereum");
  });
});
