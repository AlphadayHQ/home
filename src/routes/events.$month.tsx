import { createFileRoute, notFound } from "@tanstack/react-router";
import EventsPage from "../pages/events";
import { getMonthCalendar } from "../server/events";
import { monthIndexState, monthOf, parseMonthSlug } from "../data/eventMonths.js";
import { eventsHead } from "../seo/eventsHead";
import { isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/events/{month}-{year}` — one month of the calendar.
 *
 * WHY A BAD SLUG AND AN EMPTY MONTH BOTH 404
 *
 * This route reads a URL segment, so whatever it accepts becomes a page.
 * `parseMonthSlug` refuses anything that is not a real month name and a
 * plausible year, which keeps `/events/octobr-2026` and `/events/october-12345`
 * from resolving. A month that parses but holds nothing 404s too: rendering an
 * empty calendar at 200 is a soft 404, and the pre-cutover site had 24 of those
 * in Search Console — the exact failure this tier should not reintroduce.
 *
 * WHY MOST OF THESE ARE NOT INDEXED
 *
 * The current month is the exception that stays indexable. It renders the same
 * content as `/events` and points its canonical there, and pairing a cross-URL
 * canonical with `noindex` is the documented way to get both ignored — Google
 * may carry the `noindex` to the canonical target. Consolidation is the job
 * here, not removal, so the canonical does it alone and the month is left out
 * of the sitemap instead.
 *
 * `monthIndexState` promotes a month only when it is current-or-future and
 * carries real volume. A past month is an archive: accurate, permanently stale,
 * and asked about by nobody once it has gone. A thin future month is the other
 * failure — eleven of the fifteen months in the corpus hold between one and
 * twelve events, and promoting those would publish eleven near-empty pages
 * competing with the hub for one query. Both stay reachable by paging; neither
 * is submitted.
 */
export const Route = createFileRoute("/events/$month")({
  loader: async ({ params }) => {
    const month = parseMonthSlug(params.month);
    if (!month) throw notFound();

    const calendar = await getMonthCalendar({ data: month });
    if (calendar.total === 0) throw notFound();

    const currentMonth = monthOf(new Date(calendar.asOf));
    const state = monthIndexState(month, calendar.total, currentMonth);
    setRobotsHeader(robotsHeader(state));

    return { calendar, currentMonth, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Crypto events calendar — Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const { calendar, currentMonth, indexable } = loaderData;
    return eventsHead({ calendar, currentMonth, indexable, isHub: false });
  },

  component: EventsMonth,
});

function EventsMonth() {
  const { calendar, currentMonth } = Route.useLoaderData();
  return (
    <EventsPage calendar={calendar} currentMonth={currentMonth} isHub={false} />
  );
}
