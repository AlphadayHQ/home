import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft, fetchWithRetry } from "./apiFetch";
import { hold, holdByKey } from "./hold";
import type { RawPost } from "../data/analysis";
import { isPostSlug } from "../data/analysis";
import type { Topic, TrendingPost, TrendingRow } from "../data/trending";
import {
  HUB_PAGE_SIZE,
  TRENDING_TYPE,
  UPDATES_PAGE_SIZE,
  checkTrendingPost,
  groupTopics,
  leadOf,
  pageCount,
  pageOf,
  parsePage,
  toTrendingRow,
} from "../data/trending";

/**
 * Trending topic pages (content doc B3); the rules are in `data/trending.ts`.
 *
 * WHAT IS READ
 *
 * One filtered list, `?type=trending-narrative`, held in memory as the exploit
 * list is (`server/exploits.ts`). The hub and the sitemap are built from it
 * alone. A topic page also opens the posts it shows, its page and the updates
 * on the page of updates asked for, each held by slug and version (`modified`),
 * so a warm page makes no request and an edited post is read again.
 *
 * WHY A FAILED READ IS AN ERROR AND NOT A SMALLER PAGE
 *
 * The list decides whether every page exists and whether the hub is indexed.
 * Reading it short and rendering anyway would 404 or `noindex` pages that have
 * published posts, and the CDN would cache that. So a failed list throws, and so
 * does a topic page whose posts could not be opened; the edge keeps its last
 * good copy instead: the rule `routes/research.governance.tsx` explains. Only a
 * 404 is an answer: that post is gone, so it is left out.
 */

const PAGE_SIZE = 100;
/** 2,000 posts. Reaching it reports a short read rather than truncating quietly. */
const MAX_PAGES = 20;

/** The post list: short, so a publish shows within a minute. */
export const LIST_FRESH_MS = 60_000;

/**
 * An opened post, keyed by its version: an edit changes `modified`, and so the
 * key, so this can be long. It bounds how long a post unpublished and published
 * again unchanged keeps its old body, which is harmless.
 */
export const OPENED_FRESH_MS = 30 * 60_000;

/**
 * How long a failure to open a post is answered before it is tried again. In an
 * outage every render would otherwise retry every open, three attempts each.
 */
export const FAILED_OPEN_MS = 30_000;

/** Posts opened at once on a cold topic page. */
const CONCURRENCY = 6;

/** How many other topics a topic page links to. */
export const OTHERS = 6;

/** `fn` over `items`, at most `limit` at a time, results in input order. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface RawListPage {
  results?: unknown[];
  links?: { next?: string | null };
}

interface TrendingList {
  rows: TrendingRow[];
  /** Every page answered; when false nothing is known. */
  ok: boolean;
}

async function loadList(): Promise<TrendingList> {
  const raw: RawPost[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<RawListPage>(
      `${API_BASE}/posts/?type=${TRENDING_TYPE}&limit=${PAGE_SIZE}&page=${page}`
    );
    if (body === null) {
      console.error(`trending: the post list did not answer on page ${page}`);
      return { rows: [], ok: false };
    }
    const rows = Array.isArray(body.results) ? body.results : [];
    // A row that is not an object is skipped, not read: `null` would throw.
    raw.push(...rows.filter((row): row is RawPost => !!row && typeof row === "object"));
    if (rows.length < PAGE_SIZE || !body.links?.next) break;
    if (page === MAX_PAGES) {
      console.error(`trending: more than ${MAX_PAGES * PAGE_SIZE} posts; refusing a truncated list`);
      return { rows: [], ok: false };
    }
  }
  const rows = raw.map(toTrendingRow).filter((row): row is TrendingRow => row !== null);
  return { rows, ok: true };
}

const list = hold(loadList, LIST_FRESH_MS, {
  keep: (value) => value.ok,
  onBackgroundError: (error) => console.error("trending: refreshing the post list failed", error),
});

/**
 * Problems already logged, by `slug@modified`, so each version of a post is
 * reported once rather than on every render. Cleared at a cap, which only means
 * a long-lived problem is reported again.
 */
const warned = new Set<string>();
const WARNED_CAP = 1000;

function warnOnce(row: TrendingRow, message: string): void {
  const key = `${row.slug}@${row.modified}`;
  if (warned.has(key)) return;
  if (warned.size >= WARNED_CAP) warned.clear();
  warned.add(key);
  console.warn(message);
}

/** Every topic, the most recently changed first, or an error: see the header. */
export async function readTopics(): Promise<Topic[]> {
  const { rows, ok } = await list.read();
  if (!ok) throw new Error("trending: the posts read short, so a page with a post could be dropped");
  const { topics, orphans } = groupTopics(rows);
  for (const orphan of orphans) {
    warnOnce(
      orphan,
      `trending: update ${orphan.slug} names page ${orphan.parent}, which is not published; it is not shown`
    );
  }
  return topics;
}

/**
 * A post as opened, held by `slug@modified`: the raw post, or null for a 404.
 * A failure to open throws, and the error is answered for `FAILED_OPEN_MS`.
 */
const opened = holdByKey(
  async (key: string): Promise<RawPost | null> => {
    const slug = key.slice(0, key.indexOf("@"));
    const res = await fetchWithRetry(`${API_BASE}/posts/${encodeURIComponent(slug)}/`);
    if (!res) return null;
    const raw: unknown = await res.json();
    if (!raw || typeof raw !== "object") throw new Error(`trending: post ${slug} is not a post`);
    return raw as RawPost;
  },
  OPENED_FRESH_MS,
  { failMs: FAILED_OPEN_MS }
);

/**
 * A listed post as opened, checked, or null when it cannot be shown: gone,
 * refused for its body, or no longer what its row said (an update moved to
 * another page). Refusals are logged once per version, since the hub and the
 * sitemap still count the row until a person fixes the post.
 */
function checkOpened(row: TrendingRow, raw: RawPost | null): TrendingPost | null {
  const checked = raw ? checkTrendingPost(raw) : { problem: "it is gone" };
  const why =
    "problem" in checked
      ? checked.problem
      : checked.post.kind !== row.kind || checked.post.parent !== row.parent
        ? "it has moved since the list was read"
        : null;
  if (why || !("post" in checked)) {
    warnOnce(row, `trending: post ${row.slug} is listed but ${why}; it is not shown`);
    return null;
  }
  return checked.post;
}

const openRow = async (row: TrendingRow): Promise<TrendingPost | null> =>
  checkOpened(row, await opened.read(`${row.slug}@${row.modified}`));

/** For tests: forget everything held. */
export function resetTrending(): void {
  list.reset();
  opened.reset();
  warned.clear();
}

export interface HubRow {
  slug: string;
  topic: string;
  title: string;
  /** What is happening now: the newest update's excerpt, else the page's. */
  lead: string;
  /** The newest change to the topic, UTC ISO 8601. */
  latest: string;
  updates: number;
}

export interface TrendingHub {
  rows: HubRow[];
  /** Every topic with a page: the hub's indexing floor reads this. */
  total: number;
  page: number;
  pages: number;
  asOf: string;
}

const hubRow = (topic: Topic): HubRow => ({
  slug: topic.page.slug,
  topic: topic.page.topic,
  title: topic.page.title,
  lead: leadOf(topic).excerpt,
  latest: topic.latest,
  updates: topic.updates.length,
});

/** One page of the hub, or null past the last page. */
export async function buildTrendingHub(page: number): Promise<TrendingHub | null> {
  const topics = await readTopics();
  const shown = pageOf(topics, page, HUB_PAGE_SIZE);
  if (!shown) return null;
  return {
    rows: shown.map(hubRow),
    total: topics.length,
    page,
    pages: pageCount(topics.length, HUB_PAGE_SIZE),
    asOf: new Date().toISOString(),
  };
}

/**
 * The router hands `?page=` over unparsed; anything that is not a page number
 * is a wrong URL, which the route answers 404 before this is called.
 */
const pageArg = (value: unknown): number => {
  const page = parsePage(value);
  if (page === null) throw new Error(`trending: ${String(value)} is not a page number`);
  return page;
};

export const getTrendingHub = createServerFn({ method: "GET" })
  .validator((page: number) => pageArg(page))
  .handler(({ data: page }) => buildTrendingHub(page));

export interface TrendingArticle {
  /** The topic's page, with its body only on the first page of updates. */
  post: TrendingRow & { blocks: TrendingPost["blocks"] | null };
  /** This page's updates, newest first. */
  updates: TrendingPost[];
  /** Updates on the topic in all, across every page, less any refused here. */
  updateCount: number;
  /** The newest change to the topic among what can be shown, UTC ISO 8601. */
  latest: string;
  /**
   * What is happening now: the newest update shown, else the page. On later
   * pages, the page itself, since the newest update is not on them.
   */
  lead: { title: string; excerpt: string };
  page: number;
  pages: number;
  /** Other topics, the most recently changed first, for navigation. */
  others: HubRow[];
  asOf: string;
}

/**
 * One topic's page of updates, or null when there is none to show: no such
 * topic, a page post refused for its body, or a page number past the last.
 *
 * A post published since the list was read is opened by its slug, as an exploit
 * analysis is, so a fresh publish is not a 404 for the minute the list is stale.
 */
export async function buildTrendingArticle(
  slug: string,
  page: number
): Promise<TrendingArticle | null> {
  const topics = await readTopics();
  let topic = topics.find((candidate) => candidate.page.slug === slug);
  // A page published since the list was read, checked from the copy in hand.
  let fresh: TrendingPost | null = null;
  if (!topic) {
    // Only a page post has a URL; an update's slug is a 404.
    const res = await fetchWithRetry(`${API_BASE}/posts/${encodeURIComponent(slug)}/`);
    const raw: unknown = res ? await res.json() : null;
    const row = raw && typeof raw === "object" ? toTrendingRow(raw as RawPost) : null;
    if (!row || row.kind !== "page") return null;
    fresh = checkOpened(row, raw as RawPost);
    if (!fresh) return null;
    topic = { page: row, updates: [], latest: row.modified };
  }

  const updates = pageOf(topic.updates, page, UPDATES_PAGE_SIZE);
  if (!updates) return null;

  // The page's own body leads the first page only; later pages are older updates.
  const [pagePost, opened] = await Promise.all([
    page === 1 ? (fresh ?? openRow(topic.page)) : null,
    mapLimit(updates, CONCURRENCY, openRow),
  ]);
  if (page === 1 && !pagePost) return null;
  const shown = opened.filter((post): post is TrendingPost => post !== null);

  // An update refused here is not shown, so it does not lead, date or count.
  const refused = new Set(updates.filter((_, at) => !opened[at]).map((update) => update.slug));
  const kept = topic.updates.filter((update) => !refused.has(update.slug));
  const latest = kept.reduce(
    (at, update) => (update.modified > at ? update.modified : at),
    topic.page.modified
  );
  // Later pages do not show the newest update, so they lead with the page itself.
  const lead = page === 1 ? (shown[0] ?? topic.page) : topic.page;
  const others = topics.filter((other) => other.page.slug !== slug).slice(0, OTHERS).map(hubRow);

  return {
    post: { ...topic.page, blocks: pagePost?.blocks ?? null },
    updates: shown,
    updateCount: kept.length,
    latest,
    lead: { title: lead.title, excerpt: lead.excerpt },
    page,
    pages: pageCount(topic.updates.length, UPDATES_PAGE_SIZE),
    others,
    asOf: new Date().toISOString(),
  };
}

/**
 * The validator is a boundary, not a formality: the slug is interpolated into an
 * upstream URL.
 */
export const getTrendingArticle = createServerFn({ method: "GET" })
  .validator(({ slug, page }: { slug: string; page: number }) => {
    if (!isPostSlug(slug)) {
      throw new Error(`getTrendingArticle: ${String(slug)} is not a post slug`);
    }
    return { slug, page: pageArg(page) };
  })
  .handler(({ data }) => buildTrendingArticle(data.slug, data.page));
