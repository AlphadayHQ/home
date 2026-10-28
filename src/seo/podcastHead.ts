import type { PodcastArticle, PodcastHub } from "../server/podcasts";
import { PODCAST_HUB, podcastPostPath } from "../data/podcastPosts";
import { canonicalFor, seoHead } from "./head";

/**
 * Head and structured data for both podcast routes. Shared for the reason
 * `exploitsHead.ts` is: the hub and the pages describe one set of posts at two
 * scales, and two copies of a canonical rule drift.
 */

/** What a result page shows of a description. */
const DESCRIPTION_ROOM = 155;

const clip = (text: string, room: number): string =>
  text.length > room ? `${text.slice(0, room).replace(/\s+\S*$/, "")}…` : text;

export function podcastHubHead({ hub, indexable }: { hub: PodcastHub; indexable: boolean }) {
  const paged = hub.page > 1 ? `, page ${hub.page}` : "";
  const title = `What crypto podcasts are arguing${paged} | Alphaday`;
  const description =
    `${hub.total} ${hub.total === 1 ? "idea" : "ideas"} from crypto podcasts, each quoted from ` +
    `the episode with timestamps and checked against the outside sources. Free, no signup.`;

  if (!indexable) return seoHead({ index: false, title, description });

  const url = canonicalFor(PODCAST_HUB);
  return seoHead({
    index: true,
    canonical: url,
    title,
    description,
    jsonLd: {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      name: "What crypto podcasts are arguing",
      description,
      url,
      hasPart: hub.rows.map((row) => ({
        "@type": "Article",
        headline: row.title,
        url: canonicalFor(podcastPostPath(row.slug)),
        ...(row.publishedAt ? { datePublished: row.publishedAt } : {}),
      })),
    },
  });
}

export function podcastArticleHead({
  article,
  indexable,
}: {
  article: PodcastArticle;
  indexable: boolean;
}) {
  const { post } = article;
  const { meta } = post;
  const title = `${post.title} | Alphaday`;
  // Never empty on an indexable page: with no excerpt, say what the page is.
  const description = clip(
    post.excerpt || "An idea from crypto podcasts, quoted from the episode and checked against the sources.",
    DESCRIPTION_ROOM
  );

  if (!indexable) return seoHead({ index: false, title, description });

  const url = canonicalFor(podcastPostPath(post.slug));
  // The episodes it quotes are what it is based on; only those with a page can be cited.
  const episodes = meta.episodes
    .filter((episode) => episode.pageUrl)
    .map((episode) => ({
      "@type": "PodcastEpisode",
      url: episode.pageUrl,
      ...(episode.title ? { name: episode.title } : {}),
      ...(episode.aired ? { datePublished: episode.aired } : {}),
      partOfSeries: { "@type": "PodcastSeries", name: episode.show },
    }));
  return seoHead({
    index: true,
    canonical: url,
    title,
    description,
    jsonLd: {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: post.title,
      description,
      url,
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      ...(post.modified ? { dateModified: post.modified } : {}),
      author: { "@type": "Organization", name: "Alphaday" },
      publisher: { "@type": "Organization", name: "Alphaday" },
      isAccessibleForFree: true,
      ...(episodes.length > 0 ? { isBasedOn: episodes } : {}),
      ...(meta.sourcesRead.length > 0
        ? { citation: meta.sourcesRead.map((source) => ({ "@type": "CreativeWork", url: source })) }
        : {}),
      keywords: ["crypto podcasts", ...meta.topics],
    },
  });
}
