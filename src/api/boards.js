import { LANDING_MOCKS } from "./mocks/landing";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const APP_ID = import.meta.env.VITE_X_APP_ID;
const APP_SECRET = import.meta.env.VITE_X_APP_SECRET;
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

function authHeaders() {
  return {
    "x-app-id": APP_ID,
    "x-app-secret": APP_SECRET,
  };
}

function apiUrl(path) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

// A failed fetch now puts the page into a `noindex` error state, so a single
// transient blip is an explicit removal directive on a real page. The case that
// matters most is 429: the moment we are most likely to be rate-limited is
// Googlebot working briskly through all 66 project URLs, which is exactly when
// a removal directive is most expensive. Retrying the retryable statuses adds
// 1.2s in the worst case on plain backoff, 4s if the server sends a long
// Retry-After (two waits, each capped below), and removes most of that
// exposure.
//
// 404 is deliberately not here — it is a real answer, not a failure.
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;
// Servers can ask for a wait far longer than a page render can absorb. Honour
// Retry-After when it is short, ignore it when it would hang the page.
const MAX_RETRY_AFTER_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryDelay(res, attempt) {
  const backoff = BASE_DELAY_MS * 2 ** (attempt - 1);
  const header = res?.headers?.get?.("retry-after");
  if (!header) return backoff;

  const seconds = Number(header);
  const requested = Number.isFinite(seconds)
    ? seconds * 1000
    : new Date(header).getTime() - Date.now();

  if (!Number.isFinite(requested) || requested <= 0) return backoff;
  return Math.min(Math.max(requested, backoff), MAX_RETRY_AFTER_MS);
}

export async function fetchLandingPageBySlug(slug) {
  if (USE_MOCKS) {
    return LANDING_MOCKS[slug] || null;
  }

  const url =
    // Trailing slash is required: without it the API 301s, so every landing
    // page render paid a redirect round-trip before it could start.
    apiUrl(`/ui/landing-pages/${encodeURIComponent(slug)}/`);

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let res;
    try {
      res = await fetch(url, { headers: authHeaders() });
    } catch (err) {
      // Network-level failure: no response at all, always worth one more try.
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }

    if (res.status === 404) return null;
    if (res.ok) return res.json();

    lastError = new Error(`Failed to load landing page: ${res.status}`);

    if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
      throw lastError;
    }

    await sleep(retryDelay(res, attempt));
  }

  throw lastError;
}
