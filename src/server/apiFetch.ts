/**
 * The shared server-side API client (§5.10).
 *
 * Extracted from `landingPages.ts` when the digest route needed the same retry
 * and credential behaviour. Two modules each keeping their own copy of this is
 * the shape of finding 22 — `/api` hardcoded a `curl` its mobile variant read
 * from a shared string, and the two disagreed on the same screen. One source.
 *
 * The credentials read here are plain `process.env`, **not** `import.meta.env
 * .VITE_*`. That is the whole point: Vite inlines every `VITE_`-prefixed value
 * into the client bundle, which is how `VITE_X_APP_SECRET` came to be shipped
 * in public JavaScript on the live site. A non-prefixed name cannot be inlined,
 * and this module only ever executes inside a server function.
 */

export const API_BASE = process.env.API_BASE_URL ?? "https://api.alphaday.com";

// 404 is deliberately absent: it is a real answer, not a failure.
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;
/*
 * Ceiling on how long a `Retry-After` can hold a render.
 *
 * Note what this does and does not do: a server asking for 60s is retried after
 * 2s, so the wait is **clamped, not ignored** — on a 429 that means retrying
 * inside the window the server asked us to stay out of, which compounds the
 * throttle rather than respecting it. That is a deliberate trade against a
 * render that cannot wait a minute, and it is survivable here only because these
 * are unauthenticated reads behind an ISR cache rather than a hot request path.
 *
 * If the API ever starts rate-limiting in earnest, the fix is to give up on the
 * feed for this regeneration — `fetchJsonSoft` already degrades a failed feed to
 * "unavailable" — rather than to retry sooner than asked.
 */
const MAX_RETRY_AFTER_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Credentials are optional, and that is deliberate.
 *
 * Verified 8 Sep 2026: every endpoint this site reads — `/ui/landing-pages/`
 * and the item collections — returns 200 anonymously. Only `/ui/views/` demands
 * auth, and the rebuild does not use it. So the site does not need the
 * credential at all, and hard-failing without one would turn a missing GitHub
 * secret into a total outage for no benefit.
 *
 * They are still sent when present, so that if the API tightens access later
 * the fix is setting an env var rather than shipping code.
 */
export function authHeaders(): Record<string, string> {
  const id = process.env.API_APP_ID;
  const secret = process.env.API_APP_SECRET;
  return id && secret ? { "x-app-id": id, "x-app-secret": secret } : {};
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

export async function fetchWithRetry(url: string): Promise<Response | null> {
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

/**
 * A feed read that treats failure as absence rather than as an outage.
 *
 * The digest composes ~20 upstream calls into one page. `fetchWithRetry` throws
 * after three attempts, which is right for a landing page — no record, no page —
 * and wrong here: one slow feed would take down a digest the other six could
 * still fill honestly. A null section renders as "nothing in this window",
 * which is a true statement about what the page can show.
 *
 * The distinction that keeps this from hiding a real outage: an empty *result*
 * and a failed *request* both yield no items, but only the failure is counted
 * into `unavailable` on the digest, and the page says so rather than implying
 * the window was quiet.
 */
export async function fetchJsonSoft<T>(url: string): Promise<T | null> {
  try {
    const res = await fetchWithRetry(url);
    return res ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
