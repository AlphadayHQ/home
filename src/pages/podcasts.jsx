import React from "react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { PODCAST_HUB, latestAired, podcastPostPath, showsOf } from "../data/podcastPosts";
import { LINK } from "../components/PostBody";
import Pager, { pagedHref } from "../components/Pager";
import { shortDate } from "../components/dates";

/**
 * The podcast hub: one row per idea written up, the newest first. Each row
 * names the shows it was heard on and the day the newest of those episodes
 * aired, which is when the idea was said, not when the page was published.
 */

const PodcastHubPage = ({ hub }) => {
  const { rows, total, page, pages } = hub;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <p className="mb-3.5 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted">
            Research
          </p>

          <h1 className="max-w-[20ch] font-display text-[clamp(34px,6vw,62px)] font-medium leading-[1.02] tracking-tight text-text">
            What crypto podcasts are arguing.
          </h1>

          <p className="mt-5 max-w-160 text-[18px] text-text-muted">
            One idea per page from the crypto podcast circuit: who said it, on which episode and at
            what minute, and what the outside sources say about it.{" "}
            {total > 0 && (
              <span className="font-medium text-text">
                {total} {total === 1 ? "idea" : "ideas"} so far.
              </span>
            )}
          </p>
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-24">
          {rows.length === 0 ? (
            <p className="max-w-160 text-[17px] text-text-muted">
              Nothing is written up yet. The first episodes are being transcribed.
            </p>
          ) : (
            <ul className="border-t border-surface-border">
              {rows.map((row) => {
                const shows = showsOf(row.meta);
                const aired = shortDate(latestAired(row.meta));
                return (
                  <li key={row.slug} className="border-b border-surface-border py-6">
                    <a
                      href={podcastPostPath(row.slug)}
                      className={`font-display text-[clamp(22px,3vw,28px)] font-medium leading-[1.15] tracking-tight text-text ${LINK}`}
                    >
                      {row.title}
                    </a>
                    {row.excerpt && (
                      <p className="mt-2 max-w-160 text-[17px] leading-relaxed text-text-muted">
                        {row.excerpt}
                      </p>
                    )}
                    {(shows.length > 0 || aired) && (
                      <p className="mt-2 text-[14px] tabular-nums text-text-muted">
                        {shows.join(", ")}
                        {shows.length > 0 && aired && " · "}
                        {aired}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Pager
            page={page}
            pages={pages}
            hrefFor={(n) => pagedHref(PODCAST_HUB, n)}
            newer="Newer ideas"
            older="Earlier ideas"
          />

          <p className="mt-10 text-[16px]">
            <a
              href={`${CONFIG.api}/data/podcasts`}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
            >
              Query every crypto podcast episode yourself — free, no signup
            </a>
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default PodcastHubPage;
