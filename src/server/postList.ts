import { API_BASE, fetchJsonSoft, fetchWithRetry } from "./apiFetch";
import type { Hold } from "./hold";
import { hold } from "./hold";
import type { RawPost } from "../data/analysis";

/**
 * The published posts of one type, read and held: the one reader behind the
 * exploit, trending, governance proposal and podcast pages.
 *
 * WHY ONE READER
 *
 * Each type had its own copy of this walk, and the copies drifted: one logged a
 * failed page and another did not, one named the 2,000-post cap and the rest
 * reported it as an outage, one backed off after a failure and three retried on
 * every render. Each type still decides what a short read means for its pages
 * (the exploit hub renders one and says it is partial; the others refuse it),
 * so this answers the rows it got and whether the read was whole, and decides
 * nothing else.
 *
 * HOW IT IS HELD
 *
 * Through `hold`, fresh for `POST_LIST_FRESH_MS`: a publish shows within a
 * minute. Only a whole read is held as good, and once one is held a short read
 * never replaces it. A short read with nothing good behind it is answered for
 * `FAILED_LIST_MS` before the list is walked again, so in an outage every
 * render, many of which only want the list for their links, does not start
 * another walk three attempts deep.
 *
 * The cost is chosen: for up to `FAILED_LIST_MS` after the API recovers, a page
 * that refuses a short read (the trending pages, the governance report past its
 * first page, the podcast hub) still answers its 5xx, and the exploit hub still
 * shows its partial list. Before this was shared only the podcast list held a
 * failure; the others walked the list again on every request of an outage.
 *
 * The post sitemap walks every type at once and refuses any short read, so it
 * keeps its own walk (`server/postSitemap.ts`).
 */

const PAGE_SIZE = 100;

/** 2,000 posts of one type. Reaching it is reported as itself, not as an outage. */
export const MAX_PAGES = 20;

/** How long one read serves every render before a refresh is started. */
export const POST_LIST_FRESH_MS = 60_000;

/** How long a short read with nothing good behind it is answered before the next walk. */
export const FAILED_LIST_MS = 30_000;

interface RawListPage {
  results?: unknown[];
  links?: { next?: string | null };
}

export interface PostList<Row> {
  /** Every row `toRow` accepted, in `sort` order when one is given. */
  rows: Row[];
  /** Every page answered; when false the rows are a floor. */
  ok: boolean;
  /** When the walk finished. */
  asOf: string;
}

/** Every post of `type`, raw, and whether every page answered. */
export async function walkPostList(type: string): Promise<{ raw: RawPost[]; ok: boolean }> {
  const raw: RawPost[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<RawListPage>(
      `${API_BASE}/posts/?type=${type}&limit=${PAGE_SIZE}&page=${page}`
    );
    // A failed page ends the walk: there is no `links.next` to follow past it.
    if (body === null) {
      console.error(`${type}: the post list did not answer on page ${page}`);
      return { raw, ok: false };
    }
    const rows = Array.isArray(body.results) ? body.results : [];
    // A row that is not an object is skipped, not read: `null` would throw.
    raw.push(...rows.filter((row): row is RawPost => !!row && typeof row === "object"));
    if (rows.length < PAGE_SIZE || !body.links?.next) return { raw, ok: true };
  }
  console.error(`${type}: more than ${MAX_PAGES * PAGE_SIZE} posts; refusing a truncated list`);
  return { raw, ok: false };
}

/**
 * The posts of `type` as rows, held. Marked like `hold`, for the reason given
 * there: the callers are reached by the client bundle, and an unmarked call at
 * module level would keep this and `apiFetch` in it.
 */
/* @__NO_SIDE_EFFECTS__ */
export function holdPostList<Row>(
  type: string,
  toRow: (raw: RawPost) => Row | null,
  sort?: (a: Row, b: Row) => number
): Hold<PostList<Row>> {
  const load = async (): Promise<PostList<Row>> => {
    const { raw, ok } = await walkPostList(type);
    const rows = raw.map(toRow).filter((row): row is Row => row !== null);
    if (sort) rows.sort(sort);
    return { rows, ok, asOf: new Date().toISOString() };
  };
  return hold(load, POST_LIST_FRESH_MS, {
    keep: (value) => value.ok,
    failMs: FAILED_LIST_MS,
    onBackgroundError: (error) => console.error(`${type}: refreshing the post list failed`, error),
  });
}

/**
 * One post by slug, or null when the API answers 404. Any other failure throws,
 * so a page is served as a 5xx the edge does not cache, rather than as a 404 it
 * does. That includes a 200 whose body is not an object: a fault in the API,
 * not an absent post, so it must not be cached as a 404. The slug must already
 * be checked: it is interpolated into the URL.
 */
export async function fetchPost(slug: string): Promise<RawPost | null> {
  const res = await fetchWithRetry(`${API_BASE}/posts/${encodeURIComponent(slug)}/`);
  if (!res) return null;
  const raw: unknown = await res.json();
  if (!raw || typeof raw !== "object") throw new Error(`post ${slug} is not a post`);
  return raw as RawPost;
}

/**
 * A warning logged once per key, `slug@modified` by convention, so each version
 * of a post with a problem is reported once rather than on every render. Cleared
 * at a cap, which only means a long-lived problem is reported again.
 */
/* @__NO_SIDE_EFFECTS__ */
export function warnOncePer(cap = 1000): { warn(key: string, message: string): void; clear(): void } {
  const warned = new Set<string>();
  return {
    warn(key, message) {
      if (warned.has(key)) return;
      if (warned.size >= cap) warned.clear();
      warned.add(key);
      console.warn(message);
    },
    clear() {
      warned.clear();
    },
  };
}
