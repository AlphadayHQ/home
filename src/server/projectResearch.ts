import { createServerFn } from "@tanstack/react-start";
import { withinMs } from "./hold";
import { readExploitList } from "./exploits";
import { readProposalList } from "./governanceProposals";
import { isAbout } from "../data/projectLinks";

/**
 * The research a project page links to: governance analyses of its DAO and
 * exploit analyses on its chain, matched as `data/projectLinks.ts` says.
 *
 * Read from the lists the hubs already hold, so a warm render costs nothing. A
 * cold list is not waited for: the page renders without the section, and the
 * read carries on to warm it for the next one.
 *
 * Titles and slugs only. The project page sells the dashboard (content doc C3
 * keeps even the digest to a single link for that reason), so this is a short
 * list of links under the call to action, not a summary that answers it.
 */

/** How many of each kind a project page links to. */
export const RESEARCH_PER_KIND = 4;

/**
 * How long a project page waits for either list: not at all. A held list
 * resolves in a microtask, before the zero timer fires; a cold one is left to
 * warm for the next render rather than holding this one, and an unknown slug,
 * whose page is a 404, never waits on research it will not show.
 */
export const RESEARCH_WAIT_MS = 0;

export interface ResearchLink {
  slug: string;
  title: string;
}

export interface ProjectResearch {
  governance: ResearchLink[];
  exploits: ResearchLink[];
}

export const NO_RESEARCH: ProjectResearch = { governance: [], exploits: [] };

const linkOf = ({ slug, title }: ResearchLink): ResearchLink => ({ slug, title });

export async function buildProjectResearch(slug: string): Promise<ProjectResearch> {
  const [proposals, exploits] = await Promise.all([
    withinMs(readProposalList(), RESEARCH_WAIT_MS),
    withinMs(readExploitList(), RESEARCH_WAIT_MS),
  ]);
  return {
    governance: (proposals?.rows ?? [])
      .filter((row) => isAbout(row.meta.dao, slug))
      .slice(0, RESEARCH_PER_KIND)
      .map(linkOf),
    exploits: (exploits?.rows ?? [])
      .filter((row) => isAbout(row.meta.chain, slug))
      .slice(0, RESEARCH_PER_KIND)
      .map(linkOf),
  };
}

/**
 * The slug is only compared, never put in a URL, so the check is that it is a
 * string of a sane length rather than that a page exists for it.
 */
export const getProjectResearch = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (typeof slug !== "string" || slug.length > 100) {
      throw new Error(`getProjectResearch: ${String(slug)} is not a project slug`);
    }
    return slug;
  })
  .handler(async ({ data: slug }) => buildProjectResearch(slug));
