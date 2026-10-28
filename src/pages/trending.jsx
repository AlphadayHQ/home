import React from "react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { TRENDING_HUB, trendingPostPath } from "../data/trending";
import { LINK } from "../components/PostBody";
import Pager, { pagedHref } from "../components/Pager";
import { shortDate } from "../components/dates";

/**
 * The trending hub (content doc B3).
 *
 * One row per topic with a written page, the most recently updated first. Each
 * row says what is happening now: the newest update's excerpt, else the page's,
 * so a topic that trended again last night does not lead with last month's
 * reason.
 */

const TrendingHubPage = ({ hub }) => {
  const { rows, total, page, pages } = hub;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="mb-3.5 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted">
            Research
          </p>

          <h1 className="max-w-[20ch] font-display text-[clamp(34px,6vw,62px)] font-medium leading-[1.02] tracking-tight text-text">
            Why crypto topics are trending.
          </h1>

          <p className="mt-5 max-w-160 text-[18px] text-text-muted">
            What is behind each topic trending in crypto news, researched from the original
            sources and updated each time it trends again.{" "}
            {total > 0 && (
              <span className="font-medium text-text">
                {total} {total === 1 ? "topic" : "topics"} so far.
              </span>
            )}
          </p>
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-24">
          {rows.length === 0 ? (
            <p className="max-w-160 text-[17px] text-text-muted">
              Nothing is written up yet. The first topics are being researched.
            </p>
          ) : (
            <ul className="border-t border-surface-border">
              {rows.map((row) => {
                const updated = shortDate(row.latest);
                return (
                  <li key={row.slug} className="border-b border-surface-border py-6">
                    <a
                      href={trendingPostPath(row.slug)}
                      className={`font-display text-[clamp(22px,3vw,28px)] font-medium tracking-tight text-text ${LINK}`}
                    >
                      {row.topic}
                    </a>
                    {row.lead && (
                      <p className="mt-2 max-w-160 text-[17px] leading-relaxed text-text-muted">
                        {row.lead}
                      </p>
                    )}
                    <p className="mt-2 text-[14px] tabular-nums text-text-muted">
                      {updated && `Updated ${updated}`}
                      {row.updates > 0 &&
                        ` · ${row.updates} ${row.updates === 1 ? "update" : "updates"}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}

          <Pager
            page={page}
            pages={pages}
            hrefFor={(n) => pagedHref(TRENDING_HUB, n)}
            newer="Recently updated"
            older="Earlier topics"
          />

          <p className="mt-10 text-[16px]">
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

export default TrendingHubPage;
