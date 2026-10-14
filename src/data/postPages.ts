import { isPublished } from "./analysis.ts";
import type { RawExploitPost } from "./exploitPosts.ts";
import { EXPLOIT_TYPE, exploitPostPath, toExploitRow } from "./exploitPosts.ts";

/**
 * Where each published post is read on the site (content doc B2).
 *
 * WHY THE SITEMAP STARTS FROM POSTS
 *
 * A page earns its place in the sitemap through what was written for it, so the
 * list is built from the published posts, each one asked where it lives. Every
 * post carries a `type`, and the list endpoint returns it with `metadata`, so
 * this needs no request beyond the list: one case per type. Today that is the
 * exploit analyses; the narrative pages add theirs here.
 *
 * A published post with no page is counted, not dropped silently: a new type the
 * sitemap does not place yet, or a decline published by mistake, should show up
 * in the build log rather than as a page that quietly never reaches search.
 */

export interface PostPage {
  path: string;
  /** When the post last changed, as ISO 8601: `modified`, else `published_at`. */
  lastmod: string | undefined;
}

/** The site path a published post is read at, or null when it has none. */
export function postPagePath(post: RawExploitPost): string | null {
  if (post.type === EXPLOIT_TYPE) {
    const row = toExploitRow(post);
    return row ? exploitPostPath(row.slug) : null;
  }
  // Other types add their case here, e.g. "trending-narrative".
  return null;
}

const isoOrUndefined = (value: unknown): string | undefined => {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/** Every page that carries a published post, once each. */
export function postPages(posts: RawExploitPost[]): { pages: PostPage[]; unplaced: number } {
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
    if (!existing || (lastmod && (!existing.lastmod || lastmod > existing.lastmod))) {
      pages.set(path, { path, lastmod });
    }
  }

  return { pages: [...pages.values()], unplaced };
}
