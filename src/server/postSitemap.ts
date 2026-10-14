import { API_BASE, fetchWithRetry } from "./apiFetch";
import type { RawExploitPost } from "../data/exploitPosts";
import { postPages } from "../data/postPages";
import { SITE_URL, urlsetXml } from "../seo/sitemapXml";

/**
 * `/sitemaps/posts.xml`, built on request (§4.4).
 *
 * Every other sitemap file is built at deploy, because what it lists changes
 * when code ships. Posts change when someone presses publish, so a deploy-time
 * file left every new analysis out of search until the next release. This reads
 * the post list, two requests at 175 posts, and places each post by its `type`
 * through `postPages`, the same function the pages agree with.
 *
 * HOW OFTEN THE API IS READ
 *
 * The response says `s-maxage=3600`, but the CloudFront cache policy caps every
 * edge at five minutes (`MaxTTL: 300`, see `server.mjs`). A query string is part
 * of that cache key, so `?anything` reaches this server uncached. Behind both,
 * the read is held here for `FRESH_MS` and shared by concurrent requests:
 * however the requests arrive, the post list is walked at most once per
 * `FRESH_MS` per process. A walk takes 2–11s, almost all of it the API answering
 * each page, so no request waits for one once anything is held: a stale read is
 * answered at once and rebuilt behind it, as `server/exploits.ts` does.
 *
 * The two holds add up, so a published post is listed within about ten minutes
 * at worst — the edge's five plus this server's five — and one more stale answer
 * from the edge's `stale-while-revalidate` after that.
 *
 * A failed read is never served short. With a good read held, it stays held and
 * is served; with none, the route answers an uncached 503 and the edge keeps
 * serving its last good copy (`stale-if-error`). An empty sitemap would read to
 * Google as every post gone.
 */

const PAGE_SIZE = 100;
/** 2,000 posts. Past it the read is refused rather than truncated. */
export const MAX_PAGES = 20;

/** How long one read serves every request, matching the edge's five minutes. */
export const FRESH_MS = 300_000;

const CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800";

interface RawListPage {
  results?: RawExploitPost[];
  links?: { next?: string | null };
}

export interface PostSitemap {
  xml: string;
  urls: number;
  unplaced: number;
}

export async function buildPostSitemap(): Promise<PostSitemap> {
  const rows: RawExploitPost[] = [];
  let url: string | null = `${API_BASE}/posts/?limit=${PAGE_SIZE}`;

  for (let page = 1; url; page += 1) {
    if (page > MAX_PAGES) {
      throw new Error("post sitemap: more than 2,000 posts; refusing a truncated sitemap");
    }
    const res = await fetchWithRetry(url);
    if (!res) throw new Error(`post sitemap: ${url} answered 404`);
    const body = (await res.json()) as RawListPage;
    rows.push(...(body.results ?? []));
    url = body.links?.next ?? null;
  }

  const { pages, unplaced } = postPages(rows);
  if (unplaced > 0) {
    console.warn(`post sitemap: ${unplaced} published post(s) have no page to list them on`);
  }
  const xml = urlsetXml(pages.map(({ path, lastmod }) => ({ loc: `${SITE_URL}${path}`, lastmod })));
  return { xml, urls: pages.length, unplaced };
}

let held: { at: number; sitemap: PostSitemap } | null = null;
let inFlight: Promise<PostSitemap> | null = null;

function refresh(): Promise<PostSitemap> {
  inFlight ??= buildPostSitemap()
    .then((sitemap) => {
      held = { at: Date.now(), sitemap };
      return sitemap;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * The held sitemap, at once, whenever there is one; a stale one starts a single
 * rebuild behind it. Only a process that has never read the list waits.
 */
export function readPostSitemap(): Promise<PostSitemap> {
  if (!held) return refresh();
  if (Date.now() - held.at >= FRESH_MS) {
    // A failed rebuild keeps the held one; the next stale request tries again.
    refresh().catch((error) => console.error(error));
  }
  return Promise.resolve(held.sitemap);
}

/** For tests: forget the held sitemap. */
export function resetPostSitemap(): void {
  held = null;
  inFlight = null;
}

/** The route's whole answer, so the 200 and the 503 can be tested without a server. */
export async function postSitemapResponse(): Promise<Response> {
  try {
    const { xml } = await readPostSitemap();
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Sitemap temporarily unavailable.\n", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Retry-After": "300",
      },
    });
  }
}
