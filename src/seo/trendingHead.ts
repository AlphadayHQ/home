import type { TrendingArticle, TrendingHub } from "../server/trending";
import { TRENDING_HUB, trendingPostPath } from "../data/trending";
import { canonicalFor, seoHead } from "./head";

/**
 * Head and structured data for both trending routes (content doc B3).
 *
 * Shared for the reason `exploitsHead.ts` is: the hub and the topic pages
 * describe one set of posts at two scales, and two copies of a canonical rule
 * drift.
 */

export function trendingHubHead({ hub, indexable }: { hub: TrendingHub; indexable: boolean }) {
  const paged = hub.page > 1 ? `, page ${hub.page}` : "";
  const title = `Why crypto topics are trending${paged} | Alphaday`;
  const description =
    `Researched write-ups of why ${hub.total} crypto ${hub.total === 1 ? "topic is" : "topics are"} ` +
    `in the news, each updated as the story moves, with every source listed. Free, no signup.`;

  if (!indexable) return seoHead({ index: false, title, description });

  const url = canonicalFor(TRENDING_HUB);
  return seoHead({
    index: true,
    canonical: url,
    title,
    description,
    jsonLd: {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      name: "Why crypto topics are trending",
      description,
      url,
      hasPart: hub.rows.map((row) => ({
        "@type": "Article",
        headline: row.title,
        url: canonicalFor(trendingPostPath(row.slug)),
        dateModified: row.latest,
      })),
    },
  });
}

export function trendingArticleHead({
  article,
  indexable,
}: {
  article: TrendingArticle;
  indexable: boolean;
}) {
  const { post, lead, page } = article;
  // The page's title names the topic and never dates; the newest update says
  // why it is in the news now, so the search result does too.
  const now = page > 1 ? `earlier updates, page ${page}` : lead.title !== post.title ? lead.title : "";
  const title = `${now ? `${post.title}: ${now}` : post.title} | Alphaday`;
  const description =
    lead.excerpt || post.excerpt || `Why ${post.topic} is in the crypto news, researched and sourced.`;

  if (!indexable) return seoHead({ index: false, title, description });

  const url = canonicalFor(trendingPostPath(post.slug));
  const sources = [
    ...new Set([
      ...article.updates.flatMap((update) => update.sourcesRead),
      ...(post.blocks ? post.sourcesRead : []),
    ]),
  ];
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
      datePublished: post.publishedAt,
      dateModified: article.latest,
      about: { "@type": "Thing", name: post.topic },
      publisher: { "@type": "Organization", name: "Alphaday" },
      isAccessibleForFree: true,
      ...(sources.length > 0
        ? { citation: sources.map((source) => ({ "@type": "CreativeWork", url: source })) }
        : {}),
    },
  });
}
