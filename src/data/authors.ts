import { EXPLOIT_HUB, EXPLOIT_TYPE } from "./exploitPosts.ts";
import { GOVERNANCE_SECTION, GOVERNANCE_TYPE } from "./governanceProposals.ts";
import { PODCAST_HUB, PODCAST_TYPE } from "./podcastPosts.ts";
import { TRENDING_HUB, TRENDING_TYPE } from "./trending.ts";

/**
 * The bylines the research pages carry: one name per beat, each with a bio page.
 *
 * WHAT A BIO SAYS, AND WHAT IT DOES NOT
 *
 * A bio describes the beat: what the pages under the name cover and what they
 * are written from, which is true of every one of them. Nothing here gives a
 * name credentials, an employer, a number of years or a history, since none of
 * that would be true.
 *
 * The byline follows from the post's `type`, so a post needs nothing new to
 * carry one, and a type with no byline here simply has none.
 *
 * No images here: `scripts/build-sitemap.mjs` reaches this module through
 * `seo/indexState.ts` under plain node, which cannot import a `.webp`. The
 * avatars are in `components/authorAvatars.js`.
 */

export interface Author {
  slug: string;
  name: string;
  /** The beat, as a byline names it. */
  desk: string;
  /** The post type whose pages carry this byline. */
  type: string;
  /** Where every page under this name is listed. */
  hub: string;
  hubLabel: string;
  /** The bio, a paragraph per entry. */
  bio: string[];
}

export const AUTHORS: readonly Author[] = [
  {
    slug: "peter",
    name: "Peter",
    desk: "Governance",
    type: GOVERNANCE_TYPE,
    hub: GOVERNANCE_SECTION,
    hubLabel: "The DAO governance report",
    bio: [
      "Peter covers DAO governance for Alphaday, one proposal per page: what it changes, the case made for it, the objections raised, and where the vote stood when the page was written.",
      "The pages follow a proposal from the forum thread where it starts to the Snapshot or onchain vote that settles it, and read the proposal as written rather than the summary of it.",
    ],
  },
  {
    slug: "david",
    name: "David",
    desk: "Security",
    type: EXPLOIT_TYPE,
    hub: EXPLOIT_HUB,
    hubLabel: "Every exploit analysis",
    bio: [
      "David covers crypto security for Alphaday: how each exploit worked, the losses reported, and what the protocol and the researchers said about it.",
      "Each analysis is built from the incident reports, the onchain record and the press coverage, and follows the attack transaction rather than the headline.",
    ],
  },
  {
    slug: "emily",
    name: "Emily",
    desk: "Podcasts",
    type: PODCAST_TYPE,
    hub: PODCAST_HUB,
    hubLabel: "Every podcast idea",
    bio: [
      "Emily covers the crypto podcast circuit for Alphaday, one idea per page: who argued it, on which episode, and at what minute.",
      "Each page quotes the episode itself and checks what was said against outside sources, so a reader can tell an argument from a fact.",
    ],
  },
  {
    slug: "sarah",
    name: "Sarah",
    desk: "Trending",
    type: TRENDING_TYPE,
    hub: TRENDING_HUB,
    hubLabel: "Every trending topic",
    bio: [
      "Sarah covers what is trending in crypto news for Alphaday: why a topic is in the headlines, researched from the original sources rather than the coverage of them.",
      "Each topic has one page that grows: when it trends again with something new, the update goes on top, so the page always leads with why it is in the news now.",
    ],
  },
];

export const AUTHORS_SECTION = "/authors";

export const authorPath = (slug: string): string => `${AUTHORS_SECTION}/${slug}`;

/** Every bio page, for the index state and the sitemap. */
export const authorPaths = (): string[] => AUTHORS.map((author) => authorPath(author.slug));

export const authorBySlug = (slug: unknown): Author | null =>
  AUTHORS.find((author) => author.slug === slug) ?? null;

export const authorForType = (type: unknown): Author | null =>
  AUTHORS.find((author) => author.type === type) ?? null;

/** The byline as a page's structured data names its author. */
export function authorJsonLd(author: Author, canonical: (path: string) => string) {
  return {
    "@type": "Person",
    name: author.name,
    url: canonical(authorPath(author.slug)),
    description: author.bio[0],
    worksFor: { "@type": "Organization", name: "Alphaday" },
  };
}
