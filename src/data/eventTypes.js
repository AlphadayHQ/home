/**
 * The `item_type` vocabulary on `/items/events/` (content doc B4).
 *
 * **These labels are inferred, not documented.** The OpenAPI spec describes the
 * parameter only as "Event type (case-insensitive)" and lists no enum, so the
 * mapping below was derived on 2026-09-29 by sampling titles per code against
 * the live API:
 *
 * | code | rows  | sampled titles that fixed the label            |
 * | ---- | ----: | ---------------------------------------------- |
 * | `Co` | 3,878 | NFT NYC, ETHSeattle, Offscript                 |
 * | `MU` | 1,927 | Calgary NFT Gathering #9, [DevConnect] Defi Day|
 * | `PY` |   419 | Connect Night, Crypto Friday @ The Block Lisboa|
 * | `EDU`|   259 | Decentraland Developer Workshop, TDD Code Session |
 * | `Hk` |   206 | ETHNewYork, HackFS, ETHMexicoCity              |
 * | `CC` |    73 | Indexer Office Hours, "Ethereum Merge Is Here!"|
 * | `WK` |    11 | Smart Contracts: From Zero to Hero             |
 * | `DC` |     4 | TechNERD Sync                                  |
 * | `PR` |     3 | "test087", LAUNCH!! Countdown to Boson v2      |
 *
 * Three of these are deliberately not given a label. `CC` and `DC` read as
 * recurring calls rather than events anyone travels to, and `PR` is three rows
 * one of which is literally `test087`. Guessing a pretty name for a code this
 * thin would put an invented category in front of readers. `Co` is left out for
 * the opposite reason — it is too common to mean anything — see the map below.
 */

/**
 * The documented placeholder. `capabilityPages.js` records it as "a placeholder
 * rather than a category — filter them out of anything user-facing", and this is
 * the user-facing thing.
 */
export const PLACEHOLDER_TYPE = "***";

export const EVENT_TYPE_LABELS = {
  MU: "Meetup",
  PY: "Social",
  Hk: "Hackathon",
  EDU: "Workshop",
  WK: "Workshop",
};

/**
 * **`Co` is deliberately absent, and it is the most common code by far.**
 *
 * It covers 3,878 of 6,934 rows — 73% of the upcoming calendar — which is what
 * gives it away: it is the bucket everything lands in, not a description of
 * anything. Rendering it as "Conference" put that word on *Stabull Dinner*,
 * *KBW Korean BBQ & DrinksQ*, and *Institutional Happy Hour with Hedera & TBV*,
 * all of which are `Co` upstream and none of which is a conference.
 *
 * The label was faithful to the API and wrong on the page, and it was wrong
 * loudly: a reader who sees a BBQ called a conference stops trusting the dates
 * too. The four codes left above are narrow enough to mean something, so they
 * are the only ones that speak.
 *
 * Returns `null` rather than a generic word. There is nothing useful to say
 * about an untyped row, and "Event" on an events calendar is noise.
 */
export const eventTypeLabel = (code) => EVENT_TYPE_LABELS[code] ?? null;

/**
 * A row is listable when it can carry its own weight on a public calendar: a
 * real category, a title, and a start. Everything else is dropped rather than
 * rendered as a blank cell.
 */
export const isListableType = (code) =>
  typeof code === "string" && code.length > 0 && code !== PLACEHOLDER_TYPE;

/**
 * How many events carry `Event` structured data.
 *
 * The page renders every row of the month; only the graph is capped, because it
 * is the expensive half (~260 bytes per event against ~90 in the row markup)
 * and the cheap half is the one with the value: a rich result for an event 18
 * months out is not a thing Google shows, whereas an organiser finding their
 * November listing is exactly B4's argument.
 *
 * It is a cap, not a size: a dense month runs well past it — October holds
 * about 700 upcoming events — and the graph describes the soonest 150 and
 * stops. Those are the right 150, being the rows a reader is about to act on
 * and the only ones an event rich result is plausibly shown for. What the
 * number does guarantee is the other end: a month that only just clears
 * `MONTH_INDEX_FLOOR` is described in full, so nothing is ever submitted with
 * a partial graph *because it is thin*.
 */
export const JSONLD_LIMIT = 150;
