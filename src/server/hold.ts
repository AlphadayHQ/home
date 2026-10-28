/**
 * A read held in memory, fresh for a while, and refreshed behind the callers.
 *
 * Every held read on the server goes through this: the exploit list, the posts
 * sitemap, the trending reads and the governance proposal list. The rule:
 *
 *  - With nothing held, callers wait for one shared load.
 *  - While fresh, the held value is answered at once.
 *  - Once stale, the held value is still answered at once, and one refresh runs
 *    behind it for the next caller.
 *  - Only a value `keep` accepts is held as good. Once something good is held, a
 *    failed refresh never replaces it.
 *  - A failed refresh behind a good value is not tried again for `retryMs`.
 *    Without that, every request during an outage would start another refresh,
 *    each three attempts deep, against an API that is already failing.
 *  - A failed read with nothing good to fall back on, a value `keep` refuses or a
 *    load that throws, is held for `failMs` when one is given, so a read that
 *    keeps failing is not retried by every render: callers in that window get
 *    the same value, or the same error. When it expires the next caller waits
 *    for a fresh load rather than being answered the failure again. Without
 *    `failMs` it is answered to the callers that waited for it and forgotten.
 */

/*
 * WHY `hold` AND `holdByKey` ARE MARKED `@__NO_SIDE_EFFECTS__`
 *
 * Their callers (`server/exploits.ts`, `server/trending.ts`,
 * `server/governanceProposals.ts`) are also imported by
 * routes for their server functions, so they reach the client bundle, where the
 * handlers are stubbed out. A held read is created at module level, and to the
 * bundler an unmarked call there might have an effect, so it kept the call, its
 * loader, and through it `apiFetch` with the credential header names: the
 * deploy's B20 check failed on 20 October. Marked, a call whose result the
 * client never reads is dropped with everything it reaches. Keep the marks.
 */

/** How long a failed refresh behind a good value waits, unless `failMs` says. */
export const RETRY_AFTER_FAILURE_MS = 30_000;

export interface HoldOptions<T> {
  keep?: (value: T) => boolean;
  /** How long a failed read is answered, or a failed refresh waits, before it is tried again. */
  failMs?: number;
  /**
   * Called when a refresh started behind a stale value rejects. Nobody is
   * waiting on that promise, so this is the one place its error can surface,
   * and it is called once per refresh, not once per caller that shared it.
   */
  onBackgroundError?: (error: unknown) => void;
}

export interface Hold<T> {
  read(): Promise<T>;
  /** For tests: forget the held value, and any load still in flight. */
  reset(): void;
}

/* @__NO_SIDE_EFFECTS__ */
export function hold<T>(
  load: () => Promise<T>,
  freshMs: number,
  { keep = () => true, failMs, onBackgroundError = () => {} }: HoldOptions<T> = {}
): Hold<T> {
  const retryMs = failMs ?? RETRY_AFTER_FAILURE_MS;
  let held:
    | { at: number; failed: false; value: T }
    | { at: number; failed: true; answer: () => Promise<T> }
    | null = null;
  let inFlight: Promise<T> | null = null;
  /** No background refresh before this; set when one fails. */
  let retryAt = 0;
  // Bumped by `reset`, so a load that started before it cannot write after it.
  let generation = 0;

  const refresh = (): Promise<T> => {
    if (inFlight) return inFlight;
    const started = generation;
    const current: Promise<T> = load()
      .then(
        (value) => {
          if (started !== generation) return value;
          if (keep(value)) {
            held = { at: Date.now(), failed: false, value };
            retryAt = 0;
          } else if (held && !held.failed) {
            retryAt = Date.now() + retryMs;
          } else if (failMs !== undefined) {
            held = { at: Date.now(), failed: true, answer: () => Promise.resolve(value) };
          }
          return held && !held.failed ? held.value : value;
        },
        (error) => {
          if (started === generation) {
            // Behind a good value, wait before the next try. Otherwise hold the
            // error itself for `failMs`, exactly as a failed value is held.
            if (held && !held.failed) retryAt = Date.now() + retryMs;
            else if (failMs !== undefined) {
              held = { at: Date.now(), failed: true, answer: () => Promise.reject(error) };
            }
          }
          throw error;
        }
      )
      .finally(() => {
        if (inFlight === current) inFlight = null;
      });
    inFlight = current;
    return current;
  };

  return {
    read() {
      if (!held) return refresh();
      const now = Date.now();
      if (held.failed) return now - held.at >= retryMs ? refresh() : held.answer();
      if (now - held.at >= freshMs && now >= retryAt && !inFlight) {
        refresh().catch(onBackgroundError);
      }
      return Promise.resolve(held.value);
    },
    reset() {
      generation += 1;
      held = null;
      inFlight = null;
      retryAt = 0;
    },
  };
}

/**
 * `hold` per key, for reads that differ by post.
 *
 * The keys are bounded by the posts that exist, but a long-lived process sees
 * posts edited, and each version is a key. Past `maxKeys` the least recently
 * read key is dropped, so a crawler walking old topic pages costs those pages a
 * cold read and never the recent ones.
 */
/* @__NO_SIDE_EFFECTS__ */
export function holdByKey<T>(
  load: (key: string) => Promise<T>,
  freshMs: number,
  options: HoldOptions<T> = {},
  maxKeys = 500
): { read(key: string): Promise<T>; reset(): void } {
  // A Map iterates in insertion order; re-inserting on each read keeps the
  // least recently read key first.
  const holds = new Map<string, Hold<T>>();
  return {
    read(key) {
      let entry = holds.get(key);
      if (entry) {
        holds.delete(key);
      } else {
        entry = hold(() => load(key), freshMs, options);
        if (holds.size >= maxKeys) {
          const oldest = holds.keys().next().value;
          if (oldest !== undefined) holds.delete(oldest);
        }
      }
      holds.set(key, entry);
      return entry.read();
    },
    reset() {
      for (const entry of holds.values()) entry.reset();
      holds.clear();
    },
  };
}

/**
 * The value if it arrives within `ms`, else null; never a rejection. For a held
 * read a page can do without: after a deploy the read is cold, and the page
 * does not wait for it, while the load carries on to warm it for the next render.
 */
export function withinMs<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise.catch(() => null), late]).finally(() => clearTimeout(timer));
}
