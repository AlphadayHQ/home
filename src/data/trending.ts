import type { Block, RawPost } from "./analysis.ts";
import {
  cleanSources,
  isDecline,
  isDeclineExcerpt,
  isPostSlug,
  isPublished,
  str,
  stripProvenance,
  toBlocks,
} from "./analysis.ts";

/**
 * Trending topics, read as posts (content doc B3).
 *
 * WHAT A PAGE IS
 *
 * Each day an agent reads `/keywords/trending/`, researches why a topic is in
 * the news, and drafts a post; a person reviews every draft. One topic is one
 * page, at the post's own slug: `/research/trending/xrp-narrative`. The agent
 * titles every page "<Topic> narrative", so the server-derived slug names the
 * topic and nothing that will date, and it never changes once set.
 *
 * WHAT AN UPDATE IS
 *
 * When a topic trends again with something new, the agent drafts an update: a
 * post of its own (`metadata.kind: "update"`) naming the page it belongs to
 * (`metadata.updates`, that page's slug). Published, it is shown on that page,
 * newest first above the original. It has no URL of its own, so the sitemap
 * lists the page, not the update, and dates the page by its newest update.
 *
 * WHAT IS TRUSTED, AND WHERE
 *
 * The list endpoint returns `type` and `metadata` but no body. The hub, its
 * indexing floor and the sitemap trust the row, as the exploit tier does: a
 * decline is caught there by its flag or its excerpt. A topic page opens the
 * posts it shows and refuses an empty or decline body; a page post refused that
 * way 404s, as an exploit analysis does.
 *
 * `metadata` is free-form JSON written by an agent and edited in an admin, so
 * it is read defensively: a missing or mistyped value is absent, never a crash.
 */

export const TRENDING_TYPE = "trending-narrative";

export const TRENDING_HUB = "/research/trending";

export const trendingPostPath = (slug: string): string => `${TRENDING_HUB}/${slug}`;

/**
 * Topics the hub needs before it is indexed. The gate catches the posts feed
 * breaking, as the exploit hub's does; a list of one or two is an article with
 * navigation around it. Read by the route and the posts sitemap, so they agree.
 */
export const TRENDING_HUB_FLOOR = 3;

/** Topics on one page of the hub. */
export const HUB_PAGE_SIZE = 20;

/** Updates on one page of a topic. */
export const UPDATES_PAGE_SIZE = 10;

/** `metadata` for a trending post, schema 1, as `docs/narrative-agent-prompt.md` defines it. */
export interface TrendingMeta {
  /** The topic's name as the post uses it, e.g. "XRP". */
  topic: string | null;
  /**
   * "page" is a topic's page. "update" is shown on the page `updates` names.
   * Null for anything else: a page is a URL, indexed and on the hub, so a
   * missing or mistyped kind ("updates", "Update") is shown nowhere rather than
   * guessed into one.
   */
  kind: "page" | "update" | null;
  /** For an update, the slug of the page it belongs to. */
  updates: string | null;
  sourcesRead: string[];
  /** The agent judged the keyword not a topic; kept archived so it is not researched again. */
  declined: boolean;
}

export function readTrendingMeta(raw: unknown): TrendingMeta {
  const meta = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const kind = meta.kind === "page" || meta.kind === "update" ? meta.kind : null;
  return {
    topic: str(meta.topic),
    kind,
    updates: kind === "update" && isPostSlug(meta.updates) ? meta.updates : null,
    sourcesRead: cleanSources(meta.sourcesRead),
    declined: meta.declined === true,
  };
}

/**
 * A timestamp as UTC ISO 8601, or null. Rows carry these, so comparing two as
 * strings compares the instants: raw, `+02:00` against `Z` would order wrong.
 */
const isoTime = (value: unknown): string | null => {
  const text = str(value);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

/** "XRP narrative" names the topic "XRP" when the metadata does not. */
const topicFromTitle = (title: string): string => title.replace(/\s+narrative$/i, "") || title;

/** One trending post as its list row shows it. */
export interface TrendingRow {
  slug: string;
  kind: "page" | "update";
  /** For an update, the page it belongs to; null for a page. */
  parent: string | null;
  title: string;
  /** The topic's display name; for an update, as the update names it. */
  topic: string;
  excerpt: string;
  /** UTC ISO 8601, so rows compare as strings. */
  publishedAt: string;
  /** Last saved, UTC ISO 8601. */
  modified: string;
  sourcesRead: string[];
}

/**
 * A trending post the site may show, or null: published, of this type, with a
 * slug and a title, not a decline (by flag, or by the excerpt every decline
 * carries), of a known kind, and for an update, naming its page. Every reader goes through this,
 * so the hub, the topic pages and the sitemap agree on which posts count.
 */
export function toTrendingRow(raw: RawPost): TrendingRow | null {
  if (!isPublished(raw.status) || raw.type !== TRENDING_TYPE) return null;
  const slug = str(raw.slug);
  const title = str(raw.title);
  if (!slug || !isPostSlug(slug) || !title) return null;

  const meta = readTrendingMeta(raw.metadata);
  if (meta.declined || isDeclineExcerpt(raw.excerpt, "narrative")) return null;
  if (!meta.kind || (meta.kind === "update" && !meta.updates)) return null;

  const publishedAt = isoTime(raw.published_at);
  if (!publishedAt) return null;

  return {
    slug,
    kind: meta.kind,
    parent: meta.updates,
    title,
    topic: meta.topic ?? topicFromTitle(title),
    excerpt: str(raw.excerpt) ?? "",
    publishedAt,
    modified: isoTime(raw.modified) ?? publishedAt,
    sourcesRead: meta.sourcesRead,
  };
}

/** A topic: its page, and the updates published on it, newest first. */
export interface Topic {
  page: TrendingRow;
  updates: TrendingRow[];
  /** The newest change to the page or any update on it, UTC ISO 8601. */
  latest: string;
}

/** The update readers see first, or the page itself when it has none. */
export const leadOf = (topic: Topic): TrendingRow => topic.updates[0] ?? topic.page;

const later = (a: string, b: string): string => (a > b ? a : b);

/**
 * Rows grouped into topics, the most recently changed first.
 *
 * An update whose page is not among the rows is an orphan: its page is
 * unpublished, or it names a slug that does not exist. It has nowhere to be
 * shown, so it is counted for the log rather than placed.
 */
export function groupTopics(rows: TrendingRow[]): { topics: Topic[]; orphans: TrendingRow[] } {
  const bySlug = new Map<string, Topic>();
  for (const row of rows) {
    if (row.kind === "page") bySlug.set(row.slug, { page: row, updates: [], latest: row.modified });
  }
  const orphans: TrendingRow[] = [];
  for (const row of rows) {
    if (row.kind !== "update") continue;
    const topic = row.parent ? bySlug.get(row.parent) : undefined;
    if (!topic) {
      orphans.push(row);
      continue;
    }
    topic.updates.push(row);
    topic.latest = later(topic.latest, row.modified);
  }
  for (const topic of bySlug.values()) {
    topic.updates.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  const topics = [...bySlug.values()].sort((a, b) => b.latest.localeCompare(a.latest));
  return { topics, orphans };
}

/**
 * `?page=` as a page number: 1 when absent, null when it is not a whole number
 * from 1 up. The router may hand over a number or a string.
 */
export function parsePage(value: unknown): number | null {
  if (value === undefined) return 1;
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  if (!/^[1-9][0-9]{0,4}$/.test(text)) return null;
  return Number(text);
}

/** How many pages `count` items fill, never fewer than one. */
export const pageCount = (count: number, size: number): number =>
  Math.max(1, Math.ceil(count / size));

/** One page of `items`, or null past the last page. Page 1 always exists. */
export function pageOf<T>(items: T[], page: number, size: number): T[] | null {
  if (page > pageCount(items.length, size)) return null;
  return items.slice((page - 1) * size, page * size);
}

export interface TrendingPost extends TrendingRow {
  blocks: Block[];
}

/**
 * A post as its topic page shows it, or why not: the row's test, plus a body
 * worth showing. An indexed page that is only a title would cost the brand.
 */
export function checkTrendingPost(raw: RawPost): { post: TrendingPost } | { problem: string } {
  const row = toTrendingRow(raw);
  if (!row) return { problem: "it is no longer shown" };
  const text = typeof raw.content === "string" ? raw.content : "";
  if (isDecline(text)) return { problem: "its body is a decline" };
  const blocks = toBlocks(stripProvenance(text));
  return blocks.length > 0 ? { post: { ...row, blocks } } : { problem: "its body is empty" };
}
