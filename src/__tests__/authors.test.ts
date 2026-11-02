import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import { AUTHORS, authorBySlug, authorForType, authorJsonLd, authorPath, authorPaths } from "../data/authors";
import AuthorPage from "../pages/author";
import { AVATARS } from "../components/authorAvatars";
import Byline from "../components/Byline";
import { EXPLOIT_TYPE } from "../data/exploitPosts";
import { GOVERNANCE_TYPE } from "../data/governanceProposals";
import { PODCAST_TYPE } from "../data/podcastPosts";
import { TRENDING_TYPE } from "../data/trending";
import { indexStateFor, staticPaths } from "../seo/indexState";
import { canonicalFor } from "../seo/head";

/**
 * The research bylines. What has to hold: every bylined type has exactly one
 * name, with an avatar and a bio page that carries its bio and its rules.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

describe("the bylines", () => {
  it("are one per bylined post type, each with an avatar", () => {
    const types = [GOVERNANCE_TYPE, EXPLOIT_TYPE, PODCAST_TYPE, TRENDING_TYPE];
    expect(AUTHORS.map((author) => author.type).sort()).toEqual([...types].sort());
    for (const type of types) expect(authorForType(type)).not.toBeNull();
    for (const author of AUTHORS) expect(AVATARS, author.slug).toHaveProperty(author.slug);
    expect(authorForType("event")).toBeNull();
  });

  it("each have an indexed page with a route of its own", () => {
    const router = createRouter({ routeTree });
    for (const path of authorPaths()) {
      expect(indexStateFor(path), path).toBe("promoted");
      expect(staticPaths()).toContain(path);
      const matches = router.matchRoutes({ pathname: path, search: {} } as never);
      expect(matches[matches.length - 1]?.routeId, path).toBe("/authors/$slug");
    }
  });

  it("name the author in structured data, described by the bio", () => {
    const ld = authorJsonLd(authorForType(GOVERNANCE_TYPE)!, canonicalFor);
    expect(ld).toMatchObject({ "@type": "Person", name: "Peter", url: "https://alphaday.com/authors/peter" });
    expect(ld.description).toBe(authorBySlug("peter")!.bio[0]);
  });
});

describe("the byline", () => {
  it("names the author and links the bio page", () => {
    const html = renderToStaticMarkup(createElement(Byline, { type: EXPLOIT_TYPE }));
    expect(html).toContain(`href="${authorPath("david")}"`);
    expect(html).toContain(">David</a>");
    expect(html).toContain("Security");
  });

  it("is nothing for a type with no byline", () => {
    expect(renderToStaticMarkup(createElement(Byline, { type: "something-else" }))).toBe("");
  });
});

describe("a bio page", () => {
  it("shows the bio and every rule", () => {
    for (const author of AUTHORS) {
      const html = renderToStaticMarkup(
        createElement(AuthorPage, { page: { slug: author.slug, latest: [], total: 0 } })
      );
      for (const line of [...author.bio, ...author.rules]) {
        expect(html, author.slug).toContain(line.replace(/"/g, "&quot;").replace(/'/g, "&#x27;"));
      }
    }
  });

  let failing: boolean;

  beforeEach(async () => {
    failing = false;
    const { fetchJsonSoft } = await import("../server/apiFetch");
    vi.mocked(fetchJsonSoft).mockImplementation(async () =>
      (failing ? null : { results: [], links: { next: null } }) as never
    );
    const { resetPodcastList } = await import("../server/podcasts");
    resetPodcastList();
  });

  it("is null for a slug that is not an author", async () => {
    const { buildAuthorPage } = await import("../server/authors");
    expect(await buildAuthorPage("nobody")).toBeNull();
  });

  it("lists nothing, rather than failing, when nothing is published", async () => {
    const { buildAuthorPage } = await import("../server/authors");
    expect(await buildAuthorPage("emily")).toEqual({ slug: "emily", latest: [], total: 0 });
  });

  it("fails on a short read, rather than listing fewer pages than exist", async () => {
    failing = true;
    const { buildAuthorPage } = await import("../server/authors");
    await expect(buildAuthorPage("emily")).rejects.toThrow(/read short/);
  });
});
