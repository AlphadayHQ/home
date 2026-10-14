import { describe, expect, it } from "vitest";
import { postPagePath, postPages } from "../data/postPages";

/**
 * The sitemap lists the pages that carry a published post. These pin where a
 * post is placed, that a post is never placed on a page that would not show it,
 * and that a post the site cannot place is counted rather than lost.
 */

const incident = (overrides: Record<string, unknown> = {}) => ({
  id: "200",
  slug: "meter-token-prices-crash-after-unauthorized-mint",
  title: "Meter token prices crash after unauthorized mint",
  sourceSlug: "web3isgoinggreat-com",
  ...overrides,
});

const provenance = (incidentId: number) =>
  "```alphaday-provenance\n" +
  JSON.stringify({ incidentId, incidentDate: null, sourcesRead: [] }) +
  "\n```";

const post = (overrides: Record<string, unknown> = {}) => ({
  slug: "meter-exploit-analysis",
  title: "Meter exploit analysis",
  status: 1,
  published_at: "2026-10-07T19:18:10Z",
  content: `Words.\n\n${provenance(200)}`,
  ...overrides,
});

const byId = (...rows: ReturnType<typeof incident>[]) =>
  new Map(rows.map((row) => [row.id, row]));

describe("where a post is read", () => {
  it("places an exploit analysis on its incident's page", () => {
    expect(postPagePath(post(), byId(incident()))).toBe(
      "/security/exploits/meter-token-prices-crash-after-unauthorized-mint"
    );
  });

  it("places an analysed reproduction too, which is indexable once analysed", () => {
    const reproduction = incident({ sourceSlug: "github-com" });
    expect(postPagePath(post(), byId(reproduction))).not.toBeNull();
  });

  it("does not place a post on a page that would not show it", () => {
    // The title cross-check fails, so the page drops the analysis.
    expect(
      postPagePath(post({ title: "Duelbits exploit analysis" }), byId(incident()))
    ).toBeNull();
    // The incident is not in the feed.
    expect(postPagePath(post(), byId())).toBeNull();
  });

  it("never places a draft or an archived post", () => {
    expect(postPagePath(post({ status: 2 }), byId(incident()))).toBeNull();
    expect(postPagePath(post({ status: 0 }), byId(incident()))).toBeNull();
  });

  it("never places a decline, even one published by mistake", () => {
    const decline = post({
      content: `> DECLINED: The project shut down; no attack.\n\n${provenance(200)}`,
    });
    expect(postPagePath(decline, byId(incident()))).toBeNull();
  });

  it("has no page yet for a post of another kind", () => {
    expect(
      postPagePath(post({ content: "A post with no provenance." }), byId(incident()))
    ).toBeNull();
  });
});

describe("the list the sitemap gets", () => {
  it("lists each page once, dated by the post that changed last", () => {
    const { pages } = postPages(
      [
        post({ slug: "older", published_at: "2026-10-01T00:00:00Z" }),
        post({ slug: "newer", published_at: "2026-10-07T00:00:00Z" }),
      ],
      [incident()]
    );
    expect(pages).toEqual([
      {
        path: "/security/exploits/meter-token-prices-crash-after-unauthorized-mint",
        lastmod: "2026-10-07T00:00:00.000Z",
      },
    ]);
  });

  it("counts published posts it could not place, and ignores unpublished ones", () => {
    const { pages, unplaced } = postPages(
      [
        post(),
        post({ slug: "narrative", content: "No provenance block." }),
        post({ slug: "draft", status: 2, content: "Draft." }),
      ],
      [incident()]
    );
    expect(pages).toHaveLength(1);
    expect(unplaced).toBe(1);
  });

  it("dates a page by when its post was last edited, not first published", () => {
    const { pages } = postPages(
      [post({ published_at: "2026-10-07T19:18:10Z", modified: "2026-10-13T08:00:00Z" })],
      [incident()]
    );
    expect(pages[0].lastmod).toBe("2026-10-13T08:00:00.000Z");
  });
});
