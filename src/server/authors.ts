import { createServerFn } from "@tanstack/react-start";
import type { Author } from "../data/authors";
import { AUTHORS, authorBySlug } from "../data/authors";
import { EXPLOIT_TYPE, exploitPostPath } from "../data/exploitPosts";
import { GOVERNANCE_TYPE, proposalPath } from "../data/governanceProposals";
import { PODCAST_TYPE, podcastPostPath } from "../data/podcastPosts";
import { TRENDING_TYPE, trendingPostPath } from "../data/trending";
import { readExploitList } from "./exploits";
import { readProposalList } from "./governanceProposals";
import { readPodcastList } from "./podcasts";
import { readTopics } from "./trending";

/**
 * A bio page's list of the newest pages under the name.
 *
 * The pages come from the list each hub already holds, so this costs no read
 * of its own once the hub is warm. A short read throws, as the hubs do: the edge
 * keeps its last good copy rather than caching a page listing fewer than exist.
 */

/** How many pages a bio page lists; the hub has the rest. */
export const LATEST = 12;

export interface AuthorEntry {
  href: string;
  title: string;
  /** When it was published, or for a trending topic last updated; ISO 8601. */
  date: string;
}

export interface AuthorPage {
  slug: string;
  /** The newest pages under this name. */
  latest: AuthorEntry[];
  /** Every page under this name. */
  total: number;
}

const newestFirst = (a: AuthorEntry, b: AuthorEntry): number => b.date.localeCompare(a.date);

/** Every page under a name, newest first. */
async function entriesFor(author: Author): Promise<AuthorEntry[]> {
  const whole = <T>(read: { rows: T[]; ok: boolean }): T[] => {
    if (!read.ok) throw new Error(`authors: the ${author.type} list read short`);
    return read.rows;
  };
  switch (author.type) {
    case GOVERNANCE_TYPE:
      return whole(await readProposalList()).map((row) => ({
        href: proposalPath(row.slug),
        title: row.title,
        date: row.publishedAt,
      }));
    case EXPLOIT_TYPE:
      return whole(await readExploitList()).map((row) => ({
        href: exploitPostPath(row.slug),
        title: row.title,
        date: row.publishedAt,
      }));
    case PODCAST_TYPE:
      return whole(await readPodcastList()).map((row) => ({
        href: podcastPostPath(row.slug),
        title: row.title,
        date: row.publishedAt,
      }));
    case TRENDING_TYPE:
      // `readTopics` throws on a short read itself.
      return (await readTopics()).map((topic) => ({
        href: trendingPostPath(topic.page.slug),
        title: topic.page.topic,
        date: topic.latest,
      }));
    default:
      return [];
  }
}

/** A bio page, or null for a slug that is not a name. */
export async function buildAuthorPage(slug: string): Promise<AuthorPage | null> {
  const author = authorBySlug(slug);
  if (!author) return null;
  const entries = (await entriesFor(author)).sort(newestFirst);
  return { slug: author.slug, latest: entries.slice(0, LATEST), total: entries.length };
}

export const getAuthorPage = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (!AUTHORS.some((author) => author.slug === slug)) {
      throw new Error(`getAuthorPage: ${String(slug)} is not an author`);
    }
    return slug;
  })
  .handler(async ({ data: slug }) => buildAuthorPage(slug));
