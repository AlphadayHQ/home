import type { AuthorPage } from "../server/authors";
import { authorBySlug, authorJsonLd, authorPath } from "../data/authors";
import { canonicalFor, seoHead } from "./head";

/** Head and structured data for a bio page. */
export function authorHead({ page, indexable }: { page: AuthorPage; indexable: boolean }) {
  const author = authorBySlug(page.slug)!;
  const title = `${author.name}, ${author.desk} | Alphaday`;
  const description = author.bio[0];

  if (!indexable) return seoHead({ index: false, title, description });

  const url = canonicalFor(authorPath(author.slug));
  return seoHead({
    index: true,
    canonical: url,
    title,
    description,
    jsonLd: {
      "@type": "ProfilePage",
      "@id": `${url}#page`,
      url,
      name: title,
      mainEntity: authorJsonLd(author, canonicalFor),
    },
  });
}
