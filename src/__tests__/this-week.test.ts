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
} from "../data/digestWindow";
import { DIGEST_ENTITIES, digestEntityFor, digestPaths } from "../data/digestEntities";
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

describe("counts by direction", () => {
  /*
   * The page total legitimately sums both directions — the picker and the intro
   * copy name both. Everywhere the label names only one, the number has to match
   * it: the meta description read "N indexed items from the last 7 days" while N
   * included events scheduled for the following week, in the one piece of copy a
   * SERP prints.
   */
  const sections = [
    { counts: { "24h": 10, "7d": 100, "30d": 1000 }, upcoming: false },
    { counts: { "24h": 1, "7d": 5, "30d": 20 }, upcoming: true },
    { counts: { "24h": null, "7d": null, "30d": null }, upcoming: false },
  ];

  it("separates trailing coverage from scheduled events", () => {
    const { coverage, upcoming, total } = countsByDirection(sections, "7d");
    expect(coverage).toBe(100);
    expect(upcoming).toBe(5);
    expect(total).toBe(105);
  });

  it("treats an unknown count as zero rather than throwing", () => {
    // A null count means "not established". It must not poison the sum.
    expect(countsByDirection(sections, "24h").coverage).toBe(10);
  });

  it("keeps coverage and total distinct, so a label cannot silently mean both", () => {
    const { coverage, total } = countsByDirection(sections, "30d");
    expect(coverage).toBe(1000);
    expect(total).toBe(1020);
    expect(coverage).not.toBe(total);
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
  it("ships exactly one entity — C3 commissions a probe, not a tier", () => {
    /*
     * Not a style rule. The page exists to answer whether the recap format
     * ranks; a tier shipped alongside it would confound that measurement with
     * its own thin pages, and §4.4 names crawl budget as the binding constraint.
     * When the month of data is in, this number changes deliberately — and this
     * assertion is the prompt to re-read C3 first.
     */
    expect(DIGEST_ENTITIES).toHaveLength(1);
    expect(DIGEST_ENTITIES[0].slug).toBe("bitcoin");
  });

  it("gives every entity a tag and a verification date", () => {
    for (const entity of DIGEST_ENTITIES) {
      // `?tags=` matches a keyword bag, not a slug, and the two diverge often
      // enough to be finding 23. An entity without an explicit tag would be a
      // silently empty page.
      expect(entity.tag, `${entity.slug} has no tag`).toBeTruthy();
      expect(entity.name, `${entity.slug} has no name`).toBeTruthy();
      expect(
        entity.verifiedOn,
        `${entity.slug} has no verifiedOn — density must be measured, not assumed`
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("resolves a known slug and rejects an unknown one", () => {
    expect(digestEntityFor("bitcoin")?.tag).toBe("bitcoin");
    // The route turns this into a real 404 rather than a thin page (§4.1).
    expect(digestEntityFor("ethereum")).toBeUndefined();
    expect(digestEntityFor("../etc/passwd")).toBeUndefined();
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

  it("leaves every other entity at default-deny", () => {
    expect(indexStateFor("/projects/ethereum/this-week")).toBe("substrate");
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
