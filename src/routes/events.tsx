import { createFileRoute } from "@tanstack/react-router";
import EventsPage from "../pages/events";
import type { CalendarEvent, EventsCalendar } from "../server/events";
import { getEventsCalendar } from "../server/events";
import { JSONLD_LIMIT, eventTypeLabel } from "../data/eventTypes.js";
import { canonicalFor, seoHead } from "../seo/head";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/events` — the crypto events calendar (content doc B4).
 *
 * B4's argument for this page is link acquisition rather than traffic alone:
 * conference organisers, city guides and community newsletters link *out* to
 * calendars as a matter of course, and the incumbent SERP is hand-maintained
 * listicles that go stale the day after publication. 1,029 indexed upcoming
 * events beats all of them on coverage without anyone editing a list.
 *
 * WHAT THIS PAGE CANNOT DO YET
 *
 * The records carry no `url`, so the calendar lists events it cannot link to.
 * That weakens the very dynamic B4 is built on — an organiser has less reason
 * to link to a listing that does not link back — and it is the single highest
 * -value field to add upstream. It does not block the page: Google's Event rich
 * results require `name`, `startDate` and a `location` carrying an `address`,
 * all of which are emitted below; `url` is recommended rather than required.
 */
export const Route = createFileRoute("/events")({
  loader: async () => {
    const calendar = await getEventsCalendar();

    const declared = indexStateFor("/events");
    /*
     * The gate demotes, never promotes — the same rule as the digest tier. An
     * empty calendar during a feed outage is a page that says nothing is
     * happening in crypto, which is both false and exactly the kind of indexed
     * thin page a removal request exists for.
     */
    const state = calendar.thin ? "substrate" : declared;
    setRobotsHeader(robotsHeader(state));

    return { calendar, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head runs before the loader resolves. Claim no count we have not read.
      return seoHead({
        index: false,
        title: "Crypto events calendar — Alphaday",
        description:
          "Upcoming crypto conferences, hackathons and meetups, indexed continuously.",
      });
    }

    const { calendar, indexable } = loaderData;
    /*
     * The same "+" the page shows. A description that prints an exact number
     * the page hedges is the two disagreeing in the one place a SERP quotes.
     */
    const approximate = calendar.truncated || calendar.partial;
    const count = `${calendar.upcomingTotal.toLocaleString("en-GB")}${approximate ? "+" : ""}`;
    const canonical = canonicalFor("/events");

    /*
     * The year is in the title on purpose. `crypto conferences 2026` and its
     * per-city variants are the seasonal queries B4 targets, and the SERP resets
     * every January — which is the incumbents' problem and not this page's,
     * since the year here is derived from the data rather than typed into a
     * headline someone has to remember to rewrite.
     */
    const year = new Date(calendar.asOf).getUTCFullYear();
    const title = `Crypto events calendar ${year} — conferences, hackathons and meetups | Alphaday`;
    const description =
      `${count} upcoming crypto events: conferences, hackathons, meetups and ` +
      `side events with dates and locations, indexed continuously from the ` +
      `Alphaday API rather than hand-maintained. Free, no signup.`;

    return indexable
      ? seoHead({
          index: true,
          canonical,
          title,
          description,
          jsonLd: buildJsonLd(calendar, canonical),
        })
      : seoHead({ index: false, title, description });
  },

  component: EventsRoute,
});

function EventsRoute() {
  const { calendar } = Route.useLoaderData();
  return <EventsPage calendar={calendar} />;
}

/**
 * `ItemList` of `Event`, not a single `Event`.
 *
 * The page is a listing and marking it as one `Event` would claim the whole
 * calendar is a thing happening on one date. `CollectionPage` was the other
 * candidate and is weaker here: the events themselves are what can earn a rich
 * result, so they have to be the marked-up objects.
 *
 * **Only rows with a location are included.** Google requires `name`,
 * `startDate`, and a `location` carrying an `address` — a `Place` with only a
 * name does not validate. Emitting the ~1% of rows that have no location would
 * publish markup that fails for no gain, so those render on the page and stay
 * out of the graph. Nothing is invented to fill the field.
 */
function buildJsonLd(calendar: EventsCalendar, canonical: string) {
  const listed = calendar.events
    .filter(
      (event): event is CalendarEvent & { location: string } =>
        typeof event.location === "string" && event.location.length > 0
    )
    .slice(0, JSONLD_LIMIT);

  return {
    "@type": "ItemList",
    "@id": `${canonical}#upcoming`,
    name: "Upcoming crypto events",
    numberOfItems: listed.length,
    itemListElement: listed.map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Event",
        name: event.title,
        startDate: event.startsAt,
        ...(event.endsAt ? { endDate: event.endsAt } : {}),
        eventStatus: "https://schema.org/EventScheduled",
        /*
         * `address` as well as `name`. Google requires an address on a `Place`,
         * and a Place carrying only a name fails validation — the rows hold one
         * free-text string ("Lisbon, Portugal"), so it serves as both rather
         * than being split into parts that would have to be guessed.
         */
        location: {
          "@type": "Place",
          name: event.location,
          address: event.location,
        },
        /*
         * Most rows carry no type — `Co` is unlabelled because it means nothing
         * — so this falls back rather than printing "null in Seoul".
         */
        description: `${eventTypeLabel(event.type) ?? "Crypto event"} in ${event.location}.`,
      },
    })),
  };
}
