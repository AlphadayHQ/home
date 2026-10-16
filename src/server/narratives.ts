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
  bodyProblem,
  byNarrative,
  isNarrativeSlug,
  shapeTrending,
  slugName,
  toNarrativePost,
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
 * WHAT IS READ, AND HOW OFTEN
 *
 * The posts are one filtered list, `?type=trending-narrative`, whose rows carry
 * each post's tag in `metadata`; a topic page then opens its own post, and
 * nothing else. The attention numbers are the expensive part: a tagged news
 * count takes 1–3s upstream (measured 16 October) and the hub wants two per
 * row. They move over days, not seconds, so each is held (`server/hold.ts`):
 * a warm hub makes no upstream request at all, and a stale one is answered at
 * once while it refreshes behind the reader.
 *
 * WHY A FAILED POST READ IS AN ERROR AND NOT A SMALLER PAGE
 *
 * The posts decide whether a page exists and whether it is indexed. Reading
 * them short and rendering anyway would 404 or `noindex` a page that has a
 * published post, and the CDN would cache that. Throwing leaves the edge on its
 * last good copy instead: the rule `routes/research.governance.tsx` explains.
 */

const NEWS = "items/news";
const PODCASTS = "items/podcasts";
const VIDEOS = "items/videos";

const PAGE_SIZE = 100;
/** 2,000 posts. Reaching it reports a short read rather than truncating quietly. */
const MAX_PAGES = 20;

/** The post list: short, so a publish shows on the hub within a minute. */
export const LIST_FRESH_MS = 60_000;
/** The trending list is rescored every six hours upstream. */
export const TRENDING_FRESH_MS = 10 * 60_000;
/** Counts over 30 days, podcasts, video, and all news. */
export const COUNT_FRESH_MS = 30 * 60_000;
/** The topic's week of news: its count and its headlines, read together. */
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
 * Topics counted at once while the counts are cold. Each costs two tagged news
 * counts; uncapped, a cold hub's reads would all land on the API together.
 */
const ATTENTION_CONCURRENCY = 6;

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
  results?: RawPost[];
  links?: { next?: string | null };
}

export interface NarrativeList {
  rows: NarrativeRow[];
  /** Every page answered; when false the rows are a floor. */
  ok: boolean;
}

async function loadList(): Promise<NarrativeList> {
  const raw: RawPost[] = [];
  let ok = true;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<RawListPage>(
      `${API_BASE}/posts/?type=${NARRATIVE_TYPE}&limit=${PAGE_SIZE}&page=${page}`
    );
    if (body === null) {
      ok = false;
      break;
    }
    const rows = body.results ?? [];
    raw.push(...rows);
    if (rows.length < PAGE_SIZE || !body.links?.next) break;
    if (page === MAX_PAGES) ok = false;
  }
  const rows = raw.map(toNarrativeRow).filter((row): row is NarrativeRow => row !== null);
  return { rows, ok };
}

const list = hold(loadList, LIST_FRESH_MS, { keep: (value) => value.ok });

/** Every shown narrative row, or an error: see the header for why not fewer. */
async function readRows(): Promise<NarrativeRow[]> {
  const { rows, ok } = await list.read();
  if (!ok) throw new Error("narratives: the posts read short, so a page with a post could be dropped");
  return rows;
}

/** The written topics, one post each: the newest per tag. */
export const readWritten = async (): Promise<Map<string, NarrativeRow>> =>
  byNarrative(await readRows());

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

const readAllNews7 = () => allNews7.read();

/*
 * The hub reads news alone, which is what its share and pace columns need, and
 * its week count is a bare `limit=1`: it shows no headlines, so it does not pay
 * for them. A topic page adds podcasts and video, and takes its week count from
 * the headline read it makes anyway. A 10-row hub reading all four made 40
 * counts at once and took 17 seconds cold (14 October).
 */
async function readAttention(tag: string, page: boolean): Promise<Omit<Attention, "allNews7">> {
  const [news7, news30, podcasts7, videos7] = await Promise.all([
    page
      ? week.read(tag).then((read) => read?.total ?? null)
      : counts.read(tagged(NEWS, tag, PERIOD["7d"])),
    counts.read(tagged(NEWS, tag, PERIOD["30d"])),
    page ? counts.read(tagged(PODCASTS, tag, PERIOD["7d"])) : null,
    page ? counts.read(tagged(VIDEOS, tag, PERIOD["7d"])) : null,
  ]);
  return { news7, news30, podcasts7, videos7 };
}

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
 * A topic page's week count and its headlines are one request: the headline
 * read returns the same `total` a `limit=1` count would, and this tagged 7-day
 * query is the slowest of the lot.
 */
const week = holdByKey(
  async (tag: string): Promise<Week | null> => {
    const body = await fetchJsonSoft<{ total?: unknown; results?: RawNews[] }>(
      `${API_BASE}/${tagged(NEWS, tag, PERIOD["7d"])}&limit=${HEADLINES}`
    );
    if (body === null) return null;
    // A row that cannot be linked safely or dated is skipped, not rendered: one
    // bad `published_at` would otherwise throw in the formatter and fail the page.
    // The feed can carry one URL twice (one story, two ingests); the first stays.
    const seen = new Set<string>();
    const headlines = (body.results ?? []).flatMap((row) => {
      const url = typeof row.url === "string" ? safeHref(row.url) : null;
      const publishedAt = validDate(row.published_at);
      if (!url || seen.has(url)) return [];
      seen.add(url);
      return typeof row.title === "string" && publishedAt
        ? [
            {
              title: row.title,
              url,
              sourceName: typeof row.source?.name === "string" ? row.source.name : "",
              publishedAt,
            },
          ]
        : [];
    });
    return { total: typeof body.total === "number" ? body.total : null, headlines };
  },
  WEEK_FRESH_MS,
  { keep: (value) => value !== null, failMs: FAILED_COUNT_MS }
);

/** For tests: forget everything held. */
export function resetNarratives(): void {
  list.reset();
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
  const [topicsNow, written, allNews7] = await Promise.all([
    readTrending(),
    readWritten(),
    readAllNews7(),
  ]);

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

  const rows = await mapLimit(
    ordered,
    ATTENTION_CONCURRENCY,
    async ([slug, topic]): Promise<HubRow> => {
      const post = written.get(slug);
      const attention = counted.has(slug)
        ? await readAttention(slug, false)
        : { news7: null, news30: null, podcasts7: null, videos7: null };
      return {
        slug,
        // The post's own name for the topic wins: "Ripple", not "ripple".
        name: post?.topic ?? topic.name,
        trendiness: topic.trendiness,
        attention: { ...attention, allNews7 },
        post: post ? { title: post.title, modified: post.modified } : null,
      };
    }
  );

  return {
    rows,
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

/** Posts on one topic a page will try, newest first, before showing none. */
const CANDIDATES = 3;

/**
 * Why a post the list placed on `tag` cannot be shown there now, or null.
 *
 * The list can be a minute old and carries no body, so the post itself is
 * checked again: still shown at all, still on this tag (a retagged post would
 * otherwise render, indexed, under the old topic's URL, and the edge would keep
 * that copy), and a body with something in it (an indexed page that is only a
 * title and an excerpt is a thin page under the brand).
 */
function refusal(raw: RawPost, tag: string): string | null {
  const post = toNarrativePost(raw);
  if (post) return post.tag === tag ? null : `it is now on ${post.tag}`;
  return bodyProblem(raw.content) ?? "it is no longer shown";
}

/**
 * The newest post on `tag` that can be shown, or null.
 *
 * Usually one request: the list already said which post. A post refused here
 * is logged, because the hub and the sitemap, which see only the list, still
 * count it until a person fixes it; the next newest on the topic is tried
 * instead. Only a 404 is "no post"; any other failure throws, for the reason
 * in the header.
 */
async function readPost(rows: NarrativeRow[], tag: string): Promise<NarrativePost | null> {
  const candidates = rows
    .filter((row) => row.tag === tag)
    .sort((a, b) => b.modified.localeCompare(a.modified))
    .slice(0, CANDIDATES);
  for (const row of candidates) {
    const res = await fetchWithRetry(`${API_BASE}/posts/${encodeURIComponent(row.slug)}/`);
    if (!res) continue;
    const raw = (await res.json()) as RawPost;
    const why = refusal(raw, tag);
    if (!why) return toNarrativePost(raw);
    console.warn(`narratives: post ${row.slug} is listed on ${tag} but ${why}; not shown there`);
  }
  return null;
}

/** One topic, or null when it has no page (see the header). */
export async function buildNarrativePage(tag: string): Promise<NarrativePage | null> {
  const [topicsNow, rows] = await Promise.all([readTrending(), readRows()]);
  const row = byNarrative(rows).get(tag) ?? null;
  const topic = topicsNow?.find((candidate) => candidate.slug === tag) ?? null;
  if (!row && !topic) {
    // Not trending and nothing written. If the trending read failed, the page
    // may exist; say so with an error rather than a cached 404.
    if (topicsNow === null) {
      throw new Error("narratives: trending list unavailable, cannot tell whether this page exists");
    }
    return null;
  }

  const [post, allNews7, news, attention] = await Promise.all([
    row ? readPost(rows, tag) : null,
    readAllNews7(),
    week.read(tag),
    readAttention(tag, true),
  ]);
  // Listed, but nothing on it can be shown now (unpublished, retagged, or an
  // empty body): the topic has no page unless it is trending.
  if (!post && !topic) return null;

  return {
    slug: tag,
    name: post?.topic ?? topic?.name ?? slugName(tag),
    trendiness: topic?.trendiness ?? null,
    attention: { ...attention, allNews7 },
    headlines: news?.headlines ?? [],
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
