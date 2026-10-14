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
 * The edge holds the result for an hour, so the API is read about once an hour
 * rather than once per crawl, and a post is in the sitemap within the hour of
 * being published.
 *
 * A failed read throws rather than returning a short list. The route answers
 * that with a 503, and the edge keeps serving the last good file
 * (`stale-if-error`); an empty sitemap would read to Google as every post gone.
 */

const PAGE_SIZE = 100;
/** 2,000 posts. Past it the read is refused rather than truncated. */
const MAX_PAGES = 20;

interface RawListPage {
  results?: RawExploitPost[];
  links?: { next?: string | null };
}

export async function buildPostSitemap(): Promise<{ xml: string; urls: number; unplaced: number }> {
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
