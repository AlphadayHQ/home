import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchWithRetry } from "./apiFetch";

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
  .handler(async ({ data: slug }): Promise<LandingPage | null> => {
    const res = await fetchWithRetry(
      `${API_BASE}/ui/landing-pages/${encodeURIComponent(slug)}/`
    );
    return res ? ((await res.json()) as LandingPage) : null;
  });

/**
 * Every landing page, following pagination to the end.
 *
 * Used by both the `/dashboards` hub and the sitemap, which is what §5.7 asks
 * for: the sitemap is generated from the same source that serves the pages, so
 * the two cannot drift. The live site derives them separately and publishes
 * URLs that render 404s as a result.
 */
export const listLandingPages = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<LandingPageSummary>> => {
    const pages: Array<LandingPageSummary> = [];
    let next: string | undefined = `${API_BASE}/ui/landing-pages/`;

    while (next) {
      const res: Response | null = await fetchWithRetry(next);
      if (!res) break;
      const body = (await res.json()) as {
        results?: Array<LandingPageSummary>;
        links?: { next?: string };
      };
      pages.push(...(body.results ?? []));
      next = body.links?.next;
    }

    return pages;
  }
);
