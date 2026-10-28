import type { RawPost } from "./analysis.ts";
import { isPublished } from "./analysis.ts";
import { EXPLOIT_TYPE, exploitPostPath, toExploitRow } from "./exploitPosts.ts";
import {
  GOVERNANCE_SECTION,
  GOVERNANCE_TYPE,
  proposalPath,
  toProposalRow,
} from "./governanceProposals.ts";
import {
  PODCAST_HUB,
  PODCAST_HUB_FLOOR,
  PODCAST_TYPE,
  podcastPostPath,
  toPodcastRow,
} from "./podcastPosts.ts";
import type { TrendingRow } from "./trending.ts";
import {
  TRENDING_HUB,
  TRENDING_HUB_FLOOR,
  TRENDING_TYPE,
  groupTopics,
  toTrendingRow,
  trendingPostPath,
} from "./trending.ts";
import { belongsInSitemap, indexStateFor } from "../seo/indexState.ts";

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
 * A trending topic is one page however many posts it has: its page post, and
 * the updates published on it, which have no URL of their own. So trending
 * posts are grouped first (`groupTopics`, as the pages group them), the page is
 * listed once, and it is dated by its newest update. An update whose page is not
 * published has nowhere to be read and is counted as unplaced.
 *
 * A row carries no body, and a topic page refuses an empty or decline body that
 * the row cannot show; until the backend refuses those at publish, such a post
 * is listed here and logged by its page (`server/trending.ts`).
 *
 * Nothing is listed under a section, or as a hub, that `indexState.ts` does not
 * promote: the routes read the same state to decide `noindex`, so demoting one
 * there takes it out of the sitemap too.
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

/**
 * Where each type's posts are read: the section whose index state its pages
 * inherit, and the path of one post, or null when that post has no page of its
 * own. One entry per type, so adding a type is one entry here; a type with a
 * section but no path rule, or the reverse, cannot be written.
 *
 * A `Map`, not an object literal: `type` comes from the API, and "constructor"
 * must not find an inherited function and throw inside `indexStateFor`.
 */
const PLACES: ReadonlyMap<unknown, { section: string; path: (post: RawPost) => string | null }> =
  new Map([
    [
      EXPLOIT_TYPE,
      {
        section: "/security/exploits",
        path: (post: RawPost) => {
          const row = toExploitRow(post);
          return row ? exploitPostPath(row.slug) : null;
        },
      },
    ],
    [
      TRENDING_TYPE,
      {
        section: TRENDING_HUB,
        // An update is read on its page; `postPages` places it there.
        path: (post: RawPost) => {
          const row = toTrendingRow(post);
          return row?.kind === "page" ? trendingPostPath(row.slug) : null;
        },
      },
    ],
    [
      GOVERNANCE_TYPE,
      {
        section: GOVERNANCE_SECTION,
        path: (post: RawPost) => {
          const row = toProposalRow(post);
          return row ? proposalPath(row.slug) : null;
        },
      },
    ],
    [
      PODCAST_TYPE,
      {
        section: PODCAST_HUB,
        path: (post: RawPost) => {
          const row = toPodcastRow(post);
          return row ? podcastPostPath(row.slug) : null;
        },
      },
    ],
  ]);

const promoted = (path: string): boolean => belongsInSitemap(indexStateFor(path));

/** The site path a published post is read at on its own, or null when it has none. */
export function postPagePath(post: RawPost): string | null {
  const place = PLACES.get(post.type);
  return place && promoted(place.section) ? place.path(post) : null;
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
  { path: TRENDING_HUB, floor: TRENDING_HUB_FLOOR },
  { path: PODCAST_HUB, floor: PODCAST_HUB_FLOOR },
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
  const trending: TrendingRow[] = [];

  for (const post of posts) {
    if (!isPublished(post.status)) continue;
    if (post.type === TRENDING_TYPE && promoted(TRENDING_HUB)) {
      const row = toTrendingRow(post);
      if (row) trending.push(row);
      else unplaced += 1;
      continue;
    }
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

  const { topics, orphans } = groupTopics(trending);
  unplaced += orphans.length;
  for (const topic of topics) {
    const path = trendingPostPath(topic.page.slug);
    pages.set(path, { path, lastmod: topic.latest });
  }

  const listed = [...pages.values()];
  for (const hub of POST_HUBS) {
    const under = listed.filter((page) => page.path.startsWith(`${hub.path}/`));
    if (promoted(hub.path) && under.length >= hub.floor) {
      // The hub changes when a page under it does.
      pages.set(hub.path, {
        path: hub.path,
        lastmod: under.reduce<string | undefined>((at, page) => newer(page.lastmod, at), undefined),
      });
    }
  }

  return { pages: [...pages.values()], unplaced };
}
