import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchWithRetry } from "./apiFetch";
import { hold, holdByKey, withinMs } from "./hold";
import { belongsInSitemap, projectIndexState } from "../seo/indexState";

/**
 * Server-side data fetching (§5.10).
 *
 * The fetch, retry and credential behaviour moved to `apiFetch.ts` when the
 * digest route needed the same client; the reasoning for `process.env` over
 * `import.meta.env.VITE_*`, and for optional credentials, lives there.
 *
 * A route `loader` would not be enough on its own — loaders also run in the
 * browser on client-side navigation, so the fetch has to be a server function
 * to guarantee the secret never crosses.
 */

export interface LandingPageSummary {
  slug: string;
  name: string;
  is_published?: boolean;
  updated_at?: string;
}

export interface LandingPage extends LandingPageSummary {
  icon?: string;
  meta: { title: string; description: string; og_image?: string | null };
  hero: { headline: string; subheading: string };
  dashboard_image?: string;
  intro_paragraph?: string;
  about_project?: string;
  category_cards?: Array<Record<string, unknown>>;
  value_props?: Array<Record<string, unknown>>;
  faqs?: Array<{ question: string; answer: string }>;
  sibling_dashboards?: Array<Record<string, unknown>>;
}

/**
 * The trailing slash is required. Without it the API answers `301`, so every
 * landing page render paid a redirect round-trip before it could start — which
 * on a cache miss is latency the user sees.
 */
export const getLandingPage = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(({ data: slug }): Promise<LandingPage | null> => readLandingPage(slug));

/**
 * Every landing page, following pagination to the end, and whether every page
 * of the list answered. A failed page ends the walk: there is no `next` past it.
 */
async function walkLandingPages(): Promise<{ pages: LandingPageSummary[]; ok: boolean }> {
  const pages: LandingPageSummary[] = [];
  let next: string | undefined = `${API_BASE}/ui/landing-pages/`;

  while (next) {
    const res: Response | null = await fetchWithRetry(next);
    if (!res) return { pages, ok: false };
    const body = (await res.json()) as {
      results?: Array<LandingPageSummary>;
      links?: { next?: string };
    };
    pages.push(...(body.results ?? []));
    next = body.links?.next;
  }

  return { pages, ok: true };
}

/** A published project page: what a link to it needs. */
export interface ProjectSummary {
  slug: string;
  name: string;
}

/**
 * How long the project list serves every render before a refresh. Landing
 * pages are added by hand, a few a month, so a new one waiting ten minutes to
 * appear on /dashboards, or for its first inbound link, costs nothing.
 */
export const PROJECTS_FRESH_MS = 10 * 60_000;

/** How long a failed read with nothing behind it is answered before the next walk. */
export const FAILED_PROJECTS_MS = 30_000;

const landingPages = holdByKey<LandingPage | null>(
  async (slug) => {
    const res = await fetchWithRetry(
      `${API_BASE}/ui/landing-pages/${encodeURIComponent(slug)}/`
    );
    return res ? ((await res.json()) as LandingPage) : null;
  },
  PROJECTS_FRESH_MS,
  {
    keep: (page) => page !== null,
    failMs: FAILED_PROJECTS_MS,
    onBackgroundError: (error) => console.error("Refreshing a project page failed", error),
  }
);

export const readLandingPage = (slug: string): Promise<LandingPage | null> => landingPages.read(slug);
export const resetLandingPages = (): void => landingPages.reset();

/*
 * The published project pages, held: the one read behind the `/dashboards`
 * index, the home and hub partner logos, and the research pages' links to a
 * DAO's or chain's project page. Each used to walk the paginated list itself,
 * on every render.
 *
 * Only a whole walk is held as good, so a short one never replaces it. A short
 * walk with nothing behind it is still answered, for `FAILED_PROJECTS_MS`: the
 * index renders what it has, and a link it lacks is only a link missing —
 * never one to a page that 404s, since a slug is only here if the API served it.
 *
 * The sitemap is built by `scripts/build-sitemap.mjs` with its own walk of the
 * same endpoint, which is what §5.7 asks for: it is generated from the source
 * that serves the pages, so the two cannot drift.
 */
const projects = hold(
  async () => {
    const { pages, ok } = await walkLandingPages();
    return {
      ok,
      projects: pages
        .filter((page) => belongsInSitemap(projectIndexState(page)))
        .map(({ slug, name }): ProjectSummary => ({ slug, name })),
    };
  },
  PROJECTS_FRESH_MS,
  { keep: (read) => read.ok && read.projects.length > 0, failMs: FAILED_PROJECTS_MS }
);

export const readProjects = async (): Promise<ProjectSummary[]> => (await projects.read()).projects;

export const readProjectSlugs = async (): Promise<string[]> =>
  (await readProjects()).map((project) => project.slug);

/** For tests: forget the held list. */
export const resetProjects = (): void => projects.reset();

/** Every published project page, for the `/dashboards` index, which waits for it. */
export const getProjects = createServerFn({ method: "GET" }).handler(readProjects);

/**
 * The slugs for a page that only wants them for links (the partner logos), and
 * so never waits for them. A held list is answered at once; a cold one answers
 * nothing — every logo keeps its app link — while the read carries on to warm
 * it for the next render. `withinMs(…, 0)` gets that split for free: a held
 * value resolves in a microtask, before the zero timer can fire.
 */
export const getProjectSlugsNow = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => (await withinMs(readProjectSlugs(), 0)) ?? []
);
