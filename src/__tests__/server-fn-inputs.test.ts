import { beforeEach, describe, expect, it, vi } from "vitest";
import { DIGEST_ENTITIES } from "../data/digestEntities";

/**
 * Server functions are public endpoints of their own: anyone can call them
 * with any input, whatever the route that normally calls them allows. These
 * two each start upstream requests, so they check their input themselves
 * (security audit, finding 6).
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchWithRetry: vi.fn(),
  fetchJsonSoft: vi.fn(),
}));

const LIST = "https://api.test/ui/landing-pages/";

/** The landing-page list as the API pages it, then each page by slug. */
const api = (slugs: string[], { listFails = false } = {}) => (url: string) => {
  if (url === LIST) {
    return Promise.resolve(
      listFails
        ? null
        : Response.json({ results: slugs.map((slug) => ({ slug, name: slug, is_published: slug !== "draft" })) })
    );
  }
  const slug = decodeURIComponent(url.slice(LIST.length).replace(/\/$/, ""));
  return Promise.resolve(Response.json({ slug, name: slug }));
};

describe("getDigest's input", () => {
  it("is a published digest's slug, mapped to that entity's tag", async () => {
    const { digestTagFor } = await import("../server/thisWeek");
    for (const entity of DIGEST_ENTITIES) {
      expect(digestTagFor(entity.slug)).toBe(entity.tag);
    }
  });

  it("refuses free-form tags, including a real entity's own tag list", async () => {
    const { digestTagFor } = await import("../server/thisWeek");
    for (const bad of ["banana", "avalanche,avalanche-2", "Bitcoin", "", "constructor", "__proto__"]) {
      expect(() => digestTagFor(bad), `${bad} must not reach the API`).toThrow("not a digest entity");
    }
    for (const bad of [undefined, null, 1, ["bitcoin"], { slug: "bitcoin" }]) {
      expect(() => digestTagFor(bad)).toThrow("not a digest entity");
    }
  });
});

describe("getLandingPage's input", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    const { resetLandingPages, resetProjects } = await import("../server/landingPages");
    resetLandingPages();
    resetProjects();
    return () => vi.useRealTimers();
  });

  it("is shaped like a slug", async () => {
    const { isProjectSlug } = await import("../server/landingPages");
    for (const good of ["ethereum", "ai", "the-graph", "rocket_pool", "x".repeat(100)]) {
      expect(isProjectSlug(good), good).toBe(true);
    }
    for (const bad of ["", "Ethereum", "a b", "../api", "eth%2f", "x".repeat(101), undefined, 7, ["ethereum"]]) {
      expect(isProjectSlug(bad), String(bad)).toBe(false);
    }
  });

  it("fetches a listed page", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(api(["ethereum", "base"]));
    const { readListedLandingPage } = await import("../server/landingPages");

    expect((await readListedLandingPage("ethereum"))?.name).toBe("ethereum");
    expect(vi.mocked(fetchWithRetry).mock.calls.map(([url]) => url)).toEqual([LIST, `${LIST}ethereum/`]);
  });

  it("answers an unlisted slug without asking the API for it", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(api(["ethereum"]));
    const { readListedLandingPage } = await import("../server/landingPages");

    for (let i = 0; i < 50; i++) expect(await readListedLandingPage(`random-${i}`)).toBeNull();
    expect(vi.mocked(fetchWithRetry).mock.calls.map(([url]) => url)).toEqual([LIST]);
  });

  it("still serves an unpublished page, which renders as noindex", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(api(["ethereum", "draft"]));
    const { readListedLandingPage, readProjects } = await import("../server/landingPages");

    expect((await readListedLandingPage("draft"))?.slug).toBe("draft");
    expect((await readProjects()).map((project) => project.slug)).toEqual(["ethereum"]);
  });

  it("lets a slug through when the list cannot be read", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation(api([], { listFails: true }));
    const { readListedLandingPage } = await import("../server/landingPages");

    expect((await readListedLandingPage("ethereum"))?.name).toBe("ethereum");
  });

  it("lets a slug through when reading the list throws", async () => {
    const { fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchWithRetry).mockImplementation((url) =>
      url === LIST ? Promise.reject(new Error("returned 429")) : api([])(url)
    );
    const { readListedLandingPage } = await import("../server/landingPages");

    expect((await readListedLandingPage("ethereum"))?.name).toBe("ethereum");
  });
});
