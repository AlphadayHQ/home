import type { RawPost } from "./analysis.ts";
import { isAbout, isDecline, isPublished, parseProvenance } from "./analysis.ts";
import type { Exploit } from "./exploits.ts";
import { incidentPath, isIndexableIncident } from "./exploits.ts";

/**
 * Where each published post is read on the site (content doc B2).
 *
 * WHY THE SITEMAP STARTS FROM POSTS
 *
 * A page earns its place in the sitemap through what was written for it, so the
 * list is built from the published posts outward, each one asked where it lives,
 * rather than from the incidents inward. Today every post is an exploit analysis
 * and lives on its incident's page. Other kinds are coming, starting with the
 * narrative pages, and each adds one case to `postPagePath` instead of a second
 * pass over a second corpus.
 *
 * A post with no known page is counted, not dropped silently: a new kind of post
 * that the sitemap does not yet place should show up in the build log, not as a
 * page that quietly never reaches search.
 */

export interface PostPage {
  path: string;
  /**
   * When the newest post on that page last changed, as ISO 8601: its `modified`
   * time, so an edit after publishing moves it, falling back to `published_at`.
   */
  lastmod: string | undefined;
}

type Incident = Pick<Exploit, "id" | "slug" | "title" | "sourceSlug">;

/**
 * The site path a published post is read at, or null when it has none.
 *
 * An exploit analysis is placed on its incident's page only when the page would
 * show it: the incident exists, the title cross-check passes (`isAbout`), and the
 * page is indexable with an analysis on it, which every incident is. Asking
 * `isIndexableIncident` anyway keeps the sitemap from ever listing a URL the
 * route serves `noindex`.
 */
export function postPagePath(
  post: RawPost,
  incidents: ReadonlyMap<string, Incident>
): string | null {
  if (!isPublished(post.status)) return null;
  const content = typeof post.content === "string" ? post.content : "";
  const title = typeof post.title === "string" ? post.title : "";
  // A published decline still names its incident; the page drops it, so must this.
  if (isDecline(content)) return null;

  const provenance = parseProvenance(content);
  if (provenance) {
    const exploit = incidents.get(String(provenance.incidentId));
    if (!exploit || !isAbout({ title }, exploit.title)) return null;
    return isIndexableIncident({
      exploit,
      coverageCount: 0,
      coverageOk: true,
      hasAnalysis: true,
    })
      ? incidentPath(exploit)
      : null;
  }

  // Other kinds of post add their case here, e.g. a narrative post placed at
  // `/research/narratives/{slug}` from its own provenance.
  return null;
}

/**
 * Every page that carries a published post, once each.
 *
 * Two posts can land on one page (the agent compares its work by title, so a
 * second analysis of one incident is possible); the page is listed once, dated
 * by whichever post changed last.
 */
export function postPages(
  posts: RawPost[],
  incidents: Incident[]
): { pages: PostPage[]; unplaced: number } {
  const byId = new Map(incidents.map((incident) => [String(incident.id), incident]));
  const pages = new Map<string, PostPage>();
  let unplaced = 0;

  for (const post of posts) {
    if (!isPublished(post.status)) continue;
    const path = postPagePath(post, byId);
    if (!path) {
      unplaced += 1;
      continue;
    }
    const changed = new Date(String(post.modified ?? post.published_at ?? ""));
    const lastmod = Number.isNaN(changed.getTime()) ? undefined : changed.toISOString();
    const existing = pages.get(path);
    if (!existing || (lastmod && (!existing.lastmod || lastmod > existing.lastmod))) {
      pages.set(path, { path, lastmod });
    }
  }

  return { pages: [...pages.values()], unplaced };
}
