import React from "react";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import {
  WINDOWS,
  WINDOW_LABEL,
  UPCOMING_LABEL,
  DENSITY_FLOOR,
  itemsWithin,
} from "../data/digestWindow";

/**
 * `/projects/{entity}/this-week` — the rolling evidence panel (content doc C3).
 *
 * WHAT THIS PAGE IS NOT
 *
 * It is not *"why is bitcoin up today"*. That was the earlier proposal and SERP
 * research killed it: CoinMarketCap's CMC AI has shipped pre-generated causal
 * price analysis across every major token since May 2025, on far more authority.
 * Competing there means out-resourcing a better-funded version of the same idea.
 *
 * The recap framing wins on every axis that matters here. It makes **no causal
 * claim**, so there is no YMYL exposure and nothing to be publicly wrong about.
 * It is **honestly what the data is** — a digest of indexed items in a window,
 * rather than interpretation dressed as fact. And it is **LLM-query shaped**:
 * "what's been happening with Bitcoin this week" is far closer to what someone
 * types into ChatGPT than into Google, which is why this is an AEO play first.
 *
 * WHY THE WINDOW IS STATED AND THE RENDER TIME IS NOT
 *
 * C3 separates three timestamps and permits two. The **data window** is what the
 * reader needs and it leads the page. **Last regeneration** belongs in
 * `dateModified`, set from the freshest row rather than from the clock. **Render
 * time** is meaningless and appears nowhere. A page that always says "updated
 * today" regardless of whether anything changed is the visible form of the
 * `lastmod`-on-every-build problem, and it teaches readers not to believe the
 * page — the reader-trust cost is the same whether or not Google notices.
 *
 * WHY STALENESS IS PRINTED INSTEAD OF SMOOTHED
 *
 * When a feed's newest row lags the window end, the page says so, per feed. The
 * alternative — showing the count and letting the reader assume currency — is
 * the exact trust failure above. On a rolling window this resolves itself
 * honestly: a busy feed updates most days, a thin one rarely, and the difference
 * is itself a useful signal.
 */

const MAX_ROWS = 6;

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const fmtTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/*
 * Every date is formatted in UTC on purpose.
 *
 * The window end is server-computed and the item timestamps are server-rendered,
 * so formatting in the viewer's zone would make the HTML that React produces on
 * hydration differ from the HTML the server sent for any reader outside UTC —
 * a hydration mismatch that React resolves by silently re-rendering, and which
 * would also mean the crawler and the reader see different dates on the same
 * page. UTC is also what the API returns, so it is the honest label.
 */
const onDay = (iso) => fmt.format(new Date(iso));
const atMinute = (iso) => `${fmtTime.format(new Date(iso))} UTC`;

const plural = (n, [one, many], atLeast = false) =>
  `${n.toLocaleString("en-GB")}${atLeast ? "+" : ""} ${n === 1 && !atLeast ? one : many}`;

const lagInDays = (from, to) =>
  Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

const ThisWeekPage = ({ digest, entity }) => {
  const [window, setWindow] = React.useState(digest.defaultWindow);

  const total = digest.totals[window];
  const landingPage = `/projects/${entity.slug}`;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary mb-3.5">
            {entity.name} · rolling digest
          </p>

          {/*
           * The h1 is conversational because that is the query shape this page
           * targets, and C3 is explicit about the trade-off: as an exact Google
           * string it is low-volume phrasing, so the *page* is named tightly in
           * the title tag while the h1 stays in the reader's words.
           */}
          <h1 className="font-display text-[clamp(34px,6vw,62px)] leading-[1.02] font-extrabold tracking-tight text-text max-w-[20ch]">
            What&rsquo;s been happening with {entity.name}
          </h1>

          <p className="text-text-muted text-[18px] max-w-160 mt-5">
            Everything Alphaday indexed about {entity.name} in the last{" "}
            {WINDOW_LABEL[window]} — news, project blogs, podcasts, video and
            governance — plus what is scheduled for the{" "}
            {UPCOMING_LABEL[window]}.{" "}
            <span className="text-text font-semibold">
              {plural(total, ["item", "items"])}.
            </span>
          </p>

          {/*
           * The data window, not the render time. This is the prominent
           * timestamp C3 asks for, and it is the only one on the page.
           */}
          <p className="font-mono text-[13px] text-text-muted mt-4">
            {WINDOW_LABEL[window]} to {atMinute(digest.asOf)}
          </p>

          <WindowPicker active={window} onChange={setWindow} digest={digest} />

          {digest.widened && (
            <p className="text-[13.5px] text-text-muted mt-5 border-l-2 border-primary/40 pl-4 max-w-160">
              The last seven days held fewer than {DENSITY_FLOOR} items, so this page has
              widened to a 30-day window rather than show you an empty one.
            </p>
          )}
        </div>
      </Section>

      {digest.stale.length > 0 && (
        <Section className="bg-background">
          <div className="mx-auto w-11/12 max-w-5xl">
            <StaleNotice stale={digest.stale} asOf={digest.asOf} />
          </div>
        </Section>
      )}

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-8 pb-4 grid gap-4 md:grid-cols-2">
          {digest.sections
            .filter(
              (section) =>
                section.unavailable || (section.counts[window] ?? 0) > 0
            )
            .map((section) => (
              <FeedCard
                key={section.kind}
                section={section}
                window={window}
                asOf={digest.asOf}
              />
            ))}
        </div>
      </Section>

      {/*
       * The durable context C3 asks for: what lets the page rank when the window
       * is quiet, and what turns a reader into the person the dashboard is for.
       * This is also the funnel C3 specifies — the digest is top of funnel and
       * hands off to the landing page, which sells the dashboard. A recap panel
       * on the landing page itself would have cannibalised its own CTA.
       */}
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-10 pb-24 border-t border-surface-border">
          <div className="grid md:grid-cols-[1.4fr_1fr] gap-10">
            <div>
              <h2 className="font-display text-[26px] font-extrabold text-text leading-tight">
                Where this comes from
              </h2>
              <p className="text-text-muted text-[15px] leading-relaxed mt-3.5 max-w-prose">
                Every row above is a record in the Alphaday index — the same
                corpus the free API and MCP server read. News comes from 49
                outlets, deduped and tagged; podcasts, video and project blogs
                are indexed the same way; governance covers forum posts and DAO
                proposals. Nothing here is written by us, and nothing is
                summarised: the digest is a query, and this page shows you what
                it returned.
              </p>
              <p className="text-text-muted text-[15px] leading-relaxed mt-3.5 max-w-prose">
                The window rolls. There is no weekly archive and no dated URL —
                this address always holds the current window, which is why it is
                worth bookmarking and why it accumulates rather than sheds
                authority.
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-[14px]">
                <a
                  href={CONFIG.api}
                  className="text-primary hover:underline inline-flex items-center gap-1.5"
                >
                  Query it yourself <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <a
                  href="/api/data/news"
                  className="text-text-muted hover:text-primary transition-colors"
                >
                  News capability
                </a>
                <a
                  href={CONFIG.mcp}
                  className="text-text-muted hover:text-primary transition-colors"
                >
                  MCP server
                </a>
              </div>
            </div>

            <aside className="bg-surface-light border border-surface-border rounded-[12px] px-6 py-5.5 self-start">
              <h2 className="text-[17px] font-extrabold text-text leading-snug">
                Want this continuously?
              </h2>
              <p className="text-[14px] text-text-muted leading-relaxed mt-2.5">
                The {entity.name} dashboard is this digest as a live board —
                the same feeds, updating, with the widgets you pick.
              </p>
              <a
                href={landingPage}
                className="inline-flex items-center gap-2 mt-4 text-[14px] font-bold text-primary hover:underline"
              >
                See the {entity.name} dashboard
                <ArrowRight className="w-4 h-4" />
              </a>
            </aside>
          </div>
        </div>
      </Section>
    </Layout>
  );
};

/**
 * 24h / 7d / 30d as views over one URL.
 *
 * Buttons, not links: C3's spec table calls for an in-page control that does not
 * change the URL, because three URLs per entity would be the dated-archive
 * problem at smaller scale. The data for all three windows is already in the
 * HTML, so switching costs no request — and a window with nothing in it is
 * disabled rather than hidden, which answers "was it quiet or is it broken".
 */
const WindowPicker = ({ active, onChange, digest }) => (
  <div
    className="flex items-center gap-1.5 mt-6"
    role="group"
    aria-label="Digest window"
  >
    {WINDOWS.map((w) => {
      const empty = digest.totals[w] === 0;
      return (
        <button
          key={w}
          type="button"
          disabled={empty}
          aria-pressed={active === w}
          onClick={() => onChange(w)}
          className={`px-3.5 py-1.5 rounded-[8px] text-[13px] font-bold border transition-colors ${
            active === w
              ? "bg-primary text-background border-primary"
              : empty
                ? "bg-transparent text-text-muted/40 border-surface-border cursor-not-allowed"
                : "bg-transparent text-text-muted border-surface-border hover:border-primary/50 hover:text-text"
          }`}
        >
          {WINDOW_LABEL[w]}
          <span className="font-mono font-normal ml-1.5 opacity-70">
            {digest.totals[w].toLocaleString("en-GB")}
          </span>
        </button>
      );
    })}
  </div>
);

const StaleNotice = ({ stale, asOf }) => (
  <div className="border border-surface-border bg-surface rounded-[12px] px-5 py-4">
    <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-text-muted">
      Feed freshness
    </p>
    <ul className="mt-2.5 space-y-1">
      {stale.map((feed) => {
        const days = lagInDays(feed.newestAt, asOf);
        return (
          <li key={feed.kind} className="text-[14px] text-text-muted">
            <span className="text-text font-semibold">{feed.label}</span> has
            nothing newer than {onDay(feed.newestAt)}
            {days >= 1 && ` — ${plural(days, ["day", "days"])} before the window closes`}
            . Counts below still include everything indexed in the window.
          </li>
        );
      })}
    </ul>
  </div>
);

const FeedCard = ({ section, window, asOf }) => {
  const rows = itemsWithin(section, asOf, window).slice(0, MAX_ROWS);
  const count = section.counts[window];

  /*
   * `null` means the count could not be established, which is not the same as
   * zero. An em dash says "unknown"; a `0` would claim the window was quiet on
   * the strength of a failed request.
   */
  const headline =
    section.unavailable || count === null
      ? "\u2014"
      : /*
         * `+` when the fetch behind a locally-counted section did not complete:
         * the count is then a floor, and printing it bare would present a floor
         * as a total. The same suffix appears in the "Showing 6 of 43+" line.
         */
        plural(count, section.noun, section.partial === true);

  return (
    <div className="bg-surface-light border border-surface-border rounded-[12px] px-6 py-5.5 flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[17px] font-extrabold text-text">{section.label}</h2>
        <p className="font-mono text-[13px] text-primary whitespace-nowrap">
          {headline}
        </p>
      </div>

      {section.unavailable ? (
        <p className="text-[14px] text-text-muted mt-3">
          This feed did not respond. That is a fetch failure, not a quiet
          window &mdash; treat the absence as unknown rather than as zero.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-[14px] text-text-muted mt-3">
          {section.upcoming
            ? `Nothing scheduled in the ${UPCOMING_LABEL[window]}.`
            : "Nothing in this window."}
        </p>
      ) : (
        <ul className="mt-3.5 space-y-3 grow">
          {rows.map((item) => (
            <li key={item.id} className="leading-snug">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener nofollow"
                  className="group text-[14.5px] text-text hover:text-primary transition-colors inline-flex gap-1.5"
                >
                  <span>{item.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 mt-1 opacity-0 group-hover:opacity-70 transition-opacity" />
                </a>
              ) : (
                <span className="text-[14.5px] text-text">{item.title}</span>
              )}
              <p className="text-[12.5px] text-text-muted mt-0.5 flex items-center gap-x-2 flex-wrap">
                {item.source && <span>{item.source}</span>}
                {item.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </span>
                )}
                <span className="font-mono opacity-80">{atMinute(item.at)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      {!section.unavailable && count !== null && count > rows.length && (
        <p className="text-[12.5px] text-text-muted mt-4">
          Showing {rows.length} of {count.toLocaleString("en-GB")}
          {section.partial ? "+" : ""}.
        </p>
      )}
    </div>
  );
};

export default ThisWeekPage;
