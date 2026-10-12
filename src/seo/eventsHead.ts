import type { CalendarEvent, MonthCalendar } from "../server/events";
import { eventTypeLabel, JSONLD_LIMIT } from "../data/eventTypes.js";
import { headline, monthLabel, monthSlug } from "../data/eventMonths.js";
import { canonicalFor, seoHead } from "./head";

/**
 * Head and structured data for both events routes (content doc B4).
 *
 * Shared because the hub and the month pages are the same page with a different
 * month, and two copies of a canonical rule is exactly the drift `indexState.ts`
 * exists to prevent — here with a sharper edge, since the two routes can render
 * *the same month* and must not both claim it.
 */

/**
 * `/events` is the canonical home of the current month.
 *
 * `/events/september-2026` renders identical content while September is
 * current, so it points here rather than competing. Without this the tier ships
 * with a guaranteed duplicate — the one failure mode §5.1 spends its length on
 * — and it would resolve itself only when the month turned.
 */
export const canonicalForMonth = (month: string, currentMonth: string) =>
  month === currentMonth
    ? canonicalFor("/events")
    : canonicalFor(`/events/${monthSlug(month)}`);

export function eventsHead({
  calendar,
  currentMonth,
  indexable,
  isHub,
}: {
  calendar: MonthCalendar;
  currentMonth: string;
  indexable: boolean;
  isHub: boolean;
}) {
  const label = monthLabel(calendar.month);
  const canonical = canonicalForMonth(calendar.month, currentMonth);

  /*
   * The same count *and the same word* the page prints in its opening
   * sentence, from the same function — see `headline`. A description promising
   * 734 events above a list of 174 is the count-and-rows drift `thisWeek.ts`
   * names, arrived at through the one sentence a SERP actually shows; calling
   * them "upcoming" when a third of them started last week is the same drift
   * in the adjective.
   */
  const { count, noun } = headline(calendar);
  const lead =
    `${count.toLocaleString("en-GB")}${calendar.partial ? "+" : ""} crypto ` +
    `event${count === 1 ? "" : "s"}` +
    `${noun === "remaining" ? " remaining" : ""} in ${label}`;

  /*
   * The month is in the title of every page including the hub, because it is
   * the half of the query that varies — "crypto conferences october 2026" — and
   * because a hub whose title never changes gives a reader no way to tell, from
   * a results page, which month they are about to land on.
   */
  const title = isHub
    ? `Crypto events calendar — ${label} conferences, hackathons and meetups | Alphaday`
    : `Crypto events in ${label} — conferences, hackathons and meetups | Alphaday`;

  const description =
    `${lead}: conferences, hackathons, meetups and side events with dates and ` +
    `locations, indexed continuously from the Alphaday API rather than ` +
    `hand-maintained. Free, no signup.`;

  if (!indexable) return seoHead({ index: false, title, description });

  const jsonLd = buildJsonLd(calendar, canonical, label);
  return seoHead({
    index: true,
    canonical,
    title,
    description,
    ...(jsonLd ? { jsonLd } : {}),
  });
}

/**
 * `ItemList` of `Event`, not a single `Event`.
 *
 * The page is a listing; marking it as one `Event` would claim the whole month
 * happens on one date.
 *
 * **Only upcoming rows, and only rows with a location.** Every item carries
 * `eventStatus: EventScheduled`, which is a claim about an event that has not
 * happened yet — emitting it for the finished half of the current month would
 * describe last week's conference as scheduled. And Google requires `name`,
 * `startDate`, and a `location` carrying an `address`: a `Place` with only a
 * name does not validate, so the ~1% of rows with no location render on the
 * page and stay out of the graph rather than being given an invented one.
 *
 * Returns null when nothing qualifies, so the page emits no empty `ItemList`.
 */
function buildJsonLd(calendar: MonthCalendar, canonical: string, label: string) {
  const listed = calendar.upcoming
    .filter(
      (event): event is CalendarEvent & { location: string } =>
        typeof event.location === "string" && event.location.length > 0
    )
    .slice(0, JSONLD_LIMIT);

  if (listed.length === 0) return null;

  return {
    "@type": "ItemList",
    "@id": `${canonical}#events`,
    name: `Crypto events in ${label}`,
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
        location: {
          "@type": "Place",
          name: event.location,
          address: event.location,
        },
        description: `${eventTypeLabel(event.type) ?? "Crypto event"} in ${event.location}.`,
      },
    })),
  };
}
