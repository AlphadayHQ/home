/**
 * The window vocabulary shared by the digest's server function and its page.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * `server/thisWeek.ts` imports `createServerFn` and, through `apiFetch.ts`,
 * reads `process.env.API_APP_SECRET`. The page component needs the window labels
 * and the narrowing helper from the same conceptual unit — and importing them
 * from the server module would pull that whole graph into the client bundle. Best
 * case that is dead weight on every visitor; worst case it is the
 * `VITE_X_APP_SECRET` leak (#20) reintroduced by an import statement.
 *
 * So the pure half lives here, with no imports of its own. Same cut, same
 * reason, as `mcpTools.js` / `mcpCapabilities.js` and `mcpClients.js` /
 * `mcpClientGuides.js`: the shared thing is small and the heavy thing stays
 * behind the boundary that needs it.
 *
 * WHY ONE DIRECTIONAL HELPER AND NOT TWO FUNCTIONS
 *
 * Most feeds look backwards from the window end; events look forwards. Those were
 * briefly two separate code paths, and the counts were computed on the server
 * while the rows were filtered in the browser — so the two could disagree about
 * which direction the window ran, and did: a card read "24 events" above two
 * rows. `inWindow` takes the direction as an argument and both sides pass the
 * section's own flag, which makes disagreeing impossible rather than unlikely.
 */

/**
 * C3: 24h / 7d / 30d, as an in-page control that does not change the URL.
 *
 * @type {ReadonlyArray<"24h" | "7d" | "30d">}
 */
export const WINDOWS = ["24h", "7d", "30d"];

/** @type {Record<"24h" | "7d" | "30d", number>} */
export const WINDOW_DAYS = { "24h": 1, "7d": 7, "30d": 30 };

/** @type {Record<"24h" | "7d" | "30d", string>} */
export const WINDOW_LABEL = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

/** @type {Record<"24h" | "7d" | "30d", string>} */
export const UPCOMING_LABEL = {
  "24h": "next 24 hours",
  "7d": "next 7 days",
  "30d": "next 30 days",
};

/** C3's density gate: below roughly 20 items a week there is nothing to land on. */
export const DENSITY_FLOOR = 20;

const DAY_MS = 86_400_000;

const msOf = (value) =>
  value instanceof Date ? value.getTime() : Date.parse(value);

/** Midnight UTC on the day `asOf` falls in. */
const startOfDay = (ms) => Math.floor(ms / DAY_MS) * DAY_MS;

/**
 * Is `at` inside the window of `days` at `asOf`, running in `upcoming`'s
 * direction?
 *
 * **Trailing** (`upcoming === false`) is the half-open `(end - days, end]`.
 * Half-open rather than closed so a row on the boundary between two windows is
 * not counted in both.
 *
 * **Forward** (`upcoming === true`) is `[startOfDay(end), end + days)`, and the
 * lower bound is the start of today rather than the current instant on purpose:
 * a conference that began this morning is still this week's event, and clipping
 * at `end` would drop it from a calendar the reader is reading to find it. That
 * asymmetry is the one deliberate difference between the two directions.
 *
 * @param {string} at ISO 8601
 * @param {string | Date} asOf
 * @param {number} days
 * @param {boolean} [upcoming]
 * @returns {boolean}
 */
export const inWindow = (at, asOf, days, upcoming = false) => {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return false;

  const end = msOf(asOf);
  if (Number.isNaN(end)) return false;

  return upcoming
    ? t >= startOfDay(end) && t < end + days * DAY_MS
    : t > end - days * DAY_MS && t <= end;
};

/**
 * The soonest row that has not happened yet, within the widest window shown.
 *
 * For a forward-looking section, "latest activity" means the next thing on the
 * calendar. Taking `items[0]` does not compute it: those rows are sorted ascending
 * and include past events, so the first element is the *oldest* row in the
 * listing — measured as 2026-08-26 while the code claimed it was the next event.
 *
 * Bounded to 30 days so "nothing scheduled" and "nothing scheduled that this page
 * would show" give the same answer.
 *
 * @param {Array<{ at: string }>} items ascending by `at`
 * @param {string | Date} asOf
 * @returns {string | null}
 */
export const soonestUpcoming = (items, asOf) =>
  items.find((item) => inWindow(item.at, asOf, WINDOW_DAYS["30d"], true))?.at ??
  null;

/**
 * Split a window's item count into the three things it actually contains.
 *
 * Every number the page states is one of these, and saying which is the whole
 * point — a count summed across buckets and printed under a label that names one
 * of them is the defect this helper exists to stop:
 *
 *  - **`coverage`** — trailing rows about *this entity*: news, project blogs,
 *    podcasts, video, forum, DAO proposals. The only bucket that answers "is
 *    there enough here", so it is what the density gate reads.
 *  - **`upcoming`** — events, which are ahead of the window rather than behind
 *    it. Legitimately about the entity, but not coverage of what happened.
 *  - **`shared`** — rows that are not entity-specific at all. Exploits: the
 *    endpoint takes no `tags`, so the identical ~43 incidents land on all 16
 *    pages. Counting them as the entity's own both flatters a thin page and,
 *    because the contribution is a constant, makes a floor unreachable.
 *
 * The bug this replaces: `japan` had 16 trailing rows, 8 events and a floor of
 * 20. The gate summed everything, saw 24, and let the page render — printing "16
 * indexed items from the last 7 days" in the one line a SERP shows, from the gate
 * written to prevent exactly that page. The description and the JSON-LD already
 * read this helper; the gate was the third caller that should have.
 *
 * @param {Array<{ counts: Record<string, number | null>, upcoming?: boolean, entitySpecific?: boolean }>} sections
 * @param {"24h" | "7d" | "30d"} window
 * @returns {{ coverage: number, upcoming: number, shared: number, total: number }}
 */
export const countsByDirection = (sections, window) => {
  let coverage = 0;
  let upcoming = 0;
  let shared = 0;

  for (const section of sections) {
    const n = section.counts[window] ?? 0;
    if (section.entitySpecific === false) shared += n;
    else if (section.upcoming === true) upcoming += n;
    else coverage += n;
  }

  return { coverage, upcoming, shared, total: coverage + upcoming + shared };
};

/**
 * The density gate: does this entity have enough of its own coverage to publish?
 *
 * Pure and exported because it had no test, and that is why the `japan` defect
 * shipped — the gate's two outputs were computed inline inside a server function
 * that cannot run without the network.
 *
 * Reads `coverage` only, which makes the runtime gate and the editorial
 * `measuredWeekly` figure count the same population. `digestEntities.js` already
 * excluded exploits from that measurement because they "would add the same ~5 to
 * every entity, flattering the thin ones" — the same reasoning, applied here.
 *
 * `thin` is reachable again as a result. While the gate summed every section,
 * exploits alone contributed ~43 to the 30-day total, so no entity could ever
 * fall under 20 however dead its own feeds were — C3 asks the page to "widen
 * itself and say so, or fall back to `noindex`", and the second half was dead
 * code, including in the feed-outage case it was written for.
 *
 * @param {Array<{ counts: Record<string, number | null>, upcoming?: boolean, entitySpecific?: boolean }>} sections
 * @returns {{ defaultWindow: "7d" | "30d", widened: boolean, thin: boolean, coverage7: number, coverage30: number }}
 */
export const assessDensity = (sections) => {
  const coverage7 = countsByDirection(sections, "7d").coverage;
  const coverage30 = countsByDirection(sections, "30d").coverage;

  const widened = coverage7 < DENSITY_FLOOR && coverage30 >= DENSITY_FLOOR;
  const thin = coverage30 < DENSITY_FLOOR;

  return {
    defaultWindow: widened ? "30d" : "7d",
    widened,
    thin,
    coverage7,
    coverage30,
  };
};

/**
 * Rows in `section` that fall inside `window`.
 *
 * The section's items were fetched for the widest window, so narrowing is a
 * filter rather than a request — which is what lets the page offer three windows
 * without three URLs and without a client fetch.
 *
 * The direction comes from the section itself, so this returns rows consistent
 * with the counts the server computed for the same section. Passing the wrong
 * direction is the bug that made a count of 24 sit above two rows.
 *
 * @template {{ at: string }} T
 * @param {{ items: T[], upcoming?: boolean }} section
 * @param {string | Date} asOf
 * @param {"24h" | "7d" | "30d"} window
 * @returns {T[]}
 */
export const itemsWithin = (section, asOf, window) =>
  section.items.filter((item) =>
    inWindow(item.at, asOf, WINDOW_DAYS[window], section.upcoming === true)
  );
