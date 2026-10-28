import type { Block, RawPost } from "./analysis.ts";
import {
  cleanSources,
  isDecline,
  isDeclineExcerpt,
  isPostSlug,
  isPublished,
  isoDay,
  safeHref,
  str,
  stripProvenance,
  toBlocks,
} from "./analysis.ts";

/**
 * Podcast insight pages, read as posts: one idea from crypto podcasts per page,
 * written by an agent from the episode's transcript, quoted with timestamps and
 * checked against outside sources, and reviewed before it is published. The
 * agent's rules are in `docs/podcast-agent-prompt.md`.
 *
 * WHAT IS A PAGE, AND WHAT IS NOT
 *
 * The agent writes two kinds of post under one type, by `metadata.kind`: an
 * "insight" is a page; a "run-log" records a run, is kept archived, and is the
 * ledger the next run reads so it does not write the same idea twice. A run log
 * published by mistake would be a page listing episode ids, so only an insight
 * is shown. A post with no `kind`, or "Insight" from an admin edit, is an
 * insight, as every one so far is: dropping it would take a published page off
 * the site with nothing but an "unplaced" count to show for it.
 *
 * WHY THE EPISODE IS THE PAGE'S SPINE
 *
 * Every quote on a page is from an episode the post names in
 * `metadata.episodes`, with the show, the day it aired and the episode's own
 * page. Those are what a reader checks a quote against, so the page leads with
 * them. Each carries the episode's id in Alphaday's podcast feed (`itemId`),
 * which is the record the page offers as data.
 *
 * `metadata` is free-form JSON written by an agent and editable in the admin, so
 * everything here reads it defensively: a missing or mistyped value is absent,
 * never a crash and never a wrong figure.
 */

export const PODCAST_TYPE = "podcast-insight";

export const PODCAST_HUB = "/research/podcasts";

export const podcastPostPath = (slug: string): string => `${PODCAST_HUB}/${slug}`;

export { isPostSlug };

/**
 * Pages the hub needs before it is indexed. As the trending hub's does, the gate
 * catches the posts feed breaking; a list of one or two is an article with
 * navigation around it. Read by the route and the posts sitemap, so they agree.
 */
export const PODCAST_HUB_FLOOR = 3;

/** Pages on one page of the hub. */
export const HUB_PAGE_SIZE = 20;

/** How many topics a page carries into its keywords; the agent writes a handful. */
const MAX_TOPICS = 8;

export interface Episode {
  /** The episode's id in `/items/podcasts/`, digits only, or null. */
  itemId: string | null;
  show: string;
  title: string | null;
  /** The day it aired. */
  aired: string | null;
  /** The episode's page on the show's site or a podcast app; never the audio file. */
  pageUrl: string | null;
}

/** `metadata` for a podcast insight, schema 1, as the agent's prompt defines it. */
export interface PodcastMeta {
  episodes: Episode[];
  topics: string[];
  sourcesRead: string[];
}

const safeUrl = (value: unknown): string | null => {
  const text = str(value);
  return text && safeHref(text) ? text : null;
};

/** A feed id as the agent writes it, a string or a number; anything else is none. */
const itemId = (value: unknown): string | null => {
  const text = typeof value === "number" && Number.isInteger(value) ? String(value) : str(value);
  return text && /^[0-9]{1,12}$/.test(text) ? text : null;
};

/** The episodes, in the post's order. One without a show cannot be named, so it is dropped. */
function readEpisodes(raw: unknown): Episode[] {
  if (!Array.isArray(raw)) return [];
  const episodes: Episode[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const episode = entry as Record<string, unknown>;
    const show = str(episode.show);
    if (!show) continue;
    episodes.push({
      itemId: itemId(episode.itemId),
      show,
      title: str(episode.title),
      aired: isoDay(episode.publishedAt),
      pageUrl: safeUrl(episode.pageUrl),
    });
  }
  return episodes;
}

const readTopics = (raw: unknown): string[] =>
  Array.isArray(raw)
    ? [...new Set(raw.map(str).filter((topic): topic is string => topic !== null))].slice(0, MAX_TOPICS)
    : [];

export function readPodcastMeta(raw: unknown): PodcastMeta {
  const meta = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    episodes: readEpisodes(meta.episodes),
    topics: readTopics(meta.topics),
    sourcesRead: cleanSources(meta.sourcesRead),
  };
}

/** The shows a post quotes, once each, in the post's order. */
export const showsOf = (meta: PodcastMeta): string[] => [
  ...new Set(meta.episodes.map((episode) => episode.show)),
];

/** The day the newest episode a post quotes aired, or null. */
export const latestAired = (meta: PodcastMeta): string | null =>
  meta.episodes.reduce<string | null>(
    (at, episode) => (episode.aired && (!at || episode.aired > at) ? episode.aired : at),
    null
  );

/** One page as the hub, the sitemap and "more from the podcasts" see it. */
export interface PodcastRow {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  /** Last saved; moves when a published post is edited. */
  modified: string;
  meta: PodcastMeta;
}

/**
 * A row the site may show, or null: published, of this type, an insight, and
 * not a decline. Every reader goes through this, so the hub, the pages and the
 * sitemap agree on which posts count.
 *
 * The agent does not write declines, but a decline is caught here as the other
 * types catch one, by flag or by excerpt, so a post archived as "not an idea"
 * and published by mistake does not become a page. The excerpt rule is the
 * strict one ("Declined:" exactly), since an idea's excerpt can open with the
 * word.
 */
export function toPodcastRow(raw: RawPost): PodcastRow | null {
  if (!isPublished(raw.status) || raw.type !== PODCAST_TYPE) return null;
  const slug = str(raw.slug);
  const title = str(raw.title);
  if (!slug || !isPostSlug(slug) || !title) return null;
  const metadata =
    raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {};
  const kind = str(metadata.kind)?.toLowerCase() ?? null;
  if (kind !== null && kind !== "insight") return null;
  if (metadata.declined === true || isDeclineExcerpt(raw.excerpt, "narrative")) return null;
  const publishedAt = str(raw.published_at) ?? "";
  return {
    slug,
    title,
    excerpt: str(raw.excerpt) ?? "",
    publishedAt,
    modified: str(raw.modified) ?? publishedAt,
    meta: readPodcastMeta(raw.metadata),
  };
}

/** Newest first, by when the page was published; ties broken by slug so the order is stable. */
export const byNewest = (a: PodcastRow, b: PodcastRow): number =>
  b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug);

export interface PodcastPost extends PodcastRow {
  blocks: Block[];
}

/**
 * The full page, or null when there is none to show. The body is checked as
 * well as the row: a decline is recognised by its opening line, a provenance
 * block is stripped before anything renders, and an empty body is not a page.
 */
export function toPodcastPost(raw: RawPost): PodcastPost | null {
  const row = toPodcastRow(raw);
  const content = typeof raw.content === "string" ? raw.content : "";
  if (!row || isDecline(content)) return null;
  const blocks = toBlocks(stripProvenance(content));
  return blocks.length > 0 ? { ...row, blocks } : null;
}
