import { afterEach, describe, expect, it, vi } from "vitest";
import type { MonthPoint, Proposal, RawProposal } from "../data/governance";
import {
  COHORT_FLOOR,
  COHORT_WINDOW_DAYS,
  RECENT_LIMIT,
  dedupeProposals,
  isLive,
  monthlySeries,
  reportIsIndexable,
  shapeProposal,
  shapeProposals,
  snapshotSpaceId,
  spaceActivity,
  trendOf,
} from "../data/governance";
import { governanceHead, headlineOf } from "../seo/governanceHead";
import { belongsInSitemap, indexStateFor, staticPaths } from "../seo/indexState";

/*
 * Only the transport is mocked, the same arrangement as `events-calendar.test.ts`.
 * The walk, the cohort selection and the trend arithmetic all run for real,
 * because those are the parts that can be wrong without throwing.
 */
vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
}));

const SNAPSHOT = "https://snapshot.org/#/balancer.eth/proposal/0xabc";

const row = (over: Partial<RawProposal> = {}): RawProposal => ({
  id: 8449,
  title: "[BIP-928] Orderly Winddown of Balancer",
  url: SNAPSHOT,
  starts_at: "2026-09-25T18:24:54Z",
  ends_at: "2026-09-29T18:24:54Z",
  source: { name: "Balancer", slug: "balancer_dao" },
  ...over,
});

const proposal = (over: Partial<Proposal> = {}): Proposal => ({
  id: "1",
  title: "[BIP-928] Orderly Winddown of Balancer",
  url: SNAPSHOT,
  space: "balancer_dao",
  spaceName: "Balancer",
  startsAt: "2026-09-25T18:24:54Z",
  endsAt: null,
  ...over,
});

const at = (iso: string) => new Date(iso).getTime();

/** A complete, gapless series ending in the given month, `count` every month. */
const series = (months: number, count: number, endsAt = "2026-08"): MonthPoint[] => {
  const points: MonthPoint[] = [];
  let [year, month] = endsAt.split("-").map(Number);
  for (let i = 0; i < months; i += 1) {
    points.unshift({ month: `${year}-${String(month).padStart(2, "0")}`, count });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return points;
};

/**
 * Only `Date` is faked. The cohort split reads the clock, so a test written
 * against the real one passes today and starts failing in ninety days.
 */
const freeze = (iso: string) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
};

afterEach(() => {
  vi.useRealTimers();
});

describe("shaping proposals", () => {
  it("keeps a complete row", () => {
    const shaped = shapeProposal(row());
    expect(shaped).toMatchObject({
      id: "8449",
      space: "balancer_dao",
      spaceName: "Balancer",
      url: SNAPSHOT,
      endsAt: "2026-09-29T18:24:54Z",
    });
  });

  /*
   * Every one of these is the page's identity or its citation. A row without a
   * URL cannot be linked and a row without a space cannot be attributed, so
   * neither belongs in a count that will be quoted.
   */
  it.each([
    ["title", { title: "" }],
    ["url", { url: null }],
    ["start", { starts_at: undefined }],
    ["space", { source: { name: "Balancer" } }],
    ["a parseable start", { starts_at: "not a date" }],
  ])("drops a row with no %s", (_what, over) => {
    expect(shapeProposal(row(over as Partial<RawProposal>))).toBeNull();
  });

  it("drops an end that only repeats the start", () => {
    const same = "2026-09-25T18:24:54Z";
    expect(shapeProposal(row({ starts_at: same, ends_at: same }))?.endsAt).toBeNull();
  });

  it("falls back to the URL for an id, which is unique where the id may not be", () => {
    expect(shapeProposal(row({ id: undefined }))?.id).toBe(SNAPSHOT);
  });

  it("returns proposals newest first", () => {
    const shaped = shapeProposals([
      row({ url: "https://snapshot.org/#/a.eth/proposal/0x1", starts_at: "2026-01-01T00:00:00Z" }),
      row({ url: "https://snapshot.org/#/a.eth/proposal/0x2", starts_at: "2026-09-01T00:00:00Z" }),
      row({ url: "https://snapshot.org/#/a.eth/proposal/0x3", starts_at: "2026-05-01T00:00:00Z" }),
    ]);
    expect(shaped.map((p) => p.startsAt.slice(0, 7))).toEqual([
      "2026-09",
      "2026-05",
      "2026-01",
    ]);
  });
});

describe("de-duplication", () => {
  /*
   * 773 URLs appear more than once in the corpus — 853 extra rows, 12.9% — the
   * copies disagreeing about `starts_at` by seconds and carrying different ids.
   */
  it("collapses the same proposal URL however the timestamps differ", () => {
    const deduped = dedupeProposals([
      proposal({ id: "1", startsAt: "2022-04-29T18:50:28Z" }),
      proposal({ id: "2", startsAt: "2022-04-29T18:50:00Z" }),
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe("1");
  });

  /**
   * The failure that was visible on the rendered page: Balancer's nine most
   * recent BIPs each arrive two or three times, every copy carrying a *different*
   * Snapshot proposal hash, so the URLs are distinct and the votes are not.
   * "Latest proposals" opened with the same BIP three times and the quarter
   * counted 13 Balancer votes where it held 10.
   */
  it("collapses one vote reported under several Snapshot hashes", () => {
    const deduped = dedupeProposals([
      proposal({ url: `${SNAPSHOT}a`, startsAt: "2026-09-25T18:24:54Z" }),
      proposal({ url: `${SNAPSHOT}b`, startsAt: "2026-09-25T18:00:00Z" }),
      proposal({ url: `${SNAPSHOT}c`, startsAt: "2026-09-25T18:00:00Z" }),
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].url, "the newest copy survives").toBe(`${SNAPSHOT}a`);
  });

  /*
   * A day, because a DAO does not open two votes on the same text on the same
   * day — and where it genuinely re-runs one the gap is weeks. Collapsing those
   * would erase real votes, which is the opposite error and the worse one.
   */
  it("keeps a genuine re-run of the same title weeks later", () => {
    const deduped = dedupeProposals([
      proposal({ url: `${SNAPSHOT}a`, startsAt: "2026-08-21T18:00:00Z" }),
      proposal({ url: `${SNAPSHOT}b`, startsAt: "2026-07-31T18:00:00Z" }),
    ]);
    expect(deduped).toHaveLength(2);
  });

  it("does not collapse the same title across two spaces", () => {
    const deduped = dedupeProposals([
      proposal({ url: `${SNAPSHOT}a`, space: "balancer_dao" }),
      proposal({ url: `${SNAPSHOT}b`, space: "aave_dao" }),
    ]);
    expect(deduped).toHaveLength(2);
  });

  it("keeps two different proposals in one space that do not share a title", () => {
    const deduped = dedupeProposals([
      proposal({ url: `${SNAPSHOT}a`, title: "[BIP-928] Winddown" }),
      proposal({ url: `${SNAPSHOT}b`, title: "[BIP-929] Fork" }),
    ]);
    expect(deduped).toHaveLength(2);
  });
});

describe("snapshot space ids", () => {
  /*
   * The citable name, and it is read off the URL rather than derived from the
   * slug because the two genuinely disagree: `yearn_dao` is `ybaby.eth`.
   */
  it("reads the space out of a proposal URL", () => {
    expect(snapshotSpaceId(SNAPSHOT)).toBe("balancer.eth");
    expect(snapshotSpaceId("https://snapshot.org/#/ybaby.eth/proposal/0xc50")).toBe(
      "ybaby.eth"
    );
  });

  it("returns null rather than a guess when the URL is not a proposal URL", () => {
    expect(snapshotSpaceId("https://example.com/vote/1")).toBeNull();
  });
});

describe("space activity", () => {
  const now = at("2026-09-30T00:00:00Z");

  const proposals = [
    proposal({ url: `${SNAPSHOT}1`, space: "balancer_dao", startsAt: "2026-09-25T00:00:00Z" }),
    proposal({ url: `${SNAPSHOT}2`, space: "balancer_dao", startsAt: "2026-09-01T00:00:00Z" }),
    proposal({ url: `${SNAPSHOT}3`, space: "balancer_dao", startsAt: "2023-01-01T00:00:00Z" }),
    proposal({
      url: "https://snapshot.org/#/aave.eth/proposal/0xbbd",
      space: "aave_dao",
      spaceName: "Aave",
      startsAt: "2025-04-02T10:09:05Z",
    }),
  ];

  it("counts all time and the window separately, and dates the latest", () => {
    const [balancer, aave] = spaceActivity(proposals, now);

    expect(balancer).toMatchObject({
      space: "balancer_dao",
      total: 3,
      recent: 2,
      last: "2026-09-25T00:00:00Z",
      silentDays: 5,
      spaceId: "balancer.eth",
    });
    expect(aave).toMatchObject({ space: "aave_dao", total: 1, recent: 0 });
    expect(aave.silentDays).toBeGreaterThan(500);
  });

  it("orders by how recently a space voted, not by volume", () => {
    expect(spaceActivity(proposals, now).map((s) => s.space)).toEqual([
      "balancer_dao",
      "aave_dao",
    ]);
  });

  /*
   * Ninety days, not thirty. Eight of the fifteen live spaces produced nothing
   * in the 30 days to 30 Sep 2026 — ENS and Rocket Pool among them — and a
   * cohort that ejects a space for one quiet month reports its own churn as a
   * decline in governance.
   */
  it("holds a space in the cohort right up to the window edge", () => {
    const edge = spaceActivity(
      [proposal({ startsAt: "2026-07-02T12:00:00Z" })],
      at("2026-09-30T00:00:00Z")
    )[0];
    expect(edge.silentDays).toBe(COHORT_WINDOW_DAYS - 1);
    expect(isLive(edge)).toBe(true);

    const past = spaceActivity(
      [proposal({ startsAt: "2026-06-01T00:00:00Z" })],
      at("2026-09-30T00:00:00Z")
    )[0];
    expect(isLive(past)).toBe(false);
  });
});

describe("the monthly series", () => {
  /**
   * The method, as a test.
   *
   * Over all 51 spaces the series falls from 167 a month in mid-2024 to 13 in
   * August 2026, and most of that fall is coverage thinning rather than
   * governance: `aave_dao` stops in April 2025 while `aave_forum` carried five
   * `[ARFC]` threads in the week to 28 Sep 2026. A dormant space's archive must
   * not contribute to the series at all, or the report publishes a dropped
   * source as a decline.
   */
  it("excludes a dormant space's history, not just its recent months", () => {
    const proposals = [
      proposal({ url: `${SNAPSHOT}1`, space: "live_dao", startsAt: "2026-09-01T00:00:00Z" }),
      proposal({ url: `${SNAPSHOT}2`, space: "live_dao", startsAt: "2024-06-01T00:00:00Z" }),
      proposal({ url: `${SNAPSHOT}3`, space: "gone_dao", startsAt: "2024-06-02T00:00:00Z" }),
      proposal({ url: `${SNAPSHOT}4`, space: "gone_dao", startsAt: "2024-06-03T00:00:00Z" }),
    ];

    const points = monthlySeries(proposals, new Set(["live_dao"]), "2026-09");
    expect(points.find((p) => p.month === "2024-06")?.count).toBe(1);
  });

  it("writes an empty month as a zero rather than skipping it", () => {
    const points = monthlySeries(
      [
        proposal({ url: `${SNAPSHOT}1`, startsAt: "2026-06-01T00:00:00Z" }),
        proposal({ url: `${SNAPSHOT}2`, startsAt: "2026-09-01T00:00:00Z" }),
      ],
      new Set(["balancer_dao"]),
      "2026-09"
    );
    expect(points.map((p) => p.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(points.map((p) => p.count)).toEqual([1, 0, 0, 1]);
  });

  it("marks only the month the report was built in as partial", () => {
    const points = monthlySeries(
      [proposal({ startsAt: "2026-07-01T00:00:00Z" })],
      new Set(["balancer_dao"]),
      "2026-09"
    );
    expect(points.filter((p) => p.partial).map((p) => p.month)).toEqual(["2026-09"]);
  });

  it("runs to the current month even when nothing has been proposed in it", () => {
    const points = monthlySeries(
      [proposal({ startsAt: "2026-04-01T00:00:00Z" })],
      new Set(["balancer_dao"]),
      "2026-09"
    );
    expect(points[points.length - 1]).toEqual({ month: "2026-09", count: 0, partial: true });
  });
});

describe("the trend", () => {
  it("needs two full years before it will compare anything", () => {
    expect(trendOf(series(23, 10))).toBeNull();
    expect(trendOf(series(24, 10))).not.toBeNull();
  });

  /*
   * The current month is a third full on the 10th, so including it prints a
   * decline that reverses itself by the 30th — the count-and-rows failure
   * `thisWeek.ts` names, expressed as a percentage.
   */
  it("leaves the partial month out of both windows", () => {
    const flat = series(24, 10);
    const withPartial = [...flat, { month: "2026-09", count: 1, partial: true as const }];
    expect(trendOf(withPartial)).toEqual(trendOf(flat));
  });

  it("measures the trailing twelve against the best twelve on record", () => {
    // 12 months of 80, then 12 of 25: peak is the first window, trailing the last.
    const points = [...series(12, 80, "2025-08"), ...series(12, 25, "2026-08")];
    const trend = trendOf(points);
    expect(trend).toMatchObject({
      trailing: 300,
      previous: 960,
      peak: 960,
      peakFrom: "2024-09",
      peakTo: "2025-08",
      changePct: -69,
    });
  });

  /**
   * The peak search includes the trailing window, so a rising series reports a
   * change of zero and never a positive one. That is arithmetic, not a bug — but
   * it means the peak comparison cannot carry direction, and reading a direction
   * off it produced "up 0% on the busiest twelve months on record".
   */
  it("reports a record year as a record, not as a rise of zero percent", () => {
    const points = [...series(12, 25, "2025-08"), ...series(12, 50, "2026-08")];
    const trend = trendOf(points);
    expect(trend?.changePct).toBe(0);
    expect(trend?.trailing).toBe(600);
    expect(trend?.peak).toBe(600);
  });

  /*
   * Direction needs a neighbour, not a record: without it an h1 reading off the
   * peak says "DAOs are voting less" through a recovery.
   */
  it("carries the previous twelve months so direction can be read", () => {
    const rising = trendOf([...series(12, 25, "2025-08"), ...series(12, 50, "2026-08")]);
    expect(rising?.previous).toBe(300);
    expect(rising!.trailing > rising!.previous!).toBe(true);

    const falling = trendOf([...series(12, 80, "2025-08"), ...series(12, 25, "2026-08")]);
    expect(falling!.trailing < falling!.previous!).toBe(true);
  });
});

describe("the index gate", () => {
  const TREND = {
    trailing: 300,
    previous: 420,
    peak: 900,
    peakFrom: "2024-09",
    peakTo: "2025-08",
    changePct: -67,
  };

  const withCohort = (spaces: number) => ({
    cohort: Array.from({ length: spaces }, (_, i) => ({
      space: `s${i}`,
      name: `S${i}`,
      spaceId: null,
      total: 1,
      last: "2026-09-01T00:00:00Z",
      silentDays: 1,
      recent: 1,
    })),
    trend: TREND,
    partial: false,
  });

  /*
   * A quiet quarter is a finding and keeps the page indexed. A collapsed cohort
   * is a pipeline failure: the decline the page would print happened in the
   * ingestion, not in the DAOs, and publishing it is the dead-DAO error in
   * aggregate form.
   */
  it("demotes when the cohort collapses, not when proposals are few", () => {
    expect(reportIsIndexable(withCohort(COHORT_FLOOR))).toBe(true);
    expect(reportIsIndexable(withCohort(COHORT_FLOOR - 1))).toBe(false);

    const quiet = { ...withCohort(COHORT_FLOOR), trend: { ...TREND, trailing: 4, changePct: -100 } };
    expect(reportIsIndexable(quiet)).toBe(true);
  });

  it("refuses to submit a page whose central number is missing", () => {
    expect(reportIsIndexable({ ...withCohort(20), trend: null })).toBe(false);
  });

  /**
   * The route refuses to render at all on a partial read — see the loader — so
   * this gate is the second line rather than the first. It is kept because
   * `reportIsIndexable` is a pure function anything can call, and the property
   * it protects has already shipped wrong once.
   *
   * A dropped page is not a short count, it is a hole in the archive the peak is
   * measured over — and the peak is the denominator. Losing page 9 of 14 reports
   * a 58% decline where the truth is 66%, and the edge then serves that for a
   * day under `stale-while-revalidate`. `partial` used to set a `+` on one
   * figure in the hero and leave the percentage, the description and the
   * `Dataset` untouched.
   */
  it("refuses to submit a percentage drawn from an incomplete archive", () => {
    expect(reportIsIndexable({ ...withCohort(20), partial: true })).toBe(false);
  });

  it("is promoted and in the sitemap", () => {
    expect(indexStateFor("/research/governance")).toBe("promoted");
    expect(belongsInSitemap(indexStateFor("/research/governance"))).toBe(true);
    expect(staticPaths()).toContain("/research/governance");
  });

  /* The trailing-slash form has to resolve to the same state as the bare one. */
  it("normalises a trailing slash", () => {
    expect(indexStateFor("/research/governance/")).toBe("promoted");
  });
});

/**
 * The loader's response to an incomplete read, exercised rather than grepped.
 *
 * This checked the route's source with a regex first, which would have passed
 * an inverted condition and failed a harmless rewrite. The loader is an
 * ordinary function on `Route.options`, so it can be called with the server
 * function mocked — and the property is worth testing for real, because losing
 * it is silent: rendering a reduced page returns a 200, `server.mjs` stamps
 * every 200 with `s-maxage=3600, stale-while-revalidate=86400`, and the edge
 * then serves a `noindex` copy of the one promoted research page for up to a
 * day. Verified end to end against a proxy that drops page 9 of the walk: 500,
 * and no `Cache-Control` on the response.
 */
describe("the route's response to a partial read", () => {
  const loadWith = async (report: Record<string, unknown>) => {
    vi.resetModules();
    vi.doMock("../server/governance", () => ({
      getGovernanceReport: async () => report,
    }));
    vi.doMock("../seo/robotsHeader", () => ({ setRobotsHeader: () => {} }));
    const { Route } = await import("../routes/research.governance");
    return (Route.options.loader as (ctx: unknown) => Promise<unknown>)({});
  };

  const whole = {
    cohort: withSpaces(15),
    dormant: [],
    series: [],
    trend: null,
    recentCount: 0,
    recent: [],
    forumQuarter: 1,
    total: 10,
    rawTotal: 10,
    spaceCount: 15,
    windowDays: COHORT_WINDOW_DAYS,
    partial: false,
    asOf: "2026-10-02T06:00:00Z",
  };

  afterEach(() => {
    vi.doUnmock("../server/governance");
    vi.doUnmock("../seo/robotsHeader");
    vi.resetModules();
  });

  it("rejects rather than rendering, so no 200 is cached", async () => {
    await expect(loadWith({ ...whole, partial: true })).rejects.toThrow(/read short/);
  });

  it("renders a whole read", async () => {
    await expect(loadWith(whole)).resolves.toMatchObject({ indexable: false });
  });
});

describe("the head", () => {
  const report = {
    cohort: withSpaces(15),
    dormant: withSpaces(36),
    series: [...series(12, 80, "2025-08"), ...series(12, 25, "2026-08"), { month: "2026-09", count: 21, partial: true as const }],
    trend: trendOf([...series(12, 80, "2025-08"), ...series(12, 25, "2026-08")]),
    recentCount: 64,
    recent: [] as Proposal[],
    forumQuarter: 2411,
    total: 5384,
    rawTotal: 6612,
    spaceCount: 51,
    windowDays: COHORT_WINDOW_DAYS,
    partial: false,
    asOf: "2026-09-30T06:00:00Z",
  };

  it("names the trailing window from the complete months", () => {
    expect(headlineOf(report)).toMatchObject({
      trailing: 300,
      peak: 960,
      spaces: 15,
      window: "September 2025 – August 2026",
      windowEnd: "August 2026",
      atPeak: false,
    });
  });

  /**
   * The comparison is the load-bearing half of "down 66%": `peakFrom`/`peakTo`
   * were computed and never printed, so a reader quoting the figure could not
   * say what it was against.
   */
  it("names the window the comparison is against", () => {
    expect(headlineOf(report)?.peakWindow).toBe("September 2024 – August 2025");

    const sameYear = {
      ...report,
      trend: { ...report.trend!, peakFrom: "2023-01", peakTo: "2023-12" },
    };
    expect(
      headlineOf(sameYear)?.peakWindow,
      "one year, named once"
    ).toBe("January – December 2023");
  });

  /**
   * The h1 claims a direction, so the figure behind it is measured year on year
   * rather than against the record — which can never be positive — and only
   * past a margin, because off a bare inequality one proposal flips the
   * sentence between builds.
   */
  it("reads direction year on year, and only past a margin", () => {
    const flat = {
      ...report,
      trend: { ...report.trend!, trailing: 300, previous: 305 },
    };
    expect(headlineOf(flat)?.direction, "1.6% is noise, not a direction").toBeNull();

    const down = { ...report, trend: { ...report.trend!, trailing: 300, previous: 400 } };
    expect(headlineOf(down)?.direction).toBe("down");

    const up = { ...report, trend: { ...report.trend!, trailing: 400, previous: 300 } };
    expect(headlineOf(up)?.direction, "the peak comparison cannot say this").toBe("up");

    expect(headlineOf(down)?.previous, "the page prints what the h1 rests on").toBe(400);
  });

  it("flags a record year rather than describing it as a change", () => {
    const atPeak = { ...report, trend: { ...report.trend!, changePct: 0 } };
    expect(headlineOf(atPeak)?.atPeak).toBe(true);
    const description = governanceHead({ report: atPeak, indexable: true }).meta.find(
      (m) => m.name === "description"
    )?.content;
    expect(description).toContain("the busiest 12 months on record");
    expect(description).not.toContain("up 0%");
    expect(description).not.toContain("down 0%");
  });

  it("has no headline without a trend, which is also when it is noindex", () => {
    expect(headlineOf({ ...report, trend: null })).toBeNull();
  });

  /*
   * The same condition as `reportIsIndexable`: an incomplete archive means an
   * incomplete denominator, and the description must withhold the percentage
   * rather than print one drawn from a gap.
   */
  it("withholds every figure when the archive was read incompletely", () => {
    expect(headlineOf({ ...report, partial: true })).toBeNull();

    const head = governanceHead({ report: { ...report, partial: true }, indexable: false });
    const description = head.meta.find((m) => m.name === "description")?.content ?? "";
    expect(description).not.toContain("%");
    expect(description).not.toContain("300");
  });

  /*
   * §5.1: a noindex page must not declare a canonical, and an indexable one
   * must. `seoHead` makes both unrepresentable in the type system; this checks
   * the branch actually taken.
   */
  it("emits no canonical when the report is not indexable", () => {
    const head = governanceHead({ report, indexable: false });
    expect(head.links.find((l) => l.rel === "canonical")).toBeUndefined();
    expect(head.meta).toEqual(
      expect.arrayContaining([{ name: "robots", content: "noindex, follow" }])
    );
    expect(head.scripts).toHaveLength(0);
  });

  /**
   * The description prints the same numbers the page prints, from `headlineOf`.
   * A SERP promising a 68% decline over a page showing 69% is the count-and-rows
   * drift arrived at through the one sentence a search result actually shows.
   */
  it("describes the page with the numbers the page reports", () => {
    const head = governanceHead({ report, indexable: true });
    const description = head.meta.find((m) => m.name === "description")?.content ?? "";
    expect(description).toContain("300 governance proposals");
    expect(description).toContain("15 indexed Snapshot spaces");
    expect(description).toContain("down 69%");
    expect(description).toContain("August 2026");
    /*
     * Google shows roughly 155 characters. The first draft ran to 265 and lost
     * the peak window — the half that makes the percentage quotable — along with
     * the free-and-no-signup hook, to truncation.
     */
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toContain("(960, Sep 2024–Aug 2025)");
  });

  /*
   * "Snapshot spaces", never "DAOs", in the title. The figures are measured over
   * the spaces still ingested here, and the title is the half a journalist
   * quotes — see `governance.ts` on why the dead-DAO index is not shipped.
   */
  it("does not overstate the denominator in the title", () => {
    const title = governanceHead({ report, indexable: true }).meta.find(
      (m) => "title" in m
    )?.title;
    expect(title).toContain("15 Snapshot spaces");
    expect(title).not.toContain("15 DAOs");
  });

  it("emits a Dataset whose coverage ends at the last complete month", () => {
    const head = governanceHead({ report, indexable: true });
    const dataset = JSON.parse(head.scripts[0].children as string);

    expect(dataset["@context"]).toBe("https://schema.org");
    expect(dataset["@type"]).toBe("Dataset");
    expect(dataset.temporalCoverage).toBe("2024-09/2026-08");
    expect(dataset.isAccessibleForFree).toBe(true);
    /*
     * The technique note has to describe the rule the figures actually come
     * from. URL de-duplication alone is a looser measurement than the page
     * performs, and the same-title-same-day rule is the first thing a
     * researcher checking these numbers would want to see stated.
     */
    expect(String(dataset.measurementTechnique)).toContain("De-duplicated by proposal URL");
    expect(String(dataset.measurementTechnique)).toContain("title within one space and one day");
    expect(dataset.distribution.contentUrl).toContain("/items/dao/");
  });
});

function withSpaces(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    space: `s${i}`,
    name: `S${i}`,
    spaceId: `s${i}.eth`,
    total: 10,
    last: "2026-09-01T00:00:00Z",
    silentDays: i,
    recent: 2,
  }));
}

describe("building the report", () => {
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
   * `total` is what decides how many pages are fetched, not `links.next`: the
   * walk reads the count off the first response and requests the rest at once.
   */
  const page = (rows: RawProposal[], total = rows.length) => ({ total, results: rows });

  /*
   * A distinct title per row, because de-duplication collapses one title in one
   * space on one day — a fixture that reuses a title is testing the dedupe, not
   * the walk.
   */
  const proposalRow = (n: number, space = "balancer_dao", startsAt = "2026-09-20T00:00:00Z") =>
    row({
      id: n,
      title: `[BIP-${n}] Proposal ${n}`,
      url: `https://snapshot.org/#/${space.replace("_dao", "")}.eth/proposal/0x${n}`,
      starts_at: startsAt,
      ends_at: startsAt,
      source: { name: space, slug: space },
    });

  /**
   * The walk is unfiltered on purpose, and this is the guard against someone
   * "optimising" it back. `starts_at__gte`/`__lte` — the pair the events
   * calendar is built on — is accepted here and silently ignored, so a windowed
   * request would return the whole corpus while looking precise.
   */
  it("asks for whole pages rather than a date range the endpoint ignores", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    const seen = await mockApi((url) =>
      url.includes("/items/forum/") ? { total: 2411 } : page([proposalRow(1)])
    );

    await buildGovernanceReport();

    const walk = seen.filter((u) => u.includes("/items/dao/"));
    expect(walk[0]).toContain("limit=500");
    expect(walk[0]).toContain("page=1");
    expect(walk[0]).not.toContain("starts_at__gte");
    expect(walk[0]).not.toContain("ordering");
  });

  /*
   * Two round trips for fourteen pages. Following `links.next` one at a time
   * made the render take ten seconds against the events calendar's one and a
   * half, so the page count is derived from `total` and the rest are concurrent.
   */
  it("derives the page count from the reported total and fetches the rest at once", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    const full = Array.from({ length: 500 }, (_, i) => proposalRow(i));
    const seen = await mockApi((url) => {
      if (url.includes("/items/forum/")) return { total: 2411 };
      return url.includes("page=1") ? page(full, 501) : page([proposalRow(9001)], 501);
    });

    const report = await buildGovernanceReport();

    expect(seen.filter((u) => u.includes("/items/dao/"))).toEqual([
      "https://api.test/items/dao/?limit=500&page=1",
      "https://api.test/items/dao/?limit=500&page=2",
    ]);
    expect(report.total).toBe(501);
    expect(report.partial).toBe(false);
  });

  /*
   * A failed page leaves a hole in the middle of the archive rather than
   * truncating it, so the trend would be computed over a gap. `partial` is what
   * stops the page printing a percentage drawn from one.
   */
  it("reports a dropped page rather than counting around it", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    const full = Array.from({ length: 500 }, (_, i) => proposalRow(i));
    await mockApi((url) => {
      if (url.includes("/items/forum/")) return { total: 2411 };
      if (url.includes("page=1")) return page(full, 1001);
      if (url.includes("page=2")) return null;
      return page([proposalRow(9001)], 1001);
    });

    const report = await buildGovernanceReport();
    expect(report.partial).toBe(true);
  });

  /**
   * A corpus that outgrows the walk is not a dropped page, and must not share
   * its flag.
   *
   * Pages come newest-first, so a truncated walk loses the *oldest* months —
   * the ones the peak is drawn from — and would quietly understate the decline.
   * But the reason it gets its own error is the remedy, not the symptom: a
   * dropped page is retried by the next render and needs nobody, while this
   * fails identically on every request until someone raises the ceiling. Under
   * the old flag it would have become a permanent outage at 10,001 rows,
   * serving 500s to readers once `stale-if-error` lapsed.
   */
  it("fails a corpus larger than the walk under its own name", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport, CorpusOutgrewWalkError } = await import(
      "../server/governance"
    );
    await mockApi((url) =>
      url.includes("/items/forum/") ? { total: 2411 } : page([proposalRow(1)], 500_000)
    );

    await expect(buildGovernanceReport()).rejects.toBeInstanceOf(CorpusOutgrewWalkError);
    await expect(buildGovernanceReport()).rejects.toThrow(/will not clear on its own/);
  });

  /*
   * The cap is a ceiling on a runaway, not a budget: a corpus several times the
   * current one still walks, and raising the ceiling costs nothing until it is
   * reached.
   */
  it("walks a corpus far larger than today's, in bounded batches", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    const full = (n: number) =>
      Array.from({ length: 500 }, (_, i) => proposalRow(n * 500 + i));
    const seen = await mockApi((url) => {
      if (url.includes("/items/forum/")) return { total: 2411 };
      const n = Number(new URL(url).searchParams.get("page"));
      return page(full(n), 20_000);
    });

    const report = await buildGovernanceReport();

    expect(seen.filter((u) => u.includes("/items/dao/"))).toHaveLength(40);
    expect(report.partial).toBe(false);
  });

  it("splits live spaces from dormant ones and measures only the live set", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    await mockApi((url) =>
      url.includes("/items/forum/")
        ? { total: 2411 }
        : page([
            proposalRow(1, "balancer_dao", "2026-09-20T00:00:00Z"),
            proposalRow(2, "aave_dao", "2025-04-02T00:00:00Z"),
            proposalRow(3, "aave_dao", "2024-06-01T00:00:00Z"),
          ])
    );

    const report = await buildGovernanceReport();

    expect(report.cohort.map((s) => s.space)).toEqual(["balancer_dao"]);
    expect(report.dormant.map((s) => s.space)).toEqual(["aave_dao"]);
    expect(report.spaceCount).toBe(2);
    // Aave's two proposals are in `total` and in neither the series nor the rows.
    expect(report.total).toBe(3);
    expect(report.recentCount).toBe(1);
    expect(report.series.some((p) => p.month === "2024-06")).toBe(false);
  });

  /**
   * `thisWeek.ts`'s invariant, applied across two components: the sentence above
   * the table and the table's own column are the same measurement and must come
   * from the same rule. They did not — whole days in `spaceActivity` against an
   * exact millisecond cutoff in the walk — so the page read "54 proposals in the
   * last 90 days" over a column adding to 58, and then reported the busiest
   * space's share by dividing one rule's numerator by the other's denominator.
   */
  it("counts the window once, so the sentence and the table agree", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    await mockApi((url) =>
      url.includes("/items/forum/")
        ? { total: 2411 }
        : page([
            // Exactly on the boundary day, part-way through it: counted as 90
            // whole days old by one rule and 90.7 by the other.
            proposalRow(1, "balancer_dao", "2026-07-02T16:48:00Z"),
            proposalRow(2, "balancer_dao", "2026-09-20T00:00:00Z"),
          ])
    );

    const report = await buildGovernanceReport();
    const fromTable = report.cohort.reduce((sum, space) => sum + space.recent, 0);

    expect(report.recentCount).toBe(fromTable);
    expect(report.recentCount).toBe(2);
    expect(report.recent).toHaveLength(2);
  });

  it("caps the rows it renders and keeps the newest", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    const many = Array.from({ length: RECENT_LIMIT + 10 }, (_, i) =>
      proposalRow(i, "balancer_dao", `2026-09-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`)
    );
    // Days repeat across 35 rows, so the titles must not — see `proposalRow`.
    await mockApi((url) =>
      url.includes("/items/forum/") ? { total: 2411 } : page(many)
    );

    const report = await buildGovernanceReport();
    expect(report.recent).toHaveLength(RECENT_LIMIT);
    expect(report.recentCount).toBe(RECENT_LIMIT + 10);
    expect(report.recent[0].startsAt > report.recent[1].startsAt).toBe(true);
  });

  /*
   * The forum figure is API-counted from one request, which is the other half of
   * `thisWeek.ts`'s rule: it is a standalone number with no rows beneath it to
   * disagree with. A failed feed is null and the page drops the paragraph rather
   * than printing a zero that reads as "nobody is talking".
   */
  it("counts the forum in one request and degrades to null", async () => {
    freeze("2026-09-30T06:00:00Z");
    const { buildGovernanceReport } = await import("../server/governance");
    const seen = await mockApi((url) =>
      url.includes("/items/forum/") ? null : page([proposalRow(1)])
    );

    const report = await buildGovernanceReport();

    const forumCalls = seen.filter((u) => u.includes("/items/forum/"));
    expect(forumCalls).toHaveLength(1);
    expect(forumCalls[0]).toContain("period=3");
    expect(forumCalls[0]).toContain("limit=1");
    expect(report.forumQuarter).toBeNull();
  });
});
