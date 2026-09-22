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
 * Split a window's item count by direction: coverage behind, events ahead.
 *
 * The page total sums both, which is right for the picker and the intro copy
 * because that copy names both directions. It is wrong anywhere the label says
 * only one of them — the meta description read "N indexed items from the last 7
 * days" while N included events scheduled for the following week, on a page whose
 * whole argument is that it does not overclaim.
 *
 * One helper so the route's `<meta name="description">`, the JSON-LD's
 * `numberOfItems` and anything added later cannot each arrive at their own
 * arithmetic. That is the same one-source rule the digest module applies to
 * counts versus rows.
 *
 * @param {Array<{ counts: Record<string, number | null>, upcoming?: boolean }>} sections
 * @param {"24h" | "7d" | "30d"} window
 * @returns {{ coverage: number, upcoming: number, total: number }}
 */
export const countsByDirection = (sections, window) => {
  let coverage = 0;
  let upcoming = 0;

  for (const section of sections) {
    const n = section.counts[window] ?? 0;
    if (section.upcoming === true) upcoming += n;
    else coverage += n;
  }

  return { coverage, upcoming, total: coverage + upcoming };
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
