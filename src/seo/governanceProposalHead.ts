import type { ProposalArticle } from "../server/governanceProposals";
import { proposalPath } from "../data/governanceProposals";
import { canonicalFor, seoHead } from "./head";

/**
 * Head and structured data for a governance proposal page. The facts it states
 * are the page's own, so the description never claims a vote result the page
 * dates and the reader may find has moved on: it is the excerpt, which says
 * where the proposal stood when it was written.
 */

/** What a result page shows of a description. */
const DESCRIPTION_ROOM = 155;

const clip = (text: string, room: number): string =>
  text.length > room ? `${text.slice(0, room).replace(/\s+\S*$/, "")}…` : text;

export function proposalArticleHead({
  article,
  indexable,
}: {
  article: ProposalArticle;
  indexable: boolean;
}) {
  const { post } = article;
  const { meta } = post;
  const title = `${post.title} | Alphaday`;
  // Never empty on an indexable page: with no excerpt, say what the page is.
  const description = clip(
    post.excerpt ||
      `What the ${meta.dao ? `${meta.dao} ` : ""}proposal changes, the case for it, the objections, and where it stands.`,
    DESCRIPTION_ROOM
  );

  if (!indexable) return seoHead({ index: false, title, description });

  const url = canonicalFor(proposalPath(post.slug));
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
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      ...(post.modified ? { dateModified: post.modified } : {}),
      author: { "@type": "Organization", name: "Alphaday" },
      publisher: { "@type": "Organization", name: "Alphaday" },
      ...(meta.forumUrl ? { isBasedOn: meta.forumUrl } : {}),
      ...(meta.sourcesRead.length > 0
        ? { citation: meta.sourcesRead.map((source) => ({ "@type": "CreativeWork", url: source })) }
        : {}),
      ...(meta.dao ? { about: { "@type": "Organization", name: meta.dao } } : {}),
      keywords: ["DAO governance", "governance proposal", ...(meta.dao ? [meta.dao] : [])],
    },
  });
}
