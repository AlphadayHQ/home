import { createFileRoute } from "@tanstack/react-router";
import EventsPage from "../pages/events";
import { getCurrentMonth } from "../server/events";
import { monthOf } from "../data/eventMonths.js";
import { eventsHead } from "../seo/eventsHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/events` — the current month (content doc B4).
 *
 * B4's argument for this tier is link acquisition rather than traffic alone:
 * conference organisers, city guides and community newsletters link out to
 * calendars as a matter of course, and the incumbent SERP is hand-maintained
 * listicles that go stale the day after publication.
 *
 * This route is the calendar's front door and stays promoted. Only a genuinely
 * empty month demotes it — a feed outage, not a quiet season — because an
 * indexed page saying nothing is happening in crypto is both false and the kind
 * of thing a removal request exists for.
 */
export const Route = createFileRoute("/events/")({
  loader: async () => {
    const calendar = await getCurrentMonth();
    const currentMonth = monthOf(new Date(calendar.asOf));

    const state = calendar.total === 0 ? "substrate" : indexStateFor("/events");
    setRobotsHeader(robotsHeader(state));

    return { calendar, currentMonth, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head runs before the loader resolves. Claim no count we have not read.
      return {
        meta: [
          { title: "Crypto events calendar — Alphaday" },
          {
            name: "description",
            content:
              "Upcoming crypto conferences, hackathons and meetups, indexed continuously.",
          },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    const { calendar, currentMonth, indexable } = loaderData;
    return eventsHead({ calendar, currentMonth, indexable, isHub: true });
  },

  component: EventsHub,
});

function EventsHub() {
  const { calendar, currentMonth } = Route.useLoaderData();
  return <EventsPage calendar={calendar} currentMonth={currentMonth} isHub />;
}
