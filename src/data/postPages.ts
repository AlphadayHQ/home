import type { RawPost } from "./analysis.ts";
import { isPublished } from "./analysis.ts";
import { EXPLOIT_TYPE, exploitPostPath, toExploitRow } from "./exploitPosts.ts";
import {
  NARRATIVE_HUB,
  NARRATIVE_HUB_FLOOR,
  NARRATIVE_TYPE,
  narrativePath,
  toNarrativeRow,
} from "./narratives.ts";

/**
 * Where each published post is read on the site (content docs B2, B3).
 *
 * WHY THE SITEMAP STARTS FROM POSTS
 *
 * A page earns its place in the sitemap through what was written for it, so the
 * list is built from the published posts, each one asked where it lives. Every
 * post carries a `type`, and the list endpoint returns it with `metadata`, so
 * this needs no request beyond the list: one case per type, each going through
 * the same function its pages use, so the sitemap lists a page exactly when the
 * page shows the post.
 *
 * A published post with no page is counted, not dropped silently: a new type the
 * sitemap does not place yet, or a decline published by mistake, should show up
 * in the log rather than as a page that quietly never reaches search.
 */

export interface PostPage {
  path: string;
  /** When the post last changed, as ISO 8601: `modified`, else `published_at`. */
  lastmod: string | undefined;
}

/** The site path a published post is read at, or null when it has none. */
export function postPagePath(post: RawPost): string | null {
  if (post.type === EXPLOIT_TYPE) {
    const row = toExploitRow(post);
    return row ? exploitPostPath(row.slug) : null;
  }
  if (post.type === NARRATIVE_TYPE) {
    // Two posts on one topic are one page; `postPages` lists it once.
    const row = toNarrativeRow(post);
    return row ? narrativePath(row.tag) : null;
  }
  return null;
}

/**
 * Promoted hubs whose listing depends on what is published. Each is listed here,
 * in the live posts sitemap, once the pages under it reach the floor its route
 * indexes it at (a count of distinct pages, as the route's is of distinct
 * topics), and the build leaves it out of `pages.xml`, which reads this list.
 * Listed at build, a hub under its floor would be submitted while it is served
 * `noindex`, until the next deploy.
 */
export const POST_HUBS: ReadonlyArray<{ path: string; floor: number }> = [
  { path: NARRATIVE_HUB, floor: NARRATIVE_HUB_FLOOR },
];

const isoOrUndefined = (value: unknown): string | undefined => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const newer = (a: string | undefined, b: string | undefined): string | undefined =>
  a && (!b || a > b) ? a : b;

/** Every page that carries a published post, once each, and the hubs they fill. */
export function postPages(posts: RawPost[]): { pages: PostPage[]; unplaced: number } {
  const pages = new Map<string, PostPage>();
  let unplaced = 0;

  for (const post of posts) {
    if (!isPublished(post.status)) continue;
    const path = postPagePath(post);
    if (!path) {
      unplaced += 1;
      continue;
    }
    const lastmod = isoOrUndefined(post.modified ?? post.published_at);
    const existing = pages.get(path);
    if (!existing) pages.set(path, { path, lastmod });
    else existing.lastmod = newer(lastmod, existing.lastmod);
  }

  const listed = [...pages.values()];
  for (const hub of POST_HUBS) {
    const under = listed.filter((page) => page.path.startsWith(`${hub.path}/`));
    if (under.length >= hub.floor) {
      // The hub changes when a page under it does.
      pages.set(hub.path, {
        path: hub.path,
        lastmod: under.reduce<string | undefined>((at, page) => newer(page.lastmod, at), undefined),
      });
    }
  }

  return { pages: [...pages.values()], unplaced };
}
