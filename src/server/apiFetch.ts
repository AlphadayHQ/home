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
const WAIT_BUDGET_MS = 120_000;
let requestQueue: Promise<unknown> | undefined;
let retryAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Server credentials select the backend's client-app quota. */
export function authHeaders(): Record<string, string> {
  const id = process.env.API_APP_ID;
  const secret = process.env.API_APP_SECRET;
  return id && secret ? { "x-app-id": id, "x-app-secret": secret } : {};
}

function retryDelay(res: Response, attempt: number): number {
  const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
  const header = res.headers.get("retry-after");
  if (!header) return res.status === 429 ? 60_000 : backoff;

  const seconds = Number(header);
  const requested = Number.isFinite(seconds)
    ? seconds * 1000
    : new Date(header).getTime() - Date.now();

  if (!Number.isFinite(requested) || requested < 0) {
    return res.status === 429 ? 60_000 : backoff;
  }
  return Math.max(requested, backoff);
}

async function request(url: string, deadline: number): Promise<Response> {
  const pending = (requestQueue ?? Promise.resolve()).then(async () => {
    const wait = Math.max(0, retryAt - Date.now());
    if (Date.now() + wait > deadline) {
      throw new Error(`${url} exceeded the API retry wait budget`);
    }
    if (wait > 0) await sleep(wait);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`${url} exceeded the API retry wait budget`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(15_000, remaining));
    try {
      const res = await fetch(url, { headers: authHeaders(), signal: controller.signal });
      if (res.status === 429) {
        // One caller's throttle pauses every queued backend read.
        retryAt = Math.max(retryAt, Date.now() + retryDelay(res, 1));
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  });
  requestQueue = pending.catch(() => {});
  return pending;
}

export async function fetchWithRetry(url: string): Promise<Response | null> {
  let lastError: unknown;
  const deadline = Date.now() + WAIT_BUDGET_MS;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let res: Response;
    try {
      res = await request(url, deadline);
    } catch (err) {
      lastError = err;
      if (Date.now() >= deadline || retryAt > deadline) throw err;
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
    const delay = retryDelay(res, attempt);
    if (Date.now() + delay > deadline) throw lastError;
    await res.body?.cancel();
    if (res.status !== 429) await sleep(delay);
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
