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
 * Narrative pages (content doc B3).
 *
 * WHAT B3 BECAME
 *
 * B3 specified a weekly index of media attention. What is built is a page per
 * topic the crypto press is talking about, kept current by an agent: each day
 * it reads `/keywords/trending/`, researches the topics on it, and drafts a new
 * page or an update to an existing one when it finds enough that is new. A
 * person reviews every draft. The hub is the trending list as it stands, with
 * the attention numbers beside each topic, which is the "index" half of B3.
 *
 * THE TAG IS THE PAGE
 *
 * Every trending keyword arrives attached to a tag ("ripple" to `xrpl`, "fed" to
 * `federal-reserve-system`), and the tag slug is the page's identity:
 * `/research/narratives/{tag}`. Two keywords for one topic land on one page,
 * so a narrative can never get a second URL however the agent words its post.
 *
 * READ FROM POSTS, BY TYPE
 *
 * A narrative post is `type: "trending-narrative"` and names its tag in
 * `metadata.tag`, which the list endpoint returns. So the hub, every topic page
 * and the sitemap read one filtered list and never open a post to find out what
 * it is about: the pattern that cost the exploit pages 182 requests a view
 * before 14 October (`exploitPosts.ts`). A topic page opens one post, its own.
 *
 * WHICH TOPICS NEVER GET A PAGE
 *
 * Generic words trend as readily as stories ("debt", "wallet", "dollar"). The
 * backend already has the switch for them: `ignore_trending` on a keyword keeps
 * it off `/keywords/trending/`. That is the one place the list lives, so the
 * site, the agent and the trending widget all agree, rather than a second copy
 * here drifting from it.
 */

export const NARRATIVE_TYPE = "trending-narrative";

export const NARRATIVE_HUB = "/research/narratives";

export const narrativePath = (tag: string): string => `${NARRATIVE_HUB}/${tag}`;

/**
 * A tag slug as the backend allows them: Django's `SlugField`, so letters of
 * either case, digits, `_` and `-`, at most 50. Anything else is a wrong URL.
 * Narrower than that, and a tag like `layer_2` silently never gets a page.
 */
export const isNarrativeSlug = (slug: unknown): slug is string =>
  typeof slug === "string" && /^[A-Za-z0-9_-]{1,50}$/.test(slug);

/** The slug's own words: `layer_2` reads "layer 2". */
const slugWords = (slug: string): string => slug.replace(/[-_]+/g, " ");

/**
 * "ripple" reads as "Ripple"; "SUI" and "DeFi" are left as written. Only a
 * letter at the start of the string or after a space or hyphen is raised, so
 * "trump's" becomes "Trump's", not "Trump'S".
 */
export const displayName = (keyword: string): string =>
  /[A-Z]/.test(keyword)
    ? keyword
    : keyword.replace(/(^|[\s-])([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());

/** The topic's name when nothing better is known: from its slug. */
export const slugName = (slug: string): string => displayName(slugWords(slug));

/** A date string a formatter can print, or null. Feeds do carry `""`. */
export const validDate = (value: unknown): string | null => {
  const text = str(value);
  return text && !Number.isNaN(Date.parse(text)) ? text : null;
};

/**
 * A timestamp as UTC ISO 8601, or null. Rows carry these, so comparing two as
 * strings compares the instants: raw, `+02:00` against `Z` or a fraction of a
 * second against none would order them wrong.
 */
const isoTime = (value: unknown): string | null => {
  const text = validDate(value);
  return text ? new Date(text).toISOString() : null;
};

export interface TrendingTopic {
  /** The tag slug: the page's identity and its URL segment. */
  slug: string;
  /** The keyword as it trended, for display. */
  name: string;
  /** 0–1, from termite's trending task. Higher is hotter. */
  trendiness: number;
}

export interface RawTrending {
  keyword?: {
    name?: unknown;
    tag?: { slug?: unknown } | null;
  } | null;
  trendiness?: unknown;
}

/**
 * A trendiness score, or NaN. Only a number, or a string that is one: `Number`
 * alone reads `null`, `""` and `false` as 0 and `true` as 1, which would keep a
 * malformed row as a trending topic.
 */
const score = (value: unknown): number =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN;

/**
 * The trending list as topics, one per tag, hottest first.
 *
 * Two keywords on one tag ("bitcoin" and "BTC") are one topic, kept at the
 * higher score. A keyword with no tag has no page to point at and is dropped.
 */
export function shapeTrending(rows: RawTrending[]): TrendingTopic[] {
  const bySlug = new Map<string, TrendingTopic>();
  for (const row of rows) {
    const slug = row.keyword?.tag?.slug;
    const name = str(row.keyword?.name);
    const trendiness = score(row.trendiness);
    if (!isNarrativeSlug(slug) || !name || !Number.isFinite(trendiness)) continue;

    const existing = bySlug.get(slug);
    if (!existing || existing.trendiness < trendiness) {
      bySlug.set(slug, { slug, name: displayName(name), trendiness });
    }
  }
  return [...bySlug.values()].sort((a, b) => b.trendiness - a.trendiness);
}

/** `metadata` for a narrative post, schema 1, as `docs/narrative-agent-prompt.md` defines it. */
export interface NarrativeMeta {
  /** The tag slug the post is about: the page it is read on. */
  tag: string | null;
  /** The topic's name as the post uses it, e.g. "Ripple" for `xrpl`. */
  topic: string | null;
  /**
   * "page" is the piece a topic page shows. "update" is a dated section for a
   * reviewer to fold into the published page, never a page of its own.
   */
  kind: "page" | "update";
  sourcesRead: string[];
  /** The agent judged the topic not worth a page; kept archived so it is not researched again. */
  declined: boolean;
}

export function readNarrativeMeta(raw: unknown): NarrativeMeta {
  const meta = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    tag: isNarrativeSlug(meta.tag) ? meta.tag : null,
    topic: str(meta.topic),
    kind: meta.kind === "update" ? "update" : "page",
    sourcesRead: cleanSources(meta.sourcesRead),
    declined: meta.declined === true,
  };
}

/** Lowercase words, space-padded, so `includes` matches whole words only. */
const words = (text: string): string =>
  ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

const mentions = (title: string, phrase: string): boolean => {
  const needle = words(phrase);
  return needle.trim() !== "" && words(title).includes(needle);
};

/**
 * Whether a post's title names the topic its metadata claims.
 *
 * `metadata.tag` decides which page a post is read on, and nothing validates it
 * on write: a wrong one would put a post on another topic's page and make that
 * page indexable. The title must name the topic, either as `metadata.topic` or
 * as the tag slug's own words ("starknet", "federal reserve system").
 *
 * A post whose `tag` and `topic` are both wrong in the same way passes. Review
 * is the backstop for that.
 */
export function isAboutNarrative(
  post: { title: string; topic: string | null },
  tag: string
): boolean {
  return (!!post.topic && mentions(post.title, post.topic)) || mentions(post.title, slugWords(tag));
}

/** One narrative post as the hub, the sitemap and a topic page see it. */
export interface NarrativeRow {
  slug: string;
  /** The tag slug: the page it is read on. */
  tag: string;
  title: string;
  /** The topic's display name: the post's own, else from the tag. */
  topic: string;
  excerpt: string;
  /** UTC ISO 8601, so rows compare as strings. */
  publishedAt: string;
  /** Last saved, UTC ISO 8601. Moves when a reviewer folds an update in. */
  modified: string;
  sourcesRead: string[];
}

/**
 * A narrative post the site may show, or null.
 *
 * Every reader goes through this, so the hub, the topic page and the sitemap
 * agree on which posts count. Beyond being published and typed as a narrative:
 * it names a valid tag, it is a page and not an update draft published by
 * mistake, it is not a decline (by flag, or by the excerpt every decline
 * carries), and its title names the topic (`isAboutNarrative`). A post failing
 * any of them is left off.
 *
 * The hub's count, its indexing floor and the sitemap can only ever see the
 * list row, so this is everything they test. The topic page also checks the
 * body (`toNarrativePost`), and falls back to an older post on the topic when
 * the newest fails it, so a broken newest post cannot hide a good one.
 */
export function toNarrativeRow(raw: RawPost): NarrativeRow | null {
  if (!isPublished(raw.status) || raw.type !== NARRATIVE_TYPE) return null;
  const slug = str(raw.slug);
  const title = str(raw.title);
  if (!slug || !isPostSlug(slug) || !title) return null;

  const meta = readNarrativeMeta(raw.metadata);
  if (!meta.tag || meta.kind !== "page" || meta.declined || isDeclineExcerpt(raw.excerpt)) {
    return null;
  }
  if (!isAboutNarrative({ title, topic: meta.topic }, meta.tag)) return null;

  const publishedAt = isoTime(raw.published_at);
  if (!publishedAt) return null;

  return {
    slug,
    tag: meta.tag,
    title,
    topic: meta.topic ?? slugName(meta.tag),
    excerpt: str(raw.excerpt) ?? "",
    publishedAt,
    modified: isoTime(raw.modified) ?? publishedAt,
    sourcesRead: meta.sourcesRead,
  };
}

/**
 * Rows by tag, the most recently changed winning.
 *
 * An update is folded into the published post by a reviewer, so normally there
 * is one post per tag. Two can exist if a reviewer publishes a second page for
 * a topic; the page then shows whichever changed last, rather than both.
 */
export function byNarrative(rows: NarrativeRow[]): Map<string, NarrativeRow> {
  const map = new Map<string, NarrativeRow>();
  for (const row of rows) {
    const existing = map.get(row.tag);
    if (!existing || existing.modified < row.modified) map.set(row.tag, row);
  }
  return map;
}

export interface NarrativePost extends NarrativeRow {
  blocks: Block[];
}

/**
 * Why a post's body cannot be shown, or null when it is fine: a decline's one
 * line, or nothing that renders.
 */
export function bodyProblem(content: unknown): string | null {
  const text = typeof content === "string" ? content : "";
  if (isDecline(text)) return "its body is a decline";
  return toBlocks(stripProvenance(text)).length === 0 ? "its body is empty" : null;
}

/**
 * The full post for its topic page, or null.
 *
 * The row's test, plus a body worth indexing. The list cannot see the body, so
 * a post refused here for its body is still counted by the hub and listed by
 * the sitemap; the server logs it (`server/narratives.ts`) so a person fixes the
 * post. A listed URL that renders `noindex` until then costs a crawl; an
 * indexed page that is only a title would cost the brand.
 */
export function toNarrativePost(raw: RawPost): NarrativePost | null {
  const row = toNarrativeRow(raw);
  if (!row || bodyProblem(raw.content)) return null;
  return { ...row, blocks: toBlocks(stripProvenance(String(raw.content))) };
}

export interface Attention {
  /**
   * News articles in the last 7 days matching the topic. `?tags=` matches the
   * tag's keywords ("fed", "federal reserve" for `federal-reserve-system`), not
   * a slug stamped on each article, so a passing mention counts; the pages say so.
   */
  news7: number | null;
  /** The same over 30 days. */
  news30: number | null;
  podcasts7: number | null;
  videos7: number | null;
  /** All news in the last 7 days, the denominator for `share`. */
  allNews7: number | null;
}

/** The topic's share of all news indexed this week, 0–1, or null. The index has general outlets too. */
export const shareOf = (a: Attention): number | null =>
  a.news7 !== null && a.allNews7 ? a.news7 / a.allNews7 : null;

/** Below this many articles in 30 days, a ratio is noise: 1 against 2 is "2×". */
export const PACE_FLOOR = 10;

/**
 * This week's daily rate against the 30-day daily rate. 2 means twice as much
 * coverage as usual. Null when either side is missing, or when the 30-day count
 * is too small for a ratio to mean anything.
 */
export const paceOf = (a: Attention): number | null =>
  a.news7 !== null && a.news30 !== null && a.news30 >= PACE_FLOOR
    ? a.news7 / 7 / (a.news30 / 30)
    : null;

/**
 * Written topics the hub needs before it is indexed.
 *
 * The hub is a list of links to the written pages with the numbers beside
 * them. With none written it is a table of counts, the shape the scaled-content
 * policies describe, so it waits for the writing. Read by the route and the
 * posts sitemap, so the two agree.
 */
export const NARRATIVE_HUB_FLOOR = 3;

/** A share as the pages print it: two decimals under 1%, one above. */
export const formatShare = (share: number): string =>
  `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`;
