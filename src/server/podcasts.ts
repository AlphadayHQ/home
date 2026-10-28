import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft, fetchWithRetry } from "./apiFetch";
import { hold, withinMs } from "./hold";
import type { RawPost } from "../data/analysis";
import type { PodcastPost, PodcastRow } from "../data/podcastPosts";
import {
  HUB_PAGE_SIZE,
  PODCAST_TYPE,
  byNewest,
  isPostSlug,
  showsOf,
  toPodcastPost,
  toPodcastRow,
} from "../data/podcastPosts";
import { pageCount, pageOf, parsePage } from "../data/trending";

/**
 * Podcast insight pages, read from posts. The rules are in
 * `data/podcastPosts.ts`.
 *
 * Two reads, as for governance proposals: the list of published insights, held
 * in memory and shared by the hub and every page's "more from the podcasts";
 * and one post by slug for a page.
 *
 * The hub is nothing but the list, so a short read throws, a 5xx the edge does
 * not cache, and the edge keeps its last good copy: rendered short it would drop
 * pages and could fall under its indexing floor. A page renders without the
 * list, which only feeds its links to other pages.
 *
 * WHAT IS TRUSTED, AND WHERE
 *
 * The list carries no body, so the hub, its floor, "more from the podcasts" and
 * the sitemap trust the row, as every other post type does. A page opens its
 * post and refuses an empty or decline body the row cannot show; a published
 * post refused that way is listed but 404s, so it is logged, once per version,
 * for a person to fix. Opening every listed post to check would make the hub
 * cost a request per row for a case the agent's gate and the reviewer already
 * stop; refusing such a body at publish is the backend's to do, for every type.
 */

const PAGE_SIZE = 100;

/** 2,000 posts. Reaching it reports a short read rather than truncating quietly. */
const MAX_PAGES = 20;

/** How long one read serves every render before a refresh is started. */
export const FRESH_MS = 60_000;

/**
 * How long a failed list read is answered before it is tried again. A page only
 * needs the list for its links, and in an outage every render would otherwise
 * walk it again.
 */
export const FAILED_LIST_MS = 30_000;

/** How many other pages a page links to. */
export const OTHERS = 6;

/**
 * How long a page waits for the list behind "more from the podcasts". It
 * renders without them, so a cold list leaves them out rather than holding it.
 */
export const LIST_WAIT_MS = 800;

interface RawListPage {
  results?: unknown[];
  links?: { next?: string | null };
}

export interface PodcastList {
  rows: PodcastRow[];
  /** Every page answered; when false the rows are a floor. */
  ok: boolean;
}

async function loadList(): Promise<PodcastList> {
  const raw: RawPost[] = [];
  let ok = true;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<RawListPage>(
      `${API_BASE}/posts/?type=${PODCAST_TYPE}&limit=${PAGE_SIZE}&page=${page}`
    );
    if (body === null) {
      console.error(`podcasts: the post list did not answer on page ${page}`);
      ok = false;
      break;
    }
    const rows = Array.isArray(body.results) ? body.results : [];
    // A row that is not an object is skipped, not read: `null` would throw.
    raw.push(...rows.filter((row): row is RawPost => !!row && typeof row === "object"));
    if (rows.length < PAGE_SIZE || !body.links?.next) break;
    if (page === MAX_PAGES) {
      console.error(`podcasts: more than ${MAX_PAGES * PAGE_SIZE} posts; refusing a truncated list`);
      ok = false;
    }
  }
  const rows = raw
    .map(toPodcastRow)
    .filter((row): row is PodcastRow => row !== null)
    .sort(byNewest);
  return { rows, ok };
}

// Only a whole read is held; see `server/exploits.ts`.
const list = hold(loadList, FRESH_MS, {
  keep: (value) => value.ok,
  failMs: FAILED_LIST_MS,
  onBackgroundError: (error) => console.error("podcasts: refreshing the post list failed", error),
});

export const readPodcastList = (): Promise<PodcastList> => list.read();

/** For tests: forget the held list and what has been logged. */
export function resetPodcastList(): void {
  list.reset();
  warned.clear();
}

export interface PodcastHub {
  /** This page of the hub, newest first. */
  rows: PodcastRow[];
  /** Every page published: the hub's indexing floor reads this. */
  total: number;
  page: number;
  pages: number;
}

/** One page of the hub, or null past the last page. A short read throws: see the header. */
export async function buildPodcastHub(page: number): Promise<PodcastHub | null> {
  const { rows, ok } = await readPodcastList();
  if (!ok) throw new Error("podcasts: the list read short, so the hub could drop a page");
  const shown = pageOf(rows, page, HUB_PAGE_SIZE);
  if (!shown) return null;
  return { rows: shown, total: rows.length, page, pages: pageCount(rows.length, HUB_PAGE_SIZE) };
}

export const getPodcastHub = createServerFn({ method: "GET" })
  .validator((value: number) => {
    // The route answers 404 for anything that is not a page number first.
    const page = parsePage(value);
    if (page === null) throw new Error(`getPodcastHub: ${String(value)} is not a page number`);
    return page;
  })
  .handler(async ({ data: page }) => buildPodcastHub(page));

/** Another page as a page links to it: no more than it shows, since it ships in the page's payload. */
export interface OtherPage {
  slug: string;
  title: string;
  shows: string[];
}

export interface PodcastArticle {
  post: PodcastPost;
  /** Other pages: those quoting the same shows first, then the newest. */
  others: OtherPage[];
}

/**
 * Posts already logged as refused, by `slug@modified`, so each version is
 * reported once rather than on every render. Cleared at a cap, which only means
 * a long-lived problem is reported again.
 */
const warned = new Set<string>();
const WARNED_CAP = 1000;

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  if (warned.size >= WARNED_CAP) warned.clear();
  warned.add(key);
  console.warn(message);
}

/**
 * One page, or null when there is none to show at that slug.
 *
 * Only a 404 means "no such post". Any other failure throws, so it is served as
 * a 5xx the edge does not cache, rather than as a 404 it does.
 */
export async function buildPodcastArticle(slug: string): Promise<PodcastArticle | null> {
  const [res, read] = await Promise.all([
    fetchWithRetry(`${API_BASE}/posts/${encodeURIComponent(slug)}/`),
    withinMs(readPodcastList(), LIST_WAIT_MS),
  ]);
  const raw = res ? ((await res.json()) as RawPost) : null;
  if (!raw) return null;
  const post = toPodcastPost(raw);
  if (!post) {
    const row = toPodcastRow(raw);
    // Listed, so on the hub and in the sitemap, but nothing to show: see the header.
    if (row) {
      warnOnce(
        `${row.slug}@${row.modified}`,
        `podcasts: post ${row.slug} is published but its body is empty or a decline; it is not shown`
      );
    }
    return null;
  }
  // One URL per post: a post answered for any other slug is not this page.
  if (post.slug !== slug) return null;

  const rows = (read?.rows ?? []).filter((row) => row.slug !== post.slug);
  const shows = new Set(showsOf(post.meta).map((show) => show.toLowerCase()));
  const sameShow = new Set(
    rows.filter((row) => showsOf(row.meta).some((show) => shows.has(show.toLowerCase())))
  );
  const others = [...sameShow, ...rows.filter((row) => !sameShow.has(row))]
    .slice(0, OTHERS)
    .map((row) => ({ slug: row.slug, title: row.title, shows: showsOf(row.meta) }));
  return { post, others };
}

/** The validator is a boundary: the slug is interpolated into an upstream URL. */
export const getPodcastArticle = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (!isPostSlug(slug)) {
      throw new Error(`getPodcastArticle: ${String(slug)} is not a post slug`);
    }
    return slug;
  })
  .handler(async ({ data: slug }) => buildPodcastArticle(slug));
