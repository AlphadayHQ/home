import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft, fetchWithRetry } from "./apiFetch";
import { hold, holdByKey } from "./hold";
import { PERIOD } from "./thisWeek";
import type { RawPost } from "../data/analysis";
import { safeHref } from "../data/analysis";
import type {
  Attention,
  NarrativePost,
  NarrativeRow,
  RawTrending,
  TrendingTopic,
} from "../data/narratives";
import {
  NARRATIVE_TYPE,
  byNarrative,
  checkNarrativePost,
  isNarrativeSlug,
  shapeTrending,
  slugName,
  toNarrativeRow,
  validDate,
} from "../data/narratives";

/**
 * Narrative pages (content doc B3); the rules are in `data/narratives.ts`.
 *
 * WHAT A PAGE EXISTS FOR
 *
 * A topic gets a page when it is trending now or has a published post. Anything
 * else 404s: tags number in the tens of thousands, and rendering a page of
 * counts for every one would be an unbounded set of thin URLs. A trending topic
 * with no post yet renders `noindex`, so a reader following the hub lands on
 * the numbers and headlines; it is indexed once a reviewed post is on it.
 *
 * WHAT IS READ
 *
 * The posts are one filtered list, `?type=trending-narrative`, whose rows carry
 * each post's tag in `metadata`. The hub, its indexing floor and the posts
 * sitemap trust the row (`toNarrativeRow`), as the exploit tier does: a decline
 * is caught there by its flag or its excerpt. A topic page opens its own post,
 * one request, and checks what the row cannot show: that the body is worth
 * indexing, and that the post is still on this tag.
 *
 * The one case the row cannot catch is a post published with an empty body, or
 * a decline's one line under a normal excerpt. Its topic page refuses it and
 * logs it, and serves `noindex` (or 404, if the topic is not trending) while
 * the hub and the sitemap still count it, until a person fixes the post. The
 * backend closing that at publish is the fix; it is ticketed.
 *
 * The attention numbers are the expensive part: a tagged news count takes 1–3s
 * upstream (measured 16 October) and the hub wants two per row. They move over
 * days, not seconds, so each is held (`server/hold.ts`): a warm hub makes no
 * upstream request at all, and a stale one is answered at once while it
 * refreshes behind the reader.
 *
 * WHY A FAILED READ IS AN ERROR AND NOT A SMALLER PAGE
 *
 * The list decides whether every page exists and whether it is indexed.
 * Reading it short and rendering anyway would 404 or `noindex` pages that have
 * published posts, and the CDN would cache that. So a failed list throws, and so
 * does a topic page whose post could not be opened; the edge keeps its last
 * good copy instead: the rule `routes/research.governance.tsx` explains.
 */

const NEWS = "items/news";
const PODCASTS = "items/podcasts";
const VIDEOS = "items/videos";

const PAGE_SIZE = 100;
/** 2,000 posts. Reaching it reports a short read rather than truncating quietly. */
const MAX_PAGES = 20;

/** The post list, and each opened post: short, so a publish shows within a minute. */
export const LIST_FRESH_MS = 60_000;
/** The trending list is rescored every six hours upstream. */
export const TRENDING_FRESH_MS = 10 * 60_000;
/** Counts over 30 days, podcasts, video, all news, and the hub's 7-day counts. */
export const COUNT_FRESH_MS = 30 * 60_000;
/**
 * A topic page's week: its 7-day count and its headlines. Shorter than the
 * counts, because the headlines are the newest thing on the page.
 */
export const WEEK_FRESH_MS = 10 * 60_000;
/**
 * How long a failed count is answered as unknown before it is tried again. A
 * count that keeps failing would otherwise be retried, three attempts at a time,
 * by every render, and hold a concurrency slot on the hub while it does.
 */
export const FAILED_COUNT_MS = 60_000;

/** Headlines shown on a page: enough to show what the coverage is about. */
const HEADLINES = 8;

/**
 * Topics counted at once while the counts are cold. Uncapped, a cold hub's
 * reads would all land on the API together.
 */
const CONCURRENCY = 6;

/**
 * Topics that have cooled but keep their row because they are written up: only
 * the most recently updated this many get counts. The rest list with "–", so a
 * cold hub does not slow with every page ever written.
 */
const COOLED_COUNTED = 10;

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

export interface NarrativeList {
  rows: NarrativeRow[];
  /** Every page answered; when false the rows are a floor. */
  ok: boolean;
}

async function loadList(): Promise<NarrativeList> {
  const raw: RawPost[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<RawListPage>(
      `${API_BASE}/posts/?type=${NARRATIVE_TYPE}&limit=${PAGE_SIZE}&page=${page}`
    );
    if (body === null) {
      console.error(`narratives: the post list did not answer on page ${page}`);
      return { rows: [], ok: false };
    }
    const rows = Array.isArray(body.results) ? body.results : [];
    // A row that is not an object is skipped, not read: `null` would throw.
    raw.push(...rows.filter((row): row is RawPost => !!row && typeof row === "object"));
    if (rows.length < PAGE_SIZE || !body.links?.next) break;
    if (page === MAX_PAGES) {
      console.error(`narratives: more than ${MAX_PAGES * PAGE_SIZE} posts; refusing a truncated list`);
      return { rows: [], ok: false };
    }
  }
  const rows = raw.map(toNarrativeRow).filter((row): row is NarrativeRow => row !== null);
  return { rows, ok: true };
}

const list = hold(loadList, LIST_FRESH_MS, {
  keep: (value) => value.ok,
  onBackgroundError: (error) => console.error("narratives: refreshing the post list failed", error),
});

/** Every listed narrative row, or an error: see the header for why not fewer. */
async function readRows(): Promise<NarrativeRow[]> {
  const { rows, ok } = await list.read();
  if (!ok) throw new Error("narratives: the posts read short, so a page with a post could be dropped");
  return rows;
}

/**
 * Each post as its topic page opened it, held per slug for `LIST_FRESH_MS`: the
 * raw post, or null for a 404. A failure to open is not held; it throws, and is
 * tried again on the next render.
 */
const opened = holdByKey(
  async (slug: string): Promise<RawPost | null> => {
    const res = await fetchWithRetry(`${API_BASE}/posts/${encodeURIComponent(slug)}/`);
    if (!res) return null;
    const raw: unknown = await res.json();
    if (!raw || typeof raw !== "object") throw new Error(`narratives: post ${slug} is not a post`);
    return raw as RawPost;
  },
  LIST_FRESH_MS
);

/**
 * The newest post on `tag` that its page can show, or null.
 *
 * Normally one request: the list said which post. A post refused here is
 * logged, since the hub and the sitemap still count it, and the next newest on
 * the topic is tried. A post retagged since the list was read is refused on
 * the old tag, and shows on its new one once the list catches up, within a
 * minute.
 */
async function readPost(rows: NarrativeRow[], tag: string): Promise<NarrativePost | null> {
  const candidates = rows
    .filter((row) => row.tag === tag)
    .sort((a, b) => b.modified.localeCompare(a.modified));
  for (const row of candidates) {
    const raw = await opened.read(row.slug);
    const checked = raw ? checkNarrativePost(raw) : { problem: "it is gone" };
    const why =
      "problem" in checked
        ? checked.problem
        : checked.post.tag !== tag
          ? `it is now on ${checked.post.tag}`
          : null;
    if (!why && "post" in checked) return checked.post;
    console.warn(`narratives: post ${row.slug} is listed on ${tag} but ${why}; its page does not show it`);
  }
  return null;
}

const trending = hold(
  async (): Promise<TrendingTopic[] | null> => {
    const body = await fetchJsonSoft<{ results?: RawTrending[] } | RawTrending[]>(
      `${API_BASE}/keywords/trending/`
    );
    if (body === null) return null;
    return shapeTrending(Array.isArray(body) ? body : (body.results ?? []));
  },
  TRENDING_FRESH_MS,
  { keep: (value) => value !== null }
);

/** Today's trending topics, or null when the list could not be read. */
export const readTrending = (): Promise<TrendingTopic[] | null> => trending.read();

const counts = holdByKey(
  async (query: string): Promise<number | null> => {
    const body = await fetchJsonSoft<{ total?: unknown }>(`${API_BASE}/${query}&limit=1`);
    return typeof body?.total === "number" ? body.total : null;
  },
  COUNT_FRESH_MS,
  { keep: (value) => value !== null, failMs: FAILED_COUNT_MS }
);

const tagged = (path: string, tag: string, period: number) =>
  `${path}/?tags=${encodeURIComponent(tag)}&period=${period}`;

/*
 * Every page's denominator, held on its own rather than among the per-topic
 * counts, so no number of topic keys can evict it.
 */
const allNews7 = hold(
  async (): Promise<number | null> => {
    const body = await fetchJsonSoft<{ total?: unknown }>(
      `${API_BASE}/${NEWS}/?period=${PERIOD["7d"]}&limit=1`
    );
    return typeof body?.total === "number" ? body.total : null;
  },
  COUNT_FRESH_MS,
  { keep: (value) => value !== null, failMs: FAILED_COUNT_MS }
);

export interface Headline {
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
}

interface RawNews {
  title?: unknown;
  url?: unknown;
  published_at?: unknown;
  source?: { name?: unknown } | null;
}

interface Week {
  /** News matched to the topic in the last 7 days. */
  total: number | null;
  headlines: Headline[];
}

/*
 * A topic page's week: its 7-day count and its headlines, one request. The hub
 * takes its 7-day count from a bare `limit=1` count instead, held for 30
 * minutes: refreshing every row's headlines every 10 minutes for a page that
 * shows none would triple its upstream load. So the hub's figure can trail the
 * topic page's by up to the difference between the two holds, which a reader
 * comparing the two will rarely see and never be misled by.
 */
const week = holdByKey(
  async (tag: string): Promise<Week | null> => {
    const body = await fetchJsonSoft<{ total?: unknown; results?: RawNews[] }>(
      `${API_BASE}/${tagged(NEWS, tag, PERIOD["7d"])}&limit=${HEADLINES}`
    );
    if (body === null) return null;
    // A row that cannot be linked safely or dated is skipped, not rendered: one
    // bad `published_at` would otherwise throw in the formatter and fail the page.
    // The feed can carry one URL twice (one story, two ingests); the first good
    // copy stays.
    const seen = new Set<string>();
    const headlines = (body.results ?? []).flatMap((row) => {
      const url = typeof row.url === "string" ? safeHref(row.url) : null;
      const publishedAt = validDate(row.published_at);
      if (typeof row.title !== "string" || !url || !publishedAt || seen.has(url)) return [];
      seen.add(url);
      return [
        {
          title: row.title,
          url,
          sourceName: typeof row.source?.name === "string" ? row.source.name : "",
          publishedAt,
        },
      ];
    });
    return { total: typeof body.total === "number" ? body.total : null, headlines };
  },
  WEEK_FRESH_MS,
  { keep: (value) => value !== null, failMs: FAILED_COUNT_MS }
);

/*
 * The hub reads news alone, which is what its share and pace columns need; a
 * topic page adds podcasts and video. A 10-row hub reading all four made 40
 * counts at once and took 17 seconds cold (14 October). A topic page passes in
 * its week read, so one read gives it its count and its headlines and the
 * counts below do not wait for it; the hub passes none and reads a bare count.
 */
async function readAttention(
  tag: string,
  weekRead: Promise<Week | null> | null
): Promise<Omit<Attention, "allNews7">> {
  const media = weekRead !== null;
  const [news7, news30, podcasts7, videos7] = await Promise.all([
    weekRead
      ? weekRead.then((read) => read?.total ?? null)
      : counts.read(tagged(NEWS, tag, PERIOD["7d"])),
    counts.read(tagged(NEWS, tag, PERIOD["30d"])),
    media ? counts.read(tagged(PODCASTS, tag, PERIOD["7d"])) : null,
    media ? counts.read(tagged(VIDEOS, tag, PERIOD["7d"])) : null,
  ]);
  return { news7, news30, podcasts7, videos7 };
}

/** For tests: forget everything held. */
export function resetNarratives(): void {
  list.reset();
  opened.reset();
  trending.reset();
  allNews7.reset();
  counts.reset();
  week.reset();
}

export interface HubRow {
  slug: string;
  name: string;
  /** Null when the topic has a page but is not trending today. */
  trendiness: number | null;
  attention: Attention;
  post: { title: string; modified: string } | null;
}

export interface NarrativeHub {
  rows: HubRow[];
  /** False when the trending list could not be read; the rows are the posts alone. */
  trendingOk: boolean;
  /** How many rows carry a published post: the hub's indexing floor reads this. */
  written: number;
  asOf: string;
}

export async function buildNarrativeHub(): Promise<NarrativeHub> {
  const [topicsNow, rows, total] = await Promise.all([
    readTrending(),
    readRows(),
    allNews7.read(),
  ]);
  const written = byNarrative(rows);

  const topics = new Map<string, { name: string; trendiness: number | null }>();
  for (const topic of topicsNow ?? []) {
    topics.set(topic.slug, { name: topic.name, trendiness: topic.trendiness });
  }
  for (const post of written.values()) {
    if (!topics.has(post.tag)) topics.set(post.tag, { name: post.topic, trendiness: null });
  }

  // Trending first, hottest first; then the written topics that have cooled,
  // most recently updated first. Ordered before counting, so the cooled cap
  // keeps the freshest.
  const ordered = [...topics].sort(
    ([a, ta], [b, tb]) =>
      (tb.trendiness ?? -1) - (ta.trendiness ?? -1) ||
      (written.get(b)?.modified ?? "").localeCompare(written.get(a)?.modified ?? "")
  );
  let cooled = 0;
  const counted = new Set(
    ordered
      .filter(([, topic]) => topic.trendiness !== null || cooled++ < COOLED_COUNTED)
      .map(([slug]) => slug)
  );

  const hubRows = await mapLimit(ordered, CONCURRENCY, async ([slug, topic]): Promise<HubRow> => {
    const post = written.get(slug);
    const attention = counted.has(slug)
      ? await readAttention(slug, null)
      : { news7: null, news30: null, podcasts7: null, videos7: null };
    return {
      slug,
      // The post's own name for the topic wins: "Ripple", not "ripple".
      name: post?.topic ?? topic.name,
      trendiness: topic.trendiness,
      attention: { ...attention, allNews7: total },
      post: post ? { title: post.title, modified: post.modified } : null,
    };
  });

  return {
    rows: hubRows,
    trendingOk: topicsNow !== null,
    written: written.size,
    asOf: new Date().toISOString(),
  };
}

export const getNarrativeHub = createServerFn({ method: "GET" }).handler(() =>
  buildNarrativeHub()
);

export interface NarrativePage {
  slug: string;
  name: string;
  trendiness: number | null;
  attention: Attention;
  headlines: Headline[];
  post: NarrativePost | null;
  asOf: string;
}

/** One topic, or null when it has no page (see the header). */
export async function buildNarrativePage(tag: string): Promise<NarrativePage | null> {
  const [topicsNow, rows] = await Promise.all([readTrending(), readRows()]);
  const topic = topicsNow?.find((candidate) => candidate.slug === tag) ?? null;
  const listed = rows.some((row) => row.tag === tag);
  if (!listed && !topic) {
    // Not trending and nothing written. If the trending read failed, the page
    // may exist; say so with an error rather than a cached 404.
    if (topicsNow === null) {
      throw new Error("narratives: trending list unavailable, cannot tell whether this page exists");
    }
    return null;
  }

  const weekRead = week.read(tag);
  const [post, total, weekNow, attention] = await Promise.all([
    listed ? readPost(rows, tag) : null,
    allNews7.read(),
    weekRead,
    readAttention(tag, weekRead),
  ]);
  if (!post && !topic) {
    // Listed, but nothing on it can be shown now: no page, unless the trending
    // read failed, when the topic may still be trending and owed one.
    if (topicsNow === null) {
      throw new Error("narratives: trending list unavailable, cannot tell whether this page exists");
    }
    return null;
  }

  return {
    slug: tag,
    name: post?.topic ?? topic?.name ?? slugName(tag),
    trendiness: topic?.trendiness ?? null,
    attention: { ...attention, allNews7: total },
    headlines: weekNow?.headlines ?? [],
    post,
    asOf: new Date().toISOString(),
  };
}

/**
 * The validator is a boundary, not a formality: a malformed segment is a wrong
 * URL, and the route answers it 404 before this is called.
 */
export const getNarrative = createServerFn({ method: "GET" })
  .validator((tag: string) => {
    if (!isNarrativeSlug(tag)) {
      throw new Error(`getNarrative: ${String(tag)} is not a narrative slug`);
    }
    return tag;
  })
  .handler(({ data: tag }) => buildNarrativePage(tag));
