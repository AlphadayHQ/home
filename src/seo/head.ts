import CONFIG from "../config";

/**
 * The shared head helper (§5.1, §5.3).
 *
 * Two invariants are enforced by the type system rather than by review, because
 * both have already failed on the live site once:
 *
 *  1. **An indexable page must declare a canonical.** The current SPA defaults a
 *     missing canonical to the home page, which tells Google that `/api` — the
 *     primary conversion target for audience one — is a duplicate of `/`.
 *  2. **A noindex page must NOT declare one.** `noindex` plus `canonical` is a
 *     conflicting signal: it asks Google to drop the page and to consolidate it
 *     onto a target in the same breath.
 *
 * A discriminated union on `index` makes both unrepresentable. Omitting the
 * canonical on an indexable route fails the build; supplying one on a noindex
 * route fails the build. There is no runtime fallback to get this wrong with.
 */

const ORIGIN = CONFIG.seo.domain.replace(/\/$/, "");

/** Build an absolute canonical URL: no trailing slash except at the root. */
export const canonicalFor = (path = "/"): string => {
  if (path === "/" || path === "") return `${ORIGIN}/`;
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return `${ORIGIN}${withSlash.replace(/\/$/, "")}`;
};

const INDEXABLE_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
const NOINDEX_ROBOTS = "noindex, follow";

interface SeoBase {
  title: string;
  description: string;
  /** Absolute URL. Falls back to the site's default social card. */
  image?: string;
  /** Extra JSON-LD nodes, composed into the site `@graph`. */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

interface IndexableSeo extends SeoBase {
  index: true;
  /** Required. Build `canonicalFor("/path")`, never a hand-written string. */
  canonical: string;
}

interface NoindexSeo extends SeoBase {
  index: false;
  /**
   * `never`, not optional: pairing noindex with a canonical is the conflicting
   * signal this helper exists to make impossible.
   */
  canonical?: never;
}

export type SeoInput = IndexableSeo | NoindexSeo;

export interface HeadOutput {
  meta: Array<Record<string, string>>;
  links: Array<Record<string, string>>;
  scripts: Array<Record<string, string>>;
}

export function seoHead(input: SeoInput): HeadOutput {
  const { title, description, image, jsonLd } = input;
  const canonical = input.index ? input.canonical : undefined;
  const robots = input.index ? INDEXABLE_ROBOTS : NOINDEX_ROBOTS;
  const ogImage = image ?? CONFIG.seo.cover;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { property: "og:site_name", content: CONFIG.seo.siteName },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: CONFIG.seo.socialLinks.twitter },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];

  const links: Array<Record<string, string>> = [];
  if (canonical) {
    meta.push({ property: "og:url", content: canonical });
    links.push({ rel: "canonical", href: canonical });
  }

  const scripts: Array<Record<string, string>> = [];
  if (jsonLd) {
    /*
     * A bare array is not valid JSON-LD — without `@context` a parser has no
     * vocabulary to resolve the types against and silently ignores the whole
     * block. Routes pass a list of nodes and this wraps them into a graph, so
     * a route cannot ship structured data that looks right and does nothing.
     */
    const document = Array.isArray(jsonLd)
      ? { "@context": "https://schema.org", "@graph": jsonLd }
      : { "@context": "https://schema.org", ...jsonLd };
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify(document),
    });
  }

  return { meta, links, scripts };
}
