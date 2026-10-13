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
 * backend list. Until then every render costs 1 + N requests (the list pages,
 * then one per published post), bounded by `DETAIL_CONCURRENCY`. The CDN keeps
 * the HTML for 60s by default and 300s at most (`HtmlCachePolicy`), so each
 * incident page pays that roughly every one to five minutes per edge, and the
 * hub and every incident page pay it separately. At five posts that is nothing.
 * Past about fifty it is worth chasing.
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
}

interface RawListPage {
  results?: RawListRow[];
  links?: { next?: string | null };
}

export async function readAnalyses(): Promise<AnalysisIndex> {
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

  const slugs = rows
    .filter(
      (row) => isPublished(row.status) && typeof row.slug === "string"
    )
    .map((row) => row.slug as string);

  const posts: RawPost[] = [];

  for (let start = 0; start < slugs.length; start += DETAIL_CONCURRENCY) {
    const batch = await Promise.all(
      slugs
        .slice(start, start + DETAIL_CONCURRENCY)
        .map((slug) =>
          fetchJsonSoft<RawPost>(
            `${API_BASE}/posts/${encodeURIComponent(slug)}/`
          )
        )
    );
    for (const post of batch) {
      // A post that failed to load is a missing analysis, not an empty one —
      // `ok` is what stops that being cached as a reason to deindex.
      if (post === null) ok = false;
      else posts.push(post);
    }
  }

  return { byIncident: byIncident(posts), ok };
}
