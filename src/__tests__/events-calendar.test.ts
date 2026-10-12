import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EVENT_TYPE_LABELS,
  JSONLD_LIMIT,
  PLACEHOLDER_TYPE,
  eventTypeLabel,
  isListableType,
} from "../data/eventTypes.js";
import {
  MONTH_INDEX_FLOOR,
  headline,
  isMonthKey,
  monthBounds,
  monthIndexState,
  monthLabel,
  monthOf,
  monthSlug,
  parseMonthSlug,
  shiftMonth,
} from "../data/eventMonths.js";
import type { CalendarEvent, RawEvent } from "../data/eventRows";
import { hasEnded, shape, shapeRows, splitByTime } from "../data/eventRows";
import { canonicalForMonth, eventsHead } from "../seo/eventsHead";
import { belongsInSitemap, indexStateFor, staticPaths } from "../seo/indexState";

/*
 * Only the transport is mocked, the same arrangement as `this-week.test.ts`.
 * The query construction, de-duplication and neighbour logic all run for real,
 * because those are the parts that can be wrong without throwing.
 */
vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
}));

const row = (over: Partial<RawEvent> = {}): RawEvent => ({
  id: 1,
  title: "ETHSomewhere",
  item_type: "Co",
  starts_at: "2026-10-03T00:00:00Z",
  ends_at: "2026-10-05T00:00:00Z",
  location: "Lisbon, Portugal",
  ...over,
});

const event = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: "1",
  title: "ETHSomewhere",
  startsAt: "2026-09-10T00:00:00Z",
  endsAt: null,
  location: "Lisbon, Portugal",
  type: "Co",
  ...over,
});

const at = (iso: string) => new Date(iso).getTime();

/**
 * Only `Date` is faked. `buildMonth` reads the clock to split the current month
 * and to decide `isPast`, so a test written against the real clock passes today
 * and starts failing on the 4th of October.
 */
const freeze = (iso: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
};

afterEach(() => {
  vi.useRealTimers();
});

describe("month slugs", () => {
  it("round-trips a month through its slug", () => {
    expect(monthSlug("2026-10")).toBe("october-2026");
    expect(parseMonthSlug("october-2026")).toBe("2026-10");
    expect(parseMonthSlug(monthSlug("2027-01"))).toBe("2027-01");
  });

  /*
   * This parses a URL segment, so whatever it accepts becomes a page. A lenient
   * reader answers 200 for a typo and publishes an unbounded set of near-empty
   * URLs off it.
   */
  it("refuses anything that is not a real month and a plausible year", () => {
    for (const bad of [
      "octobr-2026",
      "october-12345",
      "october-99",
      "2026-10",
      "october",
      "-2026",
      "",
    ]) {
      expect(parseMonthSlug(bad), `${bad} must not resolve`).toBeNull();
    }
    expect(parseMonthSlug(undefined as unknown as string)).toBeNull();
  });

  it("is case-insensitive, because URLs arrive as typed", () => {
    expect(parseMonthSlug("October-2026")).toBe("2026-10");
  });

  it("labels a month for a reader", () => {
    expect(monthLabel("2026-10")).toBe("October 2026");
  });
});

/**
 * The other door into this tier.
 *
 * `getMonthCalendar` is a server function — a public RPC endpoint — so the
 * route's slug check does not guard it. Its validator calls this, and without
 * it any caller could send junk dates into five upstream requests.
 */
describe("the internal month key", () => {
  it("accepts a real YYYY-MM", () => {
    expect(isMonthKey("2026-10")).toBe(true);
    expect(isMonthKey("2026-01")).toBe(true);
    expect(isMonthKey("2026-12")).toBe(true);
  });

  it("refuses anything else", () => {
    for (const bad of [
      "2026-13",
      "2026-00",
      "2026-1",
      "26-10",
      "2026-10-01",
      "october-2026",
      "' OR 1=1",
      "",
    ]) {
      expect(isMonthKey(bad), `${bad} must not pass the validator`).toBe(false);
    }
    expect(isMonthKey(undefined)).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });
});

describe("month arithmetic", () => {
  it("bounds a month on its real last day", () => {
    expect(monthBounds("2026-10")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthBounds("2026-11")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
  });

  it("knows February in a leap year", () => {
    expect(monthBounds("2028-02").to).toBe("2028-02-29");
    expect(monthBounds("2027-02").to).toBe("2027-02-28");
  });

  it("steps across the year boundary in both directions", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("reads the month of an instant in UTC", () => {
    expect(monthOf(new Date("2026-10-03T23:30:00Z"))).toBe("2026-10");
  });
});

/**
 * Upcoming against finished, on a calendar where every date is midnight UTC.
 *
 * This is the rule that decides which half of the current month a row lands in,
 * and it has one non-obvious property: a date with no time means the whole day.
 */
describe("whether an event has finished", () => {
  it("keeps a one-day event through the day it happens", () => {
    const today = event({ startsAt: "2026-09-29T00:00:00Z" });
    expect(
      hasEnded(today, at("2026-09-29T07:34:00Z")),
      "a midnight-UTC date means the whole day, not the first instant of it"
    ).toBe(false);
    expect(hasEnded(today, at("2026-09-30T00:01:00Z"))).toBe(true);
  });

  it("keeps a multi-day conference through its final day", () => {
    const conference = event({
      startsAt: "2026-09-27T00:00:00Z",
      endsAt: "2026-09-29T00:00:00Z",
    });
    expect(hasEnded(conference, at("2026-09-29T18:00:00Z"))).toBe(false);
  });

  /*
   * The grace period the previous version carried would have called this
   * finished — it started 28 days ago — while the event is running today. On a
   * month page a long run sorts on its own start date, so the ordering problem
   * that grace existed to fix cannot arise here.
   */
  it("does not call a long run finished while it is still running", () => {
    const festival = event({
      startsAt: "2026-09-01T00:00:00Z",
      endsAt: "2026-09-30T00:00:00Z",
    });
    expect(hasEnded(festival, at("2026-09-29T12:00:00Z"))).toBe(false);
  });

  it("splits a month in two, each half still in date order", () => {
    const events = [
      event({ id: "a", startsAt: "2026-09-02T00:00:00Z" }),
      event({ id: "b", startsAt: "2026-09-20T00:00:00Z" }),
      event({ id: "c", startsAt: "2026-09-29T00:00:00Z" }),
      event({ id: "d", startsAt: "2026-09-30T00:00:00Z" }),
    ];
    const { upcoming, past } = splitByTime(events, at("2026-09-29T09:00:00Z"));
    expect(past.map((e) => e.id), "the 2nd and the 20th are over").toEqual(["a", "b"]);
    expect(upcoming.map((e) => e.id), "today and the 30th are not").toEqual(["c", "d"]);
  });

  /*
   * The upcoming half sorts by start date, so a conference running since the
   * 1st sits above today's rows carrying a date three weeks old. Grouping
   * those separately is what makes that order read as current rather than
   * stale — the page heads them "Happening now".
   *
   * Today's rows stay out of it. Dates here are midnight UTC with no time of
   * day, so "has started" would put a 5pm Miami meetup under that heading at
   * breakfast. A previous day is a claim the data supports.
   */
  it("marks only what began on an earlier day and is still running", () => {
    const events = [
      event({ id: "long", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-22T00:00:00Z" }),
      event({ id: "today", startsAt: "2026-09-29T00:00:00Z" }),
      event({ id: "later", startsAt: "2026-09-30T00:00:00Z" }),
    ];
    const { upcoming } = splitByTime(events, at("2026-09-29T09:00:00Z"));
    expect(upcoming.map((e) => e.running)).toEqual([true, undefined, undefined]);
  });

  it("does not call a multi-day event running once it has ended", () => {
    const { upcoming, past } = splitByTime(
      [event({ id: "over", startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-09-20T00:00:00Z" })],
      at("2026-09-29T09:00:00Z")
    );
    expect(upcoming).toHaveLength(0);
    expect(past).toHaveLength(1);
  });
});

/**
 * The count — and the word — the page headline and the meta description print.
 *
 * The seam: a month only needs qualifying once part of it has gone. And the
 * qualifier is "remaining" rather than "upcoming" because a good share of what
 * is left on a busy day started last week and is still running.
 */
describe("the headline", () => {
  const month = (over: Record<string, unknown>) =>
    ({ isPast: false, total: 0, upcoming: [], past: [], ...over }) as never;

  it("counts what is left of a month that is part over", () => {
    expect(
      headline(month({ total: 734, upcoming: new Array(174), past: new Array(560) }))
    ).toEqual({ count: 174, noun: "remaining" });
  });

  /*
   * Nothing has started, so there is nothing to qualify — and "upcoming" is a
   * word that will be wrong about some of these rows the moment October begins.
   */
  it("describes a future month as itself", () => {
    expect(headline(month({ total: 696, upcoming: new Array(696) }))).toEqual({
      count: 696,
      noun: "events",
    });
  });

  it("describes a past month as a whole", () => {
    expect(
      headline(month({ isPast: true, total: 273, past: new Array(273) }))
    ).toEqual({ count: 273, noun: "events" });
  });

  it("falls back to the month total once nothing is left in it", () => {
    expect(headline(month({ total: 734, past: new Array(734) }))).toEqual({
      count: 734,
      noun: "events",
    });
  });
});

/**
 * Which months get submitted, which merely exist.
 *
 * Two failures, and they are different. A past month is an archive: accurate,
 * permanently stale, and asked about by nobody once it has gone. A thin future
 * month is near-empty and competes with the hub for one query — eleven of the
 * fifteen months in the corpus hold between one and twelve events.
 */
describe("which months are indexable", () => {
  it("never promotes a month that has already passed, however busy", () => {
    expect(monthIndexState("2026-08", 5000, "2026-09")).toBe("substrate");
  });

  it("does not promote a thin future month", () => {
    expect(monthIndexState("2027-01", 7, "2026-09")).toBe("substrate");
    expect(monthIndexState("2027-01", MONTH_INDEX_FLOOR - 1, "2026-09")).toBe("substrate");
  });

  it("promotes a future month carrying real volume", () => {
    expect(monthIndexState("2026-10", 734, "2026-09")).toBe("promoted");
    expect(monthIndexState("2026-10", MONTH_INDEX_FLOOR, "2026-09")).toBe("promoted");
  });

  it("promotes the current month, which is not past", () => {
    expect(monthIndexState("2026-09", 771, "2026-09")).toBe("promoted");
  });

  /*
   * The sitemap and the route have to feed this the same number. The sitemap
   * used to pass the API's raw total while the route passed the shaped one, so
   * a month of 21 rows holding one duplicate was submitted and served noindex.
   * `shapeRows` is now what both of them count.
   */
  it("is decided on rows that survive shaping, not raw API totals", () => {
    const raw = [
      ...new Array(MONTH_INDEX_FLOOR - 1)
        .fill(null)
        .map((_, i) => row({ id: i, title: `Real ${i}` })),
      row({ id: 900, title: "Real 0" }),
      row({ id: 901, title: "Placeholder", item_type: PLACEHOLDER_TYPE }),
    ];
    expect(raw.length, "the raw total clears the floor").toBeGreaterThanOrEqual(
      MONTH_INDEX_FLOOR
    );
    expect(shapeRows(raw).length).toBe(MONTH_INDEX_FLOOR - 1);
    expect(
      monthIndexState("2026-11", shapeRows(raw).length, "2026-09"),
      "and the shaped count does not"
    ).toBe("substrate");
  });
});

/**
 * The duplicate this tier would otherwise ship with.
 *
 * `/events` and `/events/september-2026` render identical content while
 * September is current. Without a canonical pointing one at the other they
 * compete, and the problem resolves itself only when the month turns.
 */
describe("the canonical for a month", () => {
  it("sends the current month to the hub", () => {
    expect(canonicalForMonth("2026-09", "2026-09")).toBe("https://alphaday.com/events");
  });

  /*
   * Consolidation, not removal: the current month keeps `index` and lets the
   * canonical do the work. Pairing a cross-URL canonical with `noindex` is the
   * documented way to get both ignored.
   */
  it("keeps the current month indexable, canonical aside", () => {
    expect(monthIndexState("2026-09", 771, "2026-09")).toBe("promoted");
  });

  it("leaves every other month on its own URL", () => {
    expect(canonicalForMonth("2026-10", "2026-09")).toBe(
      "https://alphaday.com/events/october-2026"
    );
    expect(canonicalForMonth("2026-08", "2026-09")).toBe(
      "https://alphaday.com/events/august-2026"
    );
  });
});

describe("shaping a row", () => {
  it("drops the documented placeholder type", () => {
    expect(isListableType(PLACEHOLDER_TYPE)).toBe(false);
    expect(shape(row({ item_type: PLACEHOLDER_TYPE }))).toBeNull();
  });

  it("drops rows with no title, start or type", () => {
    expect(shape(row({ title: null }))).toBeNull();
    expect(shape(row({ starts_at: null }))).toBeNull();
    expect(shape(row({ item_type: null }))).toBeNull();
  });

  it("refuses an unparseable start rather than ranking it", () => {
    expect(shape(row({ starts_at: "not a date" }))).toBeNull();
  });

  it("keeps a row with no location, which the page renders and the graph omits", () => {
    expect(shape(row({ location: null }))?.location).toBeNull();
  });

  /*
   * The loader payload is serialised into the page for hydration, so a field
   * repeating the start on most of a long month is worth omitting. Everything
   * downstream reads a missing end as "the same day".
   */
  it("drops an end date that only repeats the start", () => {
    const sameDay = "2026-10-03T00:00:00Z";
    expect(shape(row({ starts_at: sameDay, ends_at: sameDay }))?.endsAt).toBeNull();
  });

  it("keeps an end date when the event really spans days", () => {
    expect(shape(row())?.endsAt).toBe("2026-10-05T00:00:00Z");
  });

  it("returns rows in date order", () => {
    const shaped = shapeRows([
      row({ id: 2, title: "Later", starts_at: "2026-10-20T00:00:00Z" }),
      row({ id: 1, title: "Sooner", starts_at: "2026-10-02T00:00:00Z" }),
    ]);
    expect(shaped.map((e) => e.title)).toEqual(["Sooner", "Later"]);
  });
});

describe("type labels", () => {
  it("labels only the codes narrow enough to mean something", () => {
    expect(eventTypeLabel("Hk")).toBe("Hackathon");
    expect(eventTypeLabel("MU")).toBe(EVENT_TYPE_LABELS.MU);
  });

  /*
   * `Co` covers 73% of the corpus, which is what gives it away as the bucket
   * everything falls into. Labelled "Conference" it put that word on Stabull
   * Dinner and KBW Korean BBQ & DrinksQ.
   */
  it("says nothing about the catch-all type, or an unknown one", () => {
    expect(eventTypeLabel("Co"), "Co is the default bucket, not a category").toBeNull();
    expect(eventTypeLabel("ZZ")).toBeNull();
    expect(eventTypeLabel(undefined)).toBeNull();
    expect(EVENT_TYPE_LABELS).not.toHaveProperty("Co");
  });
});

describe("building a month", () => {
  const mockApi = async (handler: (url: string) => unknown) => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const seen: string[] = [];
    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      seen.push(url);
      return handler(url) as never;
    });
    return seen;
  };

  /**
   * The whole reason this module was rewritten. The endpoint returns
   * oldest-first from 2022 and ignores `?ordering=` and `?offset=`, so an
   * unfiltered read renders 2022 conferences and looks healthy. `starts_at__gte`
   * and `starts_at__lte` are what make a month page a single precise query.
   */
  it("asks for exactly the month's date range", async () => {
    const { buildMonth } = await import("../server/events");
    const seen = await mockApi((url) =>
      url.includes("limit=1") ? { total: 5 } : { results: [row()] }
    );

    await buildMonth("2026-10");

    const listCall = seen.find((u) => u.includes("limit=500"));
    expect(listCall).toContain("starts_at__gte=2026-10-01");
    expect(listCall).toContain("starts_at__lte=2026-10-31");
    expect(
      listCall,
      "period_after matches range overlap, not start — it returns September rows"
    ).not.toContain("period_after");
  });

  it("de-duplicates the repeated rows the corpus carries", async () => {
    freeze("2026-09-29T09:00:00Z");
    const { buildMonth } = await import("../server/events");
    await mockApi((url) =>
      url.includes("limit=1")
        ? { total: 3 }
        : {
            results: [
              row({ id: 75012, title: "Miami Thing", item_type: "Co" }),
              row({ id: 79114, title: "Miami Thing", item_type: "PY" }),
              row({ id: 3, title: "Somewhere Else" }),
            ],
          }
    );

    const month = await buildMonth("2026-10");
    expect(month.upcoming).toHaveLength(2);
    expect(month.total, "the count must not include the duplicate").toBe(2);
    expect(month.upcoming[0].type, "first occurrence wins").toBe("Co");
  });

  /**
   * The blocker this split exists for.
   *
   * The hub renders the current month, so without a split it opened with four
   * weeks of finished events under the word "upcoming" — worst on the 29th,
   * which is exactly when a reader wants next month.
   */
  it("separates the finished half of the current month", async () => {
    freeze("2026-09-29T09:00:00Z");
    const { buildMonth } = await import("../server/events");
    await mockApi((url) =>
      url.includes("limit=1")
        ? { total: 2 }
        : {
            results: [
              row({ id: 1, title: "Over", starts_at: "2026-09-04T00:00:00Z", ends_at: null }),
              row({ id: 2, title: "Today", starts_at: "2026-09-29T00:00:00Z", ends_at: null }),
              row({ id: 3, title: "Soon", starts_at: "2026-09-30T00:00:00Z", ends_at: null }),
            ],
          }
    );

    const month = await buildMonth("2026-09");
    expect(month.upcoming.map((e) => e.title)).toEqual(["Today", "Soon"]);
    expect(month.past.map((e) => e.title)).toEqual(["Over"]);
    expect(month.total, "the total still describes the whole month").toBe(3);
  });

  it("puts every row of a future month in the upcoming half", async () => {
    freeze("2026-09-29T09:00:00Z");
    const { buildMonth } = await import("../server/events");
    await mockApi((url) =>
      url.includes("limit=1") ? { total: 1 } : { results: [row()] }
    );

    const month = await buildMonth("2026-10");
    expect(month.past).toHaveLength(0);
    expect(month.upcoming).toHaveLength(1);
  });

  it("links a neighbour only when that month holds something", async () => {
    const { buildMonth } = await import("../server/events");
    await mockApi((url) => {
      if (url.includes("limit=1")) {
        // September has events; November is empty.
        if (url.includes("starts_at__gte=2026-09-01")) return { total: 771 };
        if (url.includes("starts_at__gte=2026-11-01")) return { total: 0 };
        return { total: 1122 };
      }
      return { results: [row()] };
    });

    const month = await buildMonth("2026-10");
    expect(month.prev).toEqual({ month: "2026-09", count: 771 });
    expect(month.next, "an empty month must not be linked").toBeNull();
  });

  it("reports a failed page rather than printing a floor as exact", async () => {
    const { buildMonth } = await import("../server/events");
    await mockApi((url) => (url.includes("limit=1") ? { total: 5 } : null));

    const month = await buildMonth("2026-10");
    expect(month.partial).toBe(true);
  });

  /**
   * Two failures, two remedies.
   *
   * A dropped page of rows makes the month's own count short, and the page has
   * to print it as "734+". A failed neighbour count costs nothing but a
   * navigation link. Folding them together made a page whose rows were complete
   * print an approximation of a number it had read in full.
   */
  it("does not call a month partial because a neighbour count failed", async () => {
    const { buildMonth } = await import("../server/events");
    await mockApi((url) => (url.includes("limit=1") ? null : { results: [row()] }));

    const month = await buildMonth("2026-10");
    expect(month.partial).toBe(false);
    expect(month.prev, "the link simply does not render").toBeNull();
    expect(month.next).toBeNull();
  });

  it("marks a month in the past", async () => {
    const { buildMonth } = await import("../server/events");
    await mockApi((url) => (url.includes("limit=1") ? { total: 5 } : { results: [row()] }));

    const past = await buildMonth("2020-01");
    expect(past.isPast).toBe(true);
  });
});

/**
 * What the graph is allowed to claim.
 *
 * Every item carries `eventStatus: EventScheduled`, which is a statement about
 * an event that has not happened. Emitting it for the finished half of the
 * current month describes last week's conference as scheduled.
 */
describe("the structured data", () => {
  const calendarWith = (over: Record<string, unknown> = {}) => ({
    month: "2026-09",
    upcoming: [event({ id: "u", title: "Still on" })],
    past: [event({ id: "p", title: "Already over" })],
    total: 2,
    prev: null,
    next: null,
    partial: false,
    isPast: false,
    asOf: "2026-09-29T09:00:00Z",
    ...over,
  });

  const graphOf = (head: { scripts: Array<Record<string, string>> }) =>
    head.scripts.length ? JSON.parse(head.scripts[0].children) : null;

  it("describes only what is still to come", () => {
    const graph = graphOf(
      eventsHead({
        calendar: calendarWith() as never,
        currentMonth: "2026-09",
        indexable: true,
        isHub: true,
      })
    );
    const names = graph.itemListElement.map(
      (entry: { item: { name: string } }) => entry.item.name
    );
    expect(names).toEqual(["Still on"]);
    expect(graph.numberOfItems).toBe(1);
  });

  it("emits no empty list once the month is spent", () => {
    const head = eventsHead({
      calendar: calendarWith({ upcoming: [], total: 1 }) as never,
      currentMonth: "2026-09",
      indexable: true,
      isHub: true,
    });
    expect(graphOf(head)).toBeNull();
  });

  /*
   * The description is the one sentence a SERP prints, so the number in it has
   * to be the length of the list under it — `thisWeek.ts`'s invariant, applied
   * where it is least visible.
   */
  it("counts the same events the page leads with", () => {
    const head = eventsHead({
      calendar: calendarWith() as never,
      currentMonth: "2026-09",
      indexable: true,
      isHub: true,
    });
    const description = head.meta.find((entry) => entry.name === "description");
    expect(description?.content).toContain("1 crypto event remaining in September 2026");
  });
});

describe("/events index state", () => {
  it("is promoted and therefore in the sitemap", () => {
    expect(staticPaths()).toContain("/events");
    expect(belongsInSitemap(indexStateFor("/events"))).toBe(true);
  });

  /*
   * The cap does not promise a dense month is described in full — October runs
   * to about 700 upcoming events against a cap of 150. It promises the other
   * end: a month that only just clears the floor is never submitted with a
   * partial graph because it is thin.
   */
  it("describes a barely-submittable month in full", () => {
    expect(JSONLD_LIMIT).toBeGreaterThan(MONTH_INDEX_FLOOR);
  });
});
