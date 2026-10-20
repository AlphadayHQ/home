import { describe, expect, it } from "vitest";
import { postPagePath, postPages } from "../data/postPages";

/**
 * The sitemap lists the pages that carry a published post, from the post list
 * alone. These pin where an exploit analysis is placed (trending posts are
 * pinned in `trending.test.ts`), that nothing unpublished or declined is, and that a
 * post the site cannot place is counted rather than lost.
 */

const post = (overrides: Record<string, unknown> = {}) => ({
  slug: "meter-exploit-analysis",
  title: "Meter exploit analysis",
  status: 1,
  type: "exploit-analysis",
  published_at: "2026-10-07T19:18:10Z",
  metadata: { schema: 1, incidentId: 200, kind: "reported" },
  ...overrides,
});

describe("where a post is read", () => {
  it("places an exploit analysis at its own slug", () => {
    expect(postPagePath(post())).toBe("/security/exploits/meter-exploit-analysis");
  });

  it("never places a draft, an archived post, or a decline", () => {
    expect(postPagePath(post({ status: 2 }))).toBeNull();
    expect(postPagePath(post({ status: 0 }))).toBeNull();
    expect(
      postPagePath(post({ metadata: { schema: 1, incidentId: 107, declined: true } }))
    ).toBeNull();
  });

  it("has no page for an unknown type, for none, or for metadata of the wrong kind", () => {
    expect(postPagePath(post({ type: "newsletter" }))).toBeNull();
    expect(postPagePath(post({ type: null }))).toBeNull();
    // A trending post carrying an exploit's metadata has no kind it knows, so no page.
    expect(postPagePath(post({ type: "trending-narrative" }))).toBeNull();
  });
});

describe("the list the sitemap gets", () => {
  it("lists each page once, dated by when it last changed", () => {
    const { pages } = postPages([
      post({ published_at: "2026-10-01T00:00:00Z", modified: "2026-10-13T08:00:00Z" }),
      post({ published_at: "2026-10-07T00:00:00Z" }),
    ]);
    expect(pages).toEqual([
      {
        path: "/security/exploits/meter-exploit-analysis",
        lastmod: "2026-10-13T08:00:00.000Z",
      },
    ]);
  });

  it("counts published posts it could not place, and ignores unpublished ones", () => {
    const { pages, unplaced } = postPages([
      post(),
      post({ slug: "a-newsletter", type: "newsletter" }),
      post({ slug: "draft-exploit-analysis", status: 2 }),
    ]);
    expect(pages).toHaveLength(1);
    expect(unplaced).toBe(1);
  });
});
