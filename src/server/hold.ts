/**
 * A read held in memory, fresh for a while, and refreshed behind the callers.
 *
 * Every held read on the server goes through this: the exploit list, the posts
 * sitemap and the narrative reads. The rule:
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
 *  - A failed read with nothing good to fall back on is held for `failMs` when
 *    one is given, so a read that keeps failing is not retried by every render.
 *    When it expires the next caller waits for a fresh load rather than being
 *    answered the failure again. Without `failMs` it is answered to the callers
 *    that waited for it and then forgotten.
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

export function hold<T>(
  load: () => Promise<T>,
  freshMs: number,
  { keep = () => true, failMs, onBackgroundError = () => {} }: HoldOptions<T> = {}
): Hold<T> {
  const retryMs = failMs ?? RETRY_AFTER_FAILURE_MS;
  let held: { at: number; value: T; failed: boolean } | null = null;
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
            held = { at: Date.now(), value, failed: false };
            retryAt = 0;
          } else if (held && !held.failed) {
            retryAt = Date.now() + retryMs;
          } else if (failMs !== undefined) {
            held = { at: Date.now(), value, failed: true };
          }
          return held && !held.failed ? held.value : value;
        },
        (error) => {
          if (started === generation && held && !held.failed) retryAt = Date.now() + retryMs;
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
      if (held.failed) return now - held.at >= retryMs ? refresh() : Promise.resolve(held.value);
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
 * `hold` per key, for reads that differ by topic.
 *
 * The keys are bounded by the pages that exist (a topic is trending or written
 * up, or it 404s before anything is read), but a long-lived process sees the
 * trending list turn over. Past `maxKeys` the least recently read key is
 * dropped, so a crawler walking old topic pages costs those pages a cold read
 * and never the hub's warm ones.
 */
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
