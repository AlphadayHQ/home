const REQUEST_GAP_MS = 7000;
const MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_MS = 60_000;
const MAX_RETRY_MS = 120_000;

let nextRequestAt = 0;

export async function sitemapFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    const wait = nextRequestAt - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));

    const response = await fetch(url, init);
    // Share the public quota across event and landing-page reads.
    nextRequestAt = Date.now() + REQUEST_GAP_MS;
    if (response.status !== 429 || attempt === MAX_ATTEMPTS) return response;

    const header = response.headers.get("retry-after")?.trim();
    const seconds = header ? Number(header) : NaN;
    const requested = Number.isFinite(seconds) && seconds >= 0
      ? seconds * 1000
      : header ? Date.parse(header) - Date.now() : NaN;
    const delay = Number.isFinite(requested)
      ? Math.max(REQUEST_GAP_MS, requested)
      : DEFAULT_RETRY_MS;

    // Fail rather than retry before an excessive Retry-After expires.
    if (delay > MAX_RETRY_MS) return response;
    await response.body?.cancel();
    nextRequestAt = Date.now() + delay;
  }
}
