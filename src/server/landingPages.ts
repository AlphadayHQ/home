import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side data fetching (§5.10).
 *
 * The credentials read here are plain `process.env`, **not** `import.meta.env
 * .VITE_*`. That is the whole point: Vite inlines every `VITE_`-prefixed value
 * into the client bundle, which is how `VITE_X_APP_SECRET` came to be shipped
 * in public JavaScript on the live site. A non-prefixed name cannot be inlined,
 * and this module only ever executes inside a server function.
 *
 * A route `loader` would not be enough on its own — loaders also run in the
 * browser on client-side navigation, so the fetch has to be a server function
 * to guarantee the secret never crosses.
 */

const API_BASE = process.env.API_BASE_URL ?? "https://api.alphaday.com";

// 404 is deliberately absent: it is a real answer, not a failure.
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;
// Servers can ask for a wait far longer than a render can absorb. Honour
// Retry-After when it is short, ignore it when it would hang the response.
const MAX_RETRY_AFTER_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function authHeaders(): Record<string, string> {
  const id = process.env.API_APP_ID;
  const secret = process.env.API_APP_SECRET;
  if (!id || !secret) {
    throw new Error(
      "landingPages: API_APP_ID / API_APP_SECRET are not set. Refusing to " +
        "fetch — an unauthenticated response would render an error state and " +
        "noindex a live page."
    );
  }
  return { "x-app-id": id, "x-app-secret": secret };
}

function retryDelay(res: Response, attempt: number): number {
  const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
  const header = res.headers.get("retry-after");
  if (!header) return backoff;

  const seconds = Number(header);
  const requested = Number.isFinite(seconds)
    ? seconds * 1000
    : new Date(header).getTime() - Date.now();

  if (!Number.isFinite(requested) || requested <= 0) return backoff;
  return Math.min(Math.max(requested, backoff), MAX_RETRY_AFTER_MS);
}

async function fetchWithRetry(url: string): Promise<Response | null> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let res: Response;
    try {
      res = await fetch(url, { headers: authHeaders() });
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }

    if (res.status === 404) return null;
    if (res.ok) return res;

    lastError = new Error(`${url} returned ${res.status}`);
    if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw lastError;
    }
    await sleep(retryDelay(res, attempt));
  }

  throw lastError;
}

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
