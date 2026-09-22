import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DENSITY_FLOOR,
  UPCOMING_LABEL,
  WINDOWS,
  WINDOW_DAYS,
  WINDOW_LABEL,
  inWindow,
  itemsWithin,
  countsByDirection,
  soonestUpcoming,
  assessDensity,
} from "../data/digestWindow";
import {
  DIGEST_ENTITIES,
  DIGEST_VERIFIED_ON,
  SELECTION_FLOOR,
  digestEntityFor,
  digestPaths,
} from "../data/digestEntities";
import { FEEDS, fetchAllPages } from "../server/thisWeek";
import { fetchJsonSoft } from "../server/apiFetch";
import { indexStateFor, staticPaths } from "../seo/indexState";

/*
 * Only the transport is mocked. Everything else in `thisWeek.ts` — the window
 * maths, the two count strategies, the partial/failed distinction — runs for
 * real, which is the half that had the bugs.
 */
vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(fetchJsonSoft).mockReset();
});

/**
 * The digest probe (content doc C3).
 *
 * The properties worth asserting offline are the ones whose failure mode is a
 * plausible page rather than an error. Three shipped in the first revision and
 * all three looked like working software: a card reading "24 events" above two
 * rows, "25 incidents" for a window holding 43, and "330 articles" above
 * "Nothing in this window". They share a root cause — **the headline count and
 * the visible rows came from different sources** — so most of what follows pins
 * that one invariant from several directions.
 */

const asOf = "2026-09-22T12:00:00Z";

const at = (hoursFromNow: number) =>
  new Date(Date.parse(asOf) + hoursFromNow * 3_600_000).toISOString();

const trailing = {
  items: [
    { id: "a", at: at(-1) },
    { id: "b", at: at(-20) },
    { id: "c", at: at(-72) },
    { id: "d", at: at(-144) },
    { id: "e", at: at(-480) },
  ],
  upcoming: false,
};

const upcoming = {
  items: [
    // Started this morning: still this week's event, and the reader is looking
    // for exactly this row.
    { id: "today", at: "2026-09-22T00:00:00Z" },
    { id: "tomorrow", at: at(20) },
    { id: "in5days", at: at(120) },
    { id: "in3weeks", at: at(24 * 21) },
    { id: "nextYear", at: "2027-08-27T00:00:00Z" },
  ],
  upcoming: true,
};

describe("trailing windows", () => {
  it("narrows to each window without dropping or duplicating rows", () => {
    expect(itemsWithin(trailing, asOf, "24h").map((i) => i.id)).toEqual(["a", "b"]);
    expect(itemsWithin(trailing, asOf, "7d").map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(itemsWithin(trailing, asOf, "30d").map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("makes each window a prefix of the wider one", () => {
    /*
     * This is the property that licenses fetching once at 30 days and filtering
     * in the browser for the API-counted feeds. If one ever returned rows out of
     * order, a narrow window would silently show the wrong items rather than
     * fail — which is what events did.
     */
    const [day, week, month] = WINDOWS.map((w) =>
      itemsWithin(trailing, asOf, w).map((i) => i.id)
    );
    expect(week.slice(0, day.length)).toEqual(day);
    expect(month.slice(0, week.length)).toEqual(week);
  });

  it("excludes rows dated after the window ends", () => {
    expect(inWindow(at(5), asOf, 7)).toBe(false);
  });

  it("is half-open, so a boundary row is in exactly one window", () => {
    // Closing both ends would count a row on the 7-day boundary in both the
    // 7-day and the 30-day window.
    expect(inWindow(at(-24 * 7), asOf, 7)).toBe(false);
    expect(inWindow(asOf, asOf, 7)).toBe(true);
  });

  it("treats an unparseable timestamp as outside every window", () => {
    expect(inWindow("not a date", asOf, 30)).toBe(false);
    expect(inWindow(at(-1), "not a date", 30)).toBe(false);
  });
});

describe("forward windows", () => {
  /*
   * Events run the other way. `?period=1` on the events endpoint returns rows
   * dated from last week to 2027 — it selects recently-listed events, not events
   * in the trailing week — so a trailing filter over an API total produced a
   * count of 24 above two visible rows.
   */
  it("counts forward from the start of today, not from the current instant", () => {
    // The whole reason the lower bound is midnight: a conference that began this
    // morning is still on this week's calendar.
    const ids = itemsWithin(upcoming, asOf, "24h").map((i) => i.id);
    expect(ids).toContain("today");
    expect(ids).toContain("tomorrow");
  });

  it("widens forward as the window widens", () => {
    expect(itemsWithin(upcoming, asOf, "7d").map((i) => i.id)).toEqual([
      "today",
      "tomorrow",
      "in5days",
    ]);
    expect(itemsWithin(upcoming, asOf, "30d").map((i) => i.id)).toEqual([
      "today",
      "tomorrow",
      "in5days",
      "in3weeks",
    ]);
  });

  it("excludes far-future rows from every window", () => {
    // The 2027 conference that would otherwise have dated the page in the future.
    for (const w of WINDOWS) {
      expect(itemsWithin(upcoming, asOf, w).map((i) => i.id)).not.toContain(
        "nextYear"
      );
    }
  });

  it("does not leak trailing rows into a forward window", () => {
    const past = { items: [{ id: "old", at: at(-48) }], upcoming: true };
    expect(itemsWithin(past, asOf, "30d")).toHaveLength(0);
  });

  it("picks the next event, not the first row in the list", () => {
    /*
     * The regression: these rows are ascending and include past events, so
     * `items[0]` is the *oldest* row — the shipped value was 2026-08-26 behind a
     * comment claiming it was the soonest upcoming event.
     */
    const withPast = {
      items: [
        { id: "lastMonth", at: "2026-08-26T00:00:00Z" },
        { id: "lastWeek", at: at(-24 * 6) },
        { id: "today", at: "2026-09-22T00:00:00Z" },
        { id: "in5days", at: at(120) },
      ],
    };
    expect(soonestUpcoming(withPast.items, asOf)).toBe("2026-09-22T00:00:00Z");
  });

  it("returns null when nothing is scheduled inside the widest window", () => {
    // A 2027 conference is not "upcoming" for a page that shows 30 days, and
    // reporting it would date the section in the future.
    expect(
      soonestUpcoming([{ at: "2027-08-27T00:00:00Z" }], asOf)
    ).toBeNull();
    expect(soonestUpcoming([], asOf)).toBeNull();
  });

  it("labels both directions", () => {
    for (const w of WINDOWS) {
      expect(WINDOW_LABEL[w], `${w} has no trailing label`).toBeTruthy();
      expect(UPCOMING_LABEL[w], `${w} has no forward label`).toBeTruthy();
      expect(WINDOW_DAYS[w], `${w} has no length`).toBeGreaterThan(0);
    }
  });
});

describe("feed classification", () => {
  /*
   * Asserted on the exported values rather than on the module's source text. An
   * earlier version regex-matched `thisWeek.ts`, which meant reordering a filter
   * broke the test without changing behaviour — a test coupled to formatting
   * instead of to the property it cares about.
   */
  const byKind = new Map(FEEDS.map((f) => [f.kind, f]));

  it("marks only continuously-published feeds as continuous", () => {
    /*
     * The first revision flagged Events as a stale feed, which reports a calendar
     * as a data fault. A freshness notice that fires on normal quiet is one
     * nobody reads when it is real.
     */
    for (const kind of ["news", "blogs", "podcasts", "videos", "forum"]) {
      expect(byKind.get(kind)?.continuous, `${kind} should be continuous`).toBe(
        true
      );
    }
    for (const kind of ["dao", "events"]) {
      expect(
        byKind.get(kind)?.continuous,
        `${kind} is episodic — a gap in it is not a defect`
      ).toBe(false);
    }
  });

  it("counts events locally and forward, because its API total means something else", () => {
    const events = byKind.get("events");
    expect(events?.upcoming).toBe(true);
    expect(events?.counts).toBe("local");
  });

  it("counts every trailing feed from the API and none of them forward", () => {
    for (const kind of ["news", "blogs", "podcasts", "videos", "forum", "dao"]) {
      expect(byKind.get(kind)?.upcoming, `${kind} is not forward-looking`).toBe(
        false
      );
      expect(
        byKind.get(kind)?.counts,
        `${kind} supports period, so its total is authoritative`
      ).toBe("api");
    }
  });

  it("marks every tag-filtered feed as entity-specific", () => {
    /*
     * Exploits are the only section that is not, and it is not in FEEDS — its
     * endpoint takes no `tags`, so the same ~43 incidents land on all 16 pages.
     * Anything added to FEEDS is tag-filtered by construction, so a `false` here
     * would mean a feed was misclassified rather than a new exception.
     */
    for (const feed of FEEDS) {
      expect(
        feed.entitySpecific,
        `${feed.kind} is tag-filtered and must count toward its entity`
      ).toBe(true);
    }
  });

  it("pairs a local count source with a forward window only where intended", () => {
    /*
     * The invariant behind bug #2: a locally-counted feed must be fetched
     * exhaustively, because its counts come from the rows. Any feed marked
     * `local` here has to be one the loader pages to completion.
     */
    const local = FEEDS.filter((f) => f.counts === "local").map((f) => f.kind);
    expect(local).toEqual(["events"]);
  });
});

describe("count buckets", () => {
  /*
   * Every number the page prints comes from one of these three buckets, and
   * saying which is the whole job. A count summed across buckets and printed
   * under a label naming one of them is the defect this helper exists to stop —
   * it has caused two shipped bugs now, in the meta description and then in the
   * density gate.
   */
  it("keeps coverage, upcoming and shared separate", () => {
    const { coverage, upcoming, shared, total } = countsByDirection(
      [
        { counts: { "7d": 11 } },
        { counts: { "7d": 8 }, upcoming: true },
        { counts: { "7d": 5 }, entitySpecific: false },
      ],
      "7d"
    );
    expect({ coverage, upcoming, shared, total }).toEqual({
      coverage: 11,
      upcoming: 8,
      shared: 5,
      total: 24,
    });
  });

  it("keeps coverage and total distinct, so a label cannot silently mean both", () => {
    const sections = [
      { counts: { "7d": 11 } },
      { counts: { "7d": 8 }, upcoming: true },
      { counts: { "7d": 5 }, entitySpecific: false },
    ];
    const { coverage, total } = countsByDirection(sections, "7d");
    expect(coverage).not.toBe(total);
  });

  it("classifies a shared section as shared even though it is trailing", () => {
    /*
     * Exploits are trailing *and* not entity-specific, so the two flags disagree.
     * Ownership wins: the question the buckets answer is "whose rows are these",
     * and the untagged endpoint puts the same ~43 incidents on all 16 pages.
     */
    const { coverage, shared, upcoming } = countsByDirection(
      [{ counts: { "7d": 43 }, upcoming: false, entitySpecific: false }],
      "7d"
    );
    expect({ coverage, shared, upcoming }).toEqual({
      coverage: 0,
      shared: 43,
      upcoming: 0,
    });
  });

  it("treats an unknown count as zero rather than poisoning the sum", () => {
    // `null` means "not established" — a failed request, not a quiet window.
    expect(
      countsByDirection(
        [{ counts: { "7d": null } }, { counts: { "7d": 4 } }],
        "7d"
      ).coverage
    ).toBe(4);
  });
});

describe("the density gate", () => {
  /*
   * These are the tests whose absence let the `japan` defect ship: `widened` and
   * `thin` were computed inline inside a server function that cannot run without
   * the network, so nothing checked them. `assessDensity` was extracted to make
   * them possible.
   */
  const coverage = (week: number, month = week * 4) => ({
    counts: { "24h": 0, "7d": week, "30d": month },
  });
  const events = (n: number) => ({
    counts: { "24h": 0, "7d": n, "30d": n },
    upcoming: true,
  });
  const exploits = (week: number, month: number) => ({
    counts: { "24h": 0, "7d": week, "30d": month },
    entitySpecific: false,
  });

  it("widens japan — the case that shipped indexable", () => {
    /*
     * The real numbers from the live render. 11 trailing rows against a floor of
     * 20, with 8 events dated *next* week and 5 untagged exploits. The old gate
     * summed all three to 24, cleared the floor, and published a page that then
     * printed "16 indexed items from the last 7 days" in the one line a SERP
     * shows.
     */
    const { widened, thin, defaultWindow, coverage7, coverage30 } =
      assessDensity([coverage(11, 166), events(8), exploits(5, 43)]);

    expect(coverage7, "events and exploits must not count as coverage").toBe(11);
    expect(coverage30).toBe(166);
    expect(defaultWindow).toBe("30d");
    expect(widened).toBe(true);
    expect(thin).toBe(false);
  });

  it("leaves a dense entity on the seven-day window", () => {
    const { widened, thin, defaultWindow } = assessDensity([coverage(406, 3000)]);
    expect(defaultWindow).toBe("7d");
    expect(widened).toBe(false);
    expect(thin).toBe(false);
  });

  it("can still reach thin, with a fat shared section present", () => {
    /*
     * The fallback was dead code. While the gate summed every section, the ~43
     * constant from the untagged exploit endpoint meant no entity could ever fall
     * under 20 however dead its own feeds were — so C3's "fall back to `noindex`"
     * could not fire, including in the feed-outage case it was written for.
     */
    const { thin, widened } = assessDensity([
      coverage(0, 0),
      events(30),
      exploits(5, 43),
    ]);
    expect(thin, "an entity with no coverage of its own must go noindex").toBe(
      true
    );
    expect(widened).toBe(false);
  });

  it("is never both widened and thin", () => {
    for (const week of [0, 1, 4, 19, 20, 21, 100]) {
      const { widened, thin } = assessDensity([coverage(week)]);
      expect(widened && thin, `both at coverage ${week}/wk`).toBe(false);
    }
  });

  it("treats the floor as inclusive", () => {
    expect(assessDensity([coverage(DENSITY_FLOOR)]).widened).toBe(false);
    expect(assessDensity([coverage(DENSITY_FLOOR - 1)]).widened).toBe(true);
  });

  it("ignores a section whose count could not be established", () => {
    // A failed fetch must not be read as evidence that the window is empty.
    const { coverage7 } = assessDensity([
      { counts: { "24h": null, "7d": null, "30d": null } },
      coverage(50),
    ]);
    expect(coverage7).toBe(50);
  });
});

describe("local-count completeness", () => {
  /*
   * The local-count strategy is "correct only because the fetch is exhaustive",
   * so an incomplete fetch has to be visible. It was not: a page failing mid-walk
   * set neither `failed` (rows had already arrived) nor the row ceiling, so the
   * section reported a count derived from a partial fetch with **no signal at
   * all** — an authoritative-looking undercount, which is the same family as the
   * three bugs the module header describes.
   *
   * Latent rather than live: bitcoin's 62 events and the exploit walk both finish
   * in one page today, so every branch here except the first is unreachable from
   * a real render. That is exactly why it needs a test rather than a look.
   */
  const page = (n: number, next: string | null) => ({
    results: Array.from({ length: n }, (_, i) => ({ id: i })),
    links: { next },
  });

  it("reports a clean single-page walk as neither failed nor partial", async () => {
    vi.mocked(fetchJsonSoft).mockResolvedValueOnce(page(62, null));

    const out = await fetchAllPages("u");
    expect(out.rows).toHaveLength(62);
    expect(out.failed).toBe(false);
    expect(out.partial).toBe(false);
  });

  it("reports a total failure as failed, not partial", async () => {
    vi.mocked(fetchJsonSoft).mockResolvedValueOnce(null);

    const out = await fetchAllPages("u");
    expect(out.rows).toHaveLength(0);
    expect(out.failed).toBe(true);
    expect(out.partial).toBe(false);
  });

  it("reports a mid-walk failure as partial, not failed", async () => {
    // The regression. Page 1 lands, page 2 dies: the rows are real but the count
    // derived from them is a floor, and the page must be able to say so.
    vi.mocked(fetchJsonSoft)
      .mockResolvedValueOnce(page(100, "page2"))
      .mockResolvedValueOnce(null);

    const out = await fetchAllPages("u");
    expect(out.rows).toHaveLength(100);
    expect(out.failed, "rows arrived, so this is not a failed fetch").toBe(false);
    expect(out.partial, "a floor must never be presented as a total").toBe(true);
  });

  it("reports hitting the row ceiling as partial", async () => {
    // MAX_LOCAL_ROWS is 400; five full pages with more outstanding.
    for (let i = 0; i < 5; i += 1) {
      vi.mocked(fetchJsonSoft).mockResolvedValueOnce(page(100, `p${i + 2}`));
    }

    const out = await fetchAllPages("u");
    expect(out.rows.length).toBeGreaterThanOrEqual(400);
    expect(out.partial).toBe(true);
  });

  it("does not call a stop-triggered walk partial", async () => {
    /*
     * The exploit walk quits as soon as a page ends older than the window. That
     * is the walk succeeding early, not truncation — calling it partial would put
     * a "+" on an exact count and teach the reader to discount the marker.
     */
    vi.mocked(fetchJsonSoft).mockResolvedValueOnce(page(100, "page2"));

    const out = await fetchAllPages("u", () => true);
    expect(out.rows).toHaveLength(100);
    expect(out.failed).toBe(false);
    expect(out.partial).toBe(false);
  });

  it("stops requesting once the walk is done", async () => {
    vi.mocked(fetchJsonSoft).mockResolvedValueOnce(page(10, null));

    await fetchAllPages("u");
    expect(vi.mocked(fetchJsonSoft)).toHaveBeenCalledTimes(1);
  });
});

describe("digest entities", () => {
  it("has a unique slug, tag, name and measurement per entity", () => {
    const slugs = DIGEST_ENTITIES.map((e) => e.slug);
    expect(new Set(slugs).size, "duplicate slug").toBe(slugs.length);

    for (const entity of DIGEST_ENTITIES) {
      /*
       * `?tags=` matches a keyword bag, not a slug, and the two diverge often
       * enough to be finding 23. An entity without an explicit tag would be a
       * silently empty page.
       */
      expect(entity.tag, `${entity.slug} has no tag`).toBeTruthy();
      expect(entity.name, `${entity.slug} has no name`).toBeTruthy();
      expect(
        entity.measuredWeekly,
        `${entity.slug} has no measured density — the bar is measured, not guessed`
      ).toBeGreaterThan(0);
    }
  });

  it("dates the whole set at once", () => {
    // One constant rather than per-entity, so a partial re-check cannot leave the
    // set claiming a freshness it does not have.
    expect(DIGEST_VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps every entity above the runtime floor", () => {
    /*
     * The runtime floor is the point at which a window has nothing in it. An
     * entity whose *average* week is below it should not have a page at all — the
     * widen-or-noindex fallback exists for a quiet week, not as a steady state.
     */
    for (const entity of DIGEST_ENTITIES) {
      expect(
        entity.measuredWeekly,
        `${entity.slug} averages below the runtime floor and would live in the widened view`
      ).toBeGreaterThanOrEqual(DENSITY_FLOOR);
    }
  });

  it("marks every entity that sits below the selection bar", () => {
    /*
     * Two different floors doing two different jobs — see the module header. An
     * entity under the editorial bar is allowed, but only as an explicit call,
     * never by drifting in unnoticed.
     */
    for (const entity of DIGEST_ENTITIES) {
      if (entity.measuredWeekly < SELECTION_FLOOR) {
        expect(
          entity.belowBar,
          `${entity.slug} is under the ${SELECTION_FLOOR}/wk bar and must be flagged belowBar`
        ).toBe(true);
      } else {
        expect(
          entity.belowBar,
          `${entity.slug} clears the bar, so belowBar is misleading`
        ).toBeUndefined();
      }
    }
  });

  it("separates the two floors", () => {
    // Collapsing them would be wrong in both directions: a page averaging 22
    // should not exist, and a page averaging 40 still has quiet weeks.
    expect(SELECTION_FLOOR).toBeGreaterThan(DENSITY_FLOOR);
  });

  it("excludes the two boards that were measured and rejected", () => {
    /*
     * A regression guard, not bookkeeping. Both look eligible from a distance:
     *
     *  - `reserve` measured 102/week, of which essentially all was fuzzy-match
     *    noise — "Federal Reserve rate increase", "proof of reserves", "US Bitcoin
     *    Reserve Bill". Its real tag, `reserve-protocol`, has 19 items all-time
     *    and 6/week. Anyone re-adding it from the headline number rebuilds a page
     *    made of unrelated articles.
     *  - `polygon` sits at 16/week even with its tag pair resolved; the 1,933
     *    articles behind `matic-network` are historical.
     */
    const slugs = DIGEST_ENTITIES.map((e) => e.slug);
    expect(slugs, "reserve is fuzzy-match noise — re-measure before re-adding").not.toContain("reserve");
    expect(slugs, "polygon measured 16/wk with its tags resolved").not.toContain("polygon");
  });

  it("resolves a known slug and rejects an unknown one", () => {
    expect(digestEntityFor("bitcoin")?.tag).toBe("bitcoin");
    expect(digestEntityFor("dfinity")?.name).toBe("Internet Computer");
    // The route turns these into real 404s rather than thin pages (§4.1).
    expect(digestEntityFor("polygon")).toBeUndefined();
    expect(digestEntityFor("celo")).toBeUndefined();
    expect(digestEntityFor("../etc/passwd")).toBeUndefined();
  });

  it("resolves a tag union wherever the slug is not the tag", () => {
    /*
     * These pages do their own taxonomy resolution and are **not** waiting on the
     * backend fix in docs/tag-taxonomy-fix.md: `?tags=a,b` unions and
     * de-duplicates. Four entities depend on it, and `dfinity` is a pairing the
     * documented fix cannot reach at all, because the tag is named "internet
     * computer" and matches neither the board slug nor its name.
     */
    const unions = DIGEST_ENTITIES.filter((e) => e.tag.includes(","));
    expect(unions.map((e) => e.slug).sort()).toEqual([
      "ai",
      "avalanche",
      "dfinity",
      "risechain",
    ]);
    for (const entity of unions) {
      expect(
        entity.tag.split(",").every((t) => t.length > 0),
        `${entity.slug} has an empty tag in its union`
      ).toBe(true);
    }
  });
});

describe("digest promotion", () => {
  /*
   * The pairing guard, in both directions — the same shape as
   * `capability-pages.test.ts`. The entity list and the index state live in
   * different files, and either half alone fails silently: an entity nobody
   * promoted is a page no crawler can see, which makes the probe unmeasurable;
   * a promoted path with no entity is a sitemap URL that 404s, which is the live
   * site's failure mode reproduced in the fix for it.
   */
  it("promotes every digest entity", () => {
    for (const path of digestPaths()) {
      expect(
        indexStateFor(path),
        `${path} is a digest entity but is not promoted — a noindex probe measures nothing`
      ).toBe("promoted");
    }
  });

  it("promotes no digest path that has no entity", () => {
    const declared = digestPaths();
    const promoted = staticPaths().filter((p) => p.endsWith("/this-week"));
    expect(promoted.sort()).toEqual(declared.sort());
  });

  it("leaves every non-entity at default-deny", () => {
    // A published board with no digest, and a slug that is not a board at all.
    expect(indexStateFor("/projects/polygon/this-week")).toBe("substrate");
    expect(indexStateFor("/projects/celo/this-week")).toBe("substrate");
    expect(indexStateFor("/projects/nonesuch/this-week")).toBe("substrate");
  });
});

describe("density floor", () => {
  it("matches the figure C3 measured the cliff at", () => {
    // C3: "below roughly 20 items a week there is not enough for a recap worth
    // landing on." Both the widen-or-noindex fallback and the bar for adding an
    // entity read this one constant.
    expect(DENSITY_FLOOR).toBe(20);
  });
});
