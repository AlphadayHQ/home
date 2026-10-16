import React from "react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { formatShare, narrativePath, paceOf, shareOf } from "../data/narratives";

/**
 * The narrative hub (content doc B3).
 *
 * The topics crypto media is covering now, from `/keywords/trending/`, plus
 * every topic that has a written page even after it cools. Each row is the
 * attention behind the topic: articles this week, its share of all news indexed,
 * and its pace against its own 30-day average. Attention, not price.
 *
 * Written pages are marked, not separated: a reader scanning "what is everyone
 * talking about" wants one list, and the mark tells them which rows have more
 * than numbers behind them.
 */

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const n = (value) => (value === null ? "–" : value.toLocaleString("en-GB"));

const percent = (value) => (value === null ? "–" : formatShare(value));

const pace = (value) => (value === null ? "–" : `${value.toFixed(1)}×`);

const NarrativesPage = ({ hub }) => {
  const { rows, trendingOk, written, asOf } = hub;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="mb-3.5 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted">
            Research
          </p>

          <h1 className="max-w-[20ch] font-display text-[clamp(34px,6vw,62px)] font-medium leading-[1.02] tracking-tight text-text">
            What crypto media is talking about.
          </h1>

          <p className="mt-5 max-w-160 text-[18px] text-text-muted">
            The topics trending in crypto news right now, with the coverage
            behind each one.{" "}
            {written > 0 && (
              <>
                <span className="font-medium text-text">
                  {n(written)} {written === 1 ? "topic has" : "topics have"}
                </span>{" "}
                a researched write-up of what is driving it.
              </>
            )}
          </p>

          {!trendingOk && (
            <p className="mt-4 max-w-160 text-[15px] text-text-muted">
              The trending list could not be read just now, so only the topics
              with a write-up are shown.
            </p>
          )}
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-14">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-surface-border text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
                  <th className="py-3 pr-4 font-medium">Topic</th>
                  <th className="py-3 pr-4 text-right font-medium">Articles, 7 days</th>
                  <th className="py-3 pr-4 text-right font-medium">Share of news</th>
                  <th className="py-3 text-right font-medium">Pace vs 30 days</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.slug} className="border-b border-surface-border">
                    <td className="py-3.5 pr-4">
                      <a
                        href={narrativePath(row.slug)}
                        className="text-[17px] font-medium text-text underline decoration-surface-border underline-offset-4 transition-colors hover:decoration-text"
                      >
                        {row.name}
                      </a>
                      {row.post && (
                        <span className="ml-2.5 text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
                          Written up
                        </span>
                      )}
                      {row.trendiness === null && (
                        <span className="ml-2.5 text-[12px] text-text-muted">
                          not trending today
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono text-[14px] tabular-nums text-text">
                      {n(row.attention.news7)}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono text-[14px] tabular-nums text-text">
                      {percent(shareOf(row.attention))}
                    </td>
                    <td className="py-3.5 text-right font-mono text-[14px] tabular-nums text-text">
                      {pace(paceOf(row.attention))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 max-w-160 text-[13px] text-text-muted">
            Trending topics are scored every six hours from the latest crypto
            headlines. Counts are articles in Alphaday&rsquo;s news index that
            match the topic&rsquo;s keywords, the same matching that scores it,
            so a passing mention counts; share is of every article in the
            index, general outlets included. Each topic&rsquo;s page adds
            podcasts and video. Pace
            compares this week&rsquo;s daily rate with the 30-day average, so
            2.0× is twice the usual coverage; it is left blank for topics with
            too little coverage for a ratio to mean anything. Of the topics no
            longer trending, the ten most recently updated are counted. Updated{" "}
            {DATE.format(new Date(asOf))}.
          </p>

          <p className="mt-8 text-[16px]">
            <a
              href={`${CONFIG.api}/data/keywords`}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
            >
              Query trending keywords yourself — free, no signup
            </a>
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default NarrativesPage;
