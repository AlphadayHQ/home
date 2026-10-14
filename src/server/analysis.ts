import { API_BASE, fetchJsonSoft } from "./apiFetch";
import type { Analysis, RawPost } from "../data/analysis";
import { byIncident, isPublished } from "../data/analysis";

/**
 * Reading the published analysis posts (content doc B2).
 *
 * `/v1/posts/` serves published rows to anyone, so this needs no credential —
 * the agent's token is write-only and is never used by the site. Drafts are
 * invisible here by design: an unreviewed draft must not reach a page.
 *
 * WHY THIS IS TWO ROUND TRIPS AND NOT ONE
 *
 * The list endpoint omits `content` — `PostViewSet.get_queryset` defers it and
 * `PostListSerializer` leaves it out — and `content` is where the provenance
 * block lives, which is the only thing tying a post to an incident. So the list
 * gives slugs and the detail gives the join key.
 *
 * The first version of this read the list alone and silently matched nothing:
 * every page rendered without its analysis and the sitemap dropped the two
 * incidents whose only claim to the index is one. Nothing errored, which is the
 * kind of failure worth a comment.
 *
 * The real fix is a metadata field on the list serializer — it is already on the
 * backend list. Until then the details are kept in this process, see below.
 *
 * WHY IT IS HELD IN MEMORY
 *
 * Read per render, this cost 1 + N requests for every incident page and the hub,
 * each paying it separately. That was nothing at five posts. On 14 October 180
 * were published at once, and every page view became 182 API calls: renders took
 * 7–13s and a handful of concurrent ones returned 500. So the whole process now
 * shares one read. It is fresh for `FRESH_MS`; after that the next caller gets
 * the last good read at once while one refresh runs behind it. A refresh walks
 * the list (two requests at 180 posts) and fetches only the posts whose
 * `modified` changed, so an edit or a new post is picked up within a minute and
 * an unchanged archive costs nothing. A refresh that fails keeps the last good
 * read rather than replacing it with a partial one.
 *
 * WHY IT WALKS PAGES
 *
 * `/posts/` is the whole blog, not just these analyses. Reading one page of 100
 * and stopping would, once the blog passed 100 posts, drop the oldest analyses
 * with `ok` still true, so their pages would go `noindex` and be cached that way.
 * That is the same silent truncation as the exploit feed's own 500-row read. So the list
 * follows `links.next`, and anything short of the last page is reported as
 * `ok: false` rather than read as a smaller archive.
 */

const PAGE_SIZE = 100;

/** 2,000 posts. Reaching it reports `ok: false` rather than truncating quietly. */
const MAX_PAGES = 20;

/** Enough to keep the waves short without opening a connection per post. */
const DETAIL_CONCURRENCY = 8;

/** How long one read serves every render before a refresh is started. */
export const FRESH_MS = 60_000;

export type { Analysis };

export interface AnalysisIndex {
  byIncident: Map<number, Analysis>;
  /**
   * Every request answered.
   *
   * Read before demoting a page, for the reason `coverageOk` exists: an incident
   * whose only claim to the index is its analysis would otherwise be served
   * `noindex` for an hour whenever this feed blinked.
   */
  ok: boolean;
}

interface RawListRow {
  slug?: unknown;
  status?: unknown;
  modified?: unknown;
}

interface RawListPage {
  results?: RawListRow[];
  links?: { next?: string | null };
}

/** Post bodies by slug, with the `modified` they were read at. */
const details = new Map<string, { modified: unknown; post: RawPost }>();
let lastGood: { at: number; index: AnalysisIndex } | null = null;
let refreshing: Promise<AnalysisIndex> | null = null;

function refresh(): Promise<AnalysisIndex> {
  refreshing ??= loadAnalyses()
    .then((index) => {
      if (index.ok || !lastGood) lastGood = { at: Date.now(), index };
      return lastGood.index;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function readAnalyses(): Promise<AnalysisIndex> {
  if (!lastGood) return refresh();
  if (Date.now() - lastGood.at >= FRESH_MS) {
    // Serve what we have; the refresh lands for the next caller.
    refresh().catch(() => {});
  }
  return Promise.resolve(lastGood.index);
}

async function loadAnalyses(): Promise<AnalysisIndex> {
  const rows: RawListRow[] = [];
  let ok = true;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<RawListPage>(
      `${API_BASE}/posts/?limit=${PAGE_SIZE}&page=${page}`
    );
    // A failed page ends the walk: there is no `links.next` to follow past it, and
    // `ok` stops what was read so far being taken for the whole archive.
    if (body === null) {
      ok = false;
      break;
    }

    const pageRows = body.results ?? [];
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE || !body.links?.next) break;
    if (page === MAX_PAGES) ok = false;
  }

  const published = rows.filter(
    (row) => isPublished(row.status) && typeof row.slug === "string"
  );
  const live = new Set(published.map((row) => row.slug as string));
  // A partial list says nothing about what was unpublished, so prune only on a full one.
  if (ok) for (const slug of details.keys()) if (!live.has(slug)) details.delete(slug);

  const stale = published.filter(
    (row) => details.get(row.slug as string)?.modified !== row.modified
  );

  for (let start = 0; start < stale.length; start += DETAIL_CONCURRENCY) {
    const batch = stale.slice(start, start + DETAIL_CONCURRENCY);
    const bodies = await Promise.all(
      batch.map((row) =>
        fetchJsonSoft<RawPost>(
          `${API_BASE}/posts/${encodeURIComponent(row.slug as string)}/`
        )
      )
    );
    bodies.forEach((post, i) => {
      // A post that failed to load is a missing analysis, not an empty one —
      // `ok` is what stops that being cached as a reason to deindex.
      if (post === null) ok = false;
      else details.set(batch[i].slug as string, { modified: batch[i].modified, post });
    });
  }

  const posts = published.flatMap((row) => {
    const held = details.get(row.slug as string);
    return held ? [held.post] : [];
  });

  return { byIncident: byIncident(posts), ok };
}
