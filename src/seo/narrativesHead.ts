import type { NarrativeHub, NarrativePage } from "../server/narratives";
import { NARRATIVE_HUB, narrativePath } from "../data/narratives";
import { canonicalFor, seoHead } from "./head";

/**
 * Head and structured data for both narrative routes (content doc B3).
 *
 * Shared for the reason `exploitsHead.ts` is: the hub and the topic pages
 * describe one dataset at two scales, and two copies of a canonical rule drift.
 */

const HUB = NARRATIVE_HUB;

export function narrativesHubHead({
  hub,
  indexable,
}: {
  hub: NarrativeHub;
  indexable: boolean;
}) {
  const title = "What crypto media is talking about, and why | Alphaday";
  const writeUps =
    hub.written === 0
      ? ""
      : hub.written === 1
        ? " and a researched write-up of what is behind one of them"
        : ` and ${hub.written} researched write-ups of what is behind them`;
  const description =
    `The topics trending in crypto news right now, with how much coverage ` +
    `each is getting${writeUps}. Free, no signup.`;

  if (!indexable) return seoHead({ index: false, title, description });

  return seoHead({
    index: true,
    canonical: canonicalFor(HUB),
    title,
    description,
    jsonLd: {
      "@type": "CollectionPage",
      "@id": `${canonicalFor(HUB)}#page`,
      name: "Crypto narratives",
      description,
      url: canonicalFor(HUB),
      hasPart: hub.rows
        .filter((row) => row.post)
        .map((row) => ({
          "@type": "Article",
          headline: row.post?.title,
          url: canonicalFor(narrativePath(row.slug)),
          dateModified: row.post?.modified,
        })),
    },
  });
}

export function narrativeHead({
  page,
  indexable,
}: {
  page: NarrativePage;
  indexable: boolean;
}) {
  const { post, name } = page;
  const title = `${post?.title ?? `${name} in crypto news`} | Alphaday`;
  const description =
    post?.excerpt ||
    `What crypto news, podcasts and video are saying about ${name} this week.`;

  if (!indexable || !post) return seoHead({ index: false, title, description });

  const url = canonicalFor(narrativePath(page.slug));
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
      dateModified: post.modified,
      about: { "@type": "Thing", name },
      publisher: { "@type": "Organization", name: "Alphaday" },
      isAccessibleForFree: true,
      ...(post.sourcesRead.length > 0
        ? { citation: post.sourcesRead.map((source) => ({ "@type": "CreativeWork", url: source })) }
        : {}),
    },
  });
}
