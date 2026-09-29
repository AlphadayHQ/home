import { describe, expect, it, vi } from "vitest";
import {
  DENSE_MONTH_FLOOR,
  EVENT_TYPE_LABELS,
  PLACEHOLDER_TYPE,
  JSONLD_LIMIT,
  UPCOMING_FLOOR,
  coveredThrough,
  eventTypeLabel,
  isListableType,
} from "../data/eventTypes.js";
import type { RawEvent } from "../server/events";
import {
  PAGE_SIZE,
  STARTED_GRACE_DAYS,
  isUpcoming,
  shape,
} from "../server/events";
import { belongsInSitemap, indexStateFor, staticPaths } from "../seo/indexState";

/*
 * Only the transport is mocked, the same arrangement as `this-week.test.ts`:
 * the pagination walk, the grace period and the shaping all run for real,
 * because those are the parts that can be wrong without throwing.
 */
vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
}));

const DAY = 86_400_000;
const at = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString();

const row = (over: Partial<RawEvent> = {}): RawEvent => ({
  id: 1,
  title: "ETHSomewhere",
  item_type: "Co",
  starts_at: at(10),
  ends_at: at(12),
  location: "Lisbon, Portugal",
  ...over,
});

/**
 * The trap this module exists for.
 *
 * `/items/events/` returns oldest-first and ignores `ordering` and `offset`, so
 * the events a calendar needs are the *last* rows of 6,900. An implementation
 * that read page 1 — the obvious one — renders 2022 conferences and looks
 * entirely healthy. These assert the walk goes to the end and stops correctly.
 */
describe("the events calendar's backwards walk", () => {
  it("reads the last page first and stops once the raw dates fall behind the horizon", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const { buildCalendar } = await import("../server/events");

    const total = PAGE_SIZE * 4 + 3; // 4 full pages plus a partial → last page 5
    const requested: string[] = [];

    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      requested.push(url);
      const params = new URL(url).searchParams;
      // Substring-matching "limit=1" would also match limit=100 and
      // limit=1000 the moment PAGE_SIZE changes.
      if (params.get("limit") === "1") return { total } as never;

      const page = Number(new URL(url).searchParams.get("page"));
      // Pages 4 and 5 hold the future; everything below is 2022, like the real
      // corpus. Page 3 is the stop signal.
      if (page >= 4) {
        return {
          results: [row({ id: `p${page}`, starts_at: at(page), ends_at: at(page + 1) })],
        } as never;
      }
      return {
        results: [row({ id: `old${page}`, starts_at: "2022-03-31T00:00:00Z", ends_at: "2022-04-03T00:00:00Z" })],
      } as never;
    });

    const calendar = await buildCalendar();

    const pages = requested
      .filter((u) => u.includes("page="))
      .map((u) => Number(new URL(u).searchParams.get("page")));

    expect(pages[0], "must start at the last page, not the first").toBe(5);
    expect(
      pages,
      "must walk backwards and stop on the first page whose newest start is old"
    ).toEqual([5, 4, 3]);
    expect(calendar.upcomingTotal).toBe(2);
    expect(calendar.corpusTotal).toBe(total);
    expect(calendar.truncated).toBe(false);
    // Soonest first: page 4 starts sooner than page 5.
    expect(calendar.events.map((e) => e.id)).toEqual(["p4", "p5"]);
  });

  it("reports thin rather than publishing an empty calendar", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const { buildCalendar } = await import("../server/events");

    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) =>
      (new URL(url).searchParams.get("limit") === "1"
        ? { total: 10 }
        : { results: [] }) as never
    );

    const calendar = await buildCalendar();
    expect(calendar.upcomingTotal).toBe(0);
    expect(calendar.thin).toBe(true);
  });

  it("is thin when the count call fails, rather than claiming a calendar", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const { buildCalendar } = await import("../server/events");

    vi.mocked(fetchJsonSoft).mockResolvedValue(null as never);

    const calendar = await buildCalendar();
    expect(calendar.thin).toBe(true);
    expect(calendar.corpusTotal).toBe(0);
  });
});

describe("what counts as upcoming", () => {
  const now = Date.now();

  it("keeps a multi-day event that is already running", () => {
    expect(isUpcoming(row({ starts_at: at(-2), ends_at: at(1) }), now)).toBe(true);
  });

  /*
   * The regression that put a seven-week "conference" at the top of the page:
   * filtering only on "has not ended" admits rows with implausible ranges, and
   * they sort into a month that has already passed.
   */
  it("drops an event that started longer ago than the grace period", () => {
    const stale = row({
      starts_at: at(-(STARTED_GRACE_DAYS + 1)),
      ends_at: at(30),
    });
    expect(isUpcoming(stale, now)).toBe(false);
  });

  it("drops an event that has already finished", () => {
    expect(isUpcoming(row({ starts_at: at(-3), ends_at: at(-2) }), now)).toBe(false);
  });

  /*
   * The boundary the end-of-day rule creates, pinned so it cannot drift: an
   * event whose last day was yesterday is over, one whose last day is today is
   * not. Written against midnight UTC because every real row is.
   */
  it("expires an event at the end of its last day, not the start", () => {
    const midnight = (offsetDays: number) =>
      `${new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10)}T00:00:00Z`;
    expect(isUpcoming(row({ starts_at: midnight(-4), ends_at: midnight(-1) }), now)).toBe(false);
    expect(isUpcoming(row({ starts_at: midnight(-4), ends_at: midnight(0) }), now)).toBe(true);
  });

  /**
   * The bug this file previously asserted into place.
   *
   * Every date on the endpoint is midnight UTC, so `ends_at >= now` dropped a
   * one-day event at 00:00 on the morning it happened — 72 of the 93 events
   * happening on 29 Sep were missing at 07:34 UTC — and took the last day of
   * every multi-day conference with it. A dateless date means the whole day.
   */
  it("keeps a same-day event for the whole of its day", () => {
    const midnightToday = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
    const sameDay = row({ starts_at: midnightToday, ends_at: midnightToday });
    expect(
      isUpcoming(sameDay, now),
      "an event happening today must not vanish at 00:00 UTC"
    ).toBe(true);
  });

  it("keeps the final day of a multi-day conference", () => {
    const endsToday = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
    expect(isUpcoming(row({ starts_at: at(-2), ends_at: endsToday }), now)).toBe(true);
  });

  it("treats a missing end date as lasting that whole day", () => {
    expect(isUpcoming(row({ starts_at: at(5), ends_at: null }), now)).toBe(true);
    expect(isUpcoming(row({ starts_at: at(-2), ends_at: null }), now)).toBe(false);
  });

  it("refuses unparseable dates instead of ranking them", () => {
    expect(isUpcoming(row({ starts_at: "not a date" }), now)).toBe(false);
    expect(isUpcoming(row({ starts_at: null }), now)).toBe(false);
  });
});

describe("shaping a row for the calendar", () => {
  it("drops the documented placeholder type", () => {
    expect(isListableType(PLACEHOLDER_TYPE)).toBe(false);
    expect(shape(row({ item_type: PLACEHOLDER_TYPE }))).toBeNull();
  });

  it("drops rows with no title, start or type", () => {
    expect(shape(row({ title: null }))).toBeNull();
    expect(shape(row({ starts_at: null }))).toBeNull();
    expect(shape(row({ item_type: null }))).toBeNull();
  });

  it("keeps a row with no location, which the page renders and the graph omits", () => {
    const shaped = shape(row({ location: null }));
    expect(shaped).not.toBeNull();
    expect(shaped?.location).toBeNull();
  });

  /*
   * The labels are inferred from sampled titles rather than documented by the
   * API, so an unknown code must fall through rather than render as its raw
   * two-letter code in front of a reader.
   */
  it("labels only the codes narrow enough to mean something", () => {
    expect(eventTypeLabel("Hk")).toBe("Hackathon");
    expect(eventTypeLabel("MU")).toBe(EVENT_TYPE_LABELS.MU);
  });

  /*
   * `Co` covers 73% of the calendar, which is what gives it away as the bucket
   * everything falls into rather than a description. Labelling it "Conference"
   * printed that word on Stabull Dinner and KBW Korean BBQ & DrinksQ.
   */
  it("says nothing about the catch-all type, or an unknown one", () => {
    expect(eventTypeLabel("Co"), "Co is the default bucket, not a category").toBeNull();
    expect(eventTypeLabel("ZZ")).toBeNull();
    expect(eventTypeLabel(undefined)).toBeNull();
    expect(EVENT_TYPE_LABELS).not.toHaveProperty("Co");
  });
});

describe("/events index state", () => {
  it("is promoted and therefore in the sitemap", () => {
    expect(staticPaths()).toContain("/events");
    expect(belongsInSitemap(indexStateFor("/events"))).toBe(true);
  });

  /*
   * The floor is what takes the page `noindex`, so it has to sit below the
   * volume the calendar actually carries — comparing it to the graph cap said
   * nothing once rendering stopped being capped.
   */
  it("sets the noindex floor well below a working calendar", () => {
    expect(UPCOMING_FLOOR).toBeGreaterThan(0);
    expect(UPCOMING_FLOOR).toBeLessThan(100);
  });
});

/**
 * The stop rule, which is the part of the walk that looks obviously correct and
 * is not. Rows are ascending by `starts_at`, so a page's *shaped* output says
 * nothing reliable about whether earlier pages still hold running events.
 */
describe("when the backwards walk is allowed to stop", () => {
  const mockPages = async (
    pages: Record<number, RawEvent[]>,
    total: number
  ) => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const requested: number[] = [];
    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      if (params.get("limit") === "1") return { total } as never;
      const n = Number(params.get("page"));
      requested.push(n);
      return { results: pages[n] ?? [] } as never;
    });
    return requested;
  };

  it("keeps walking past a dense page whose events have all ended", async () => {
    const { buildCalendar } = await import("../server/events");
    // Page 3 is a busy week already over; page 2 still holds a running event.
    const requested = await mockPages(
      {
        3: [row({ id: "ended", starts_at: at(-3), ends_at: at(-2) })],
        2: [row({ id: "running", starts_at: at(-1), ends_at: at(2) })],
        1: [row({ id: "ancient", starts_at: "2022-01-01T00:00:00Z", ends_at: "2022-01-02T00:00:00Z" })],
      },
      PAGE_SIZE * 2 + 1
    );

    const calendar = await buildCalendar();

    expect(requested, "a spent dense page must not end the walk").toContain(2);
    expect(calendar.events.map((e) => e.id)).toContain("running");
  });

  it("is not stopped by the undated rows that sort last", async () => {
    const { buildCalendar } = await import("../server/events");
    await mockPages(
      {
        3: [row({ id: "undated", starts_at: null, ends_at: null })],
        2: [row({ id: "real", starts_at: at(4), ends_at: at(5) })],
        1: [row({ id: "old", starts_at: "2022-01-01T00:00:00Z" })],
      },
      PAGE_SIZE * 2 + 1
    );

    const calendar = await buildCalendar();
    expect(calendar.events.map((e) => e.id)).toContain("real");
    expect(calendar.upcomingTotal).toBe(1);
    // UPCOMING_FLOOR is 20, so one event is still thin — the point here is that
    // the walk reached page 2 at all, which the assertion above proves.
    expect(calendar.corpusTotal).toBe(PAGE_SIZE * 2 + 1);
  });

  it("is not stopped by a page of placeholder rows", async () => {
    const { buildCalendar } = await import("../server/events");
    await mockPages(
      {
        3: [row({ id: "placeholder", item_type: PLACEHOLDER_TYPE, starts_at: at(1) })],
        2: [row({ id: "real", starts_at: at(3), ends_at: at(4) })],
        1: [row({ id: "old", starts_at: "2022-01-01T00:00:00Z" })],
      },
      PAGE_SIZE * 2 + 1
    );

    const calendar = await buildCalendar();
    expect(calendar.events.map((e) => e.id)).toEqual(["real"]);
  });

  it("does not report truncated when it reached the first page", async () => {
    const { buildCalendar } = await import("../server/events");
    await mockPages({ 1: [row({ starts_at: at(2), ends_at: at(3) })] }, 10);

    const calendar = await buildCalendar();
    expect(calendar.truncated).toBe(false);
  });
});

/**
 * The upstream corpus repeats events under different ids — 58 upcoming
 * title-and-start pairs on 29 Sep, some disagreeing about `item_type`. The id is
 * what differs, so it cannot be the key.
 */
describe("duplicate events", () => {
  it("keeps one copy of a repeated title, start and location", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const { buildCalendar } = await import("../server/events");

    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      if (params.get("limit") === "1") return { total: 3 } as never;
      return {
        results: [
          row({ id: 75012, title: "Miami Thing", item_type: "Co", starts_at: at(4), ends_at: at(5) }),
          row({ id: 79114, title: "Miami Thing", item_type: "PY", starts_at: at(4), ends_at: at(5) }),
          row({ id: 3, title: "Somewhere Else", starts_at: at(6), ends_at: at(7) }),
        ],
      } as never;
    });

    const calendar = await buildCalendar();
    expect(calendar.events).toHaveLength(2);
    expect(calendar.upcomingTotal, "the count must not include the duplicate").toBe(2);
    // First occurrence wins, so the type of the first-listed copy survives.
    expect(calendar.events[0].type).toBe("Co");
  });
});

/**
 * A dropped page subtracts up to 500 events. The walk is right to continue past
 * it, but the count it produces is then a floor, and a page that prints it as
 * exact gives no sign anything is missing — the failure `thisWeek.ts`
 * distinguishes with its own partial flag.
 */
describe("a page that fails to fetch", () => {
  it("is walked past, and the count says so", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const { buildCalendar } = await import("../server/events");

    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      // total → lastPage 4, so the walk runs 4, 3, 2, 1.
      if (params.get("limit") === "1") return { total: PAGE_SIZE * 3 + 1 } as never;
      const n = Number(params.get("page"));
      if (n === 4) return { results: [row({ id: "first", starts_at: at(5), ends_at: at(6) })] } as never;
      if (n === 3) return null as never; // the dropped page
      if (n === 2) return { results: [row({ id: "kept", starts_at: at(3), ends_at: at(4) })] } as never;
      return {
        results: [row({ id: "old", starts_at: "2022-01-01T00:00:00Z", ends_at: "2022-01-02T00:00:00Z" })],
      } as never;
    });

    const calendar = await buildCalendar();

    expect(calendar.partial, "a dropped page must be reported").toBe(true);
    expect(
      calendar.events.map((e) => e.id),
      "the walk must continue past the gap rather than stop at it"
    ).toContain("kept");
  });

  it("is not reported when every page answers", async () => {
    const { fetchJsonSoft } = await import("../server/apiFetch");
    const { buildCalendar } = await import("../server/events");

    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      const params = new URL(url).searchParams;
      if (params.get("limit") === "1") return { total: 10 } as never;
      return { results: [row({ starts_at: at(2), ends_at: at(3) })] } as never;
    });

    const calendar = await buildCalendar();
    expect(calendar.partial).toBe(false);
  });
});

/**
 * `endsAt` is dropped when it repeats the start, which it does on two-thirds of
 * the corpus. The whole payload is serialised into the page for hydration, so
 * this is page weight, and everything downstream already reads a missing end as
 * "the same day".
 */
describe("the shaped end date", () => {
  it("is dropped when it only repeats the start", () => {
    const sameDay = "2026-10-03T00:00:00Z";
    expect(shape(row({ starts_at: sameDay, ends_at: sameDay }))?.endsAt).toBeNull();
  });

  it("is kept when the event really spans days", () => {
    const shaped = shape(row({ starts_at: "2026-10-03T00:00:00Z", ends_at: "2026-10-05T00:00:00Z" }));
    expect(shaped?.endsAt).toBe("2026-10-05T00:00:00Z");
  });
});

/**
 * The hero's coverage sentence, which is where a date-dependent bug hides.
 *
 * The first month group is usually *last* month's leftovers — multi-day events
 * still running inside the 7-day grace window — so for the first week or so of
 * every month it holds single digits. Counting the dense run from index 0 ended
 * it immediately and named the previous month as the horizon.
 */
describe("how far the calendar claims to cover", () => {
  const m = (key: string, count: number) => ({ key, count });

  it("ignores last month's leftovers when naming the horizon", () => {
    // 3 October: September is three stragglers, October is the real calendar.
    const span = coveredThrough([
      m("2026-09", 3),
      m("2026-10", 645),
      m("2026-11", 120),
      m("2026-12", 27),
      m("2027-01", 6),
    ]);
    expect(
      span?.through,
      "must not claim coverage through a month that has already passed"
    ).toBe("2026-12");
    expect(span?.last).toBe("2027-01");
  });

  it("counts the run from the start when the first month is already busy", () => {
    const span = coveredThrough([
      m("2026-09", 172),
      m("2026-10", 696),
      m("2026-11", 111),
      m("2026-12", 27),
      m("2027-01", 6),
    ]);
    expect(span?.through).toBe("2026-12");
  });

  /*
   * Volume is not monotonic: May 2027 holds 12 while the four months before it
   * hold six to nine. Taking the last qualifying month would claim coverage
   * those four do not support.
   */
  it("stops at the first sparse month rather than reaching a later dense one", () => {
    const span = coveredThrough([
      m("2026-10", 645),
      m("2026-11", 120),
      m("2026-12", 27),
      m("2027-01", 6),
      m("2027-05", 12),
    ]);
    expect(span?.through).toBe("2026-12");
  });

  it("claims nothing when no month clears the floor", () => {
    const span = coveredThrough([m("2027-01", 3), m("2027-02", 2)]);
    expect(span?.through, "a thin calendar should make no claim").toBeNull();
    expect(span?.last).toBe("2027-02");
  });

  it("has no tail to describe when the run reaches the end", () => {
    const span = coveredThrough([m("2026-10", 645), m("2026-11", 120)]);
    expect(span?.through).toBe("2026-11");
    expect(span?.through).toBe(span?.last);
  });

  it("returns nothing for an empty calendar", () => {
    expect(coveredThrough([])).toBeNull();
    expect(DENSE_MONTH_FLOOR).toBeGreaterThan(1);
  });
});
