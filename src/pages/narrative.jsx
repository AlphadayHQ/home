import React from "react";
import { ArrowLeft } from "lucide-react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { formatShare, paceOf, shareOf } from "../data/narratives";
import { readingMinutes } from "../data/analysis";
import { Fact, LINK, PostBlocks, SourcesRead } from "../components/PostBody";

/**
 * One topic (content doc B3).
 *
 * The write-up when there is one, then the attention numbers, then this week's
 * headlines. The write-up is the reason the page is indexed; the numbers and
 * headlines are true without it, which is why a trending topic with nothing
 * written still renders (served `noindex`) for a reader arriving from the hub.
 *
 * Updates are folded into the post by a reviewer as dated sections, so the
 * page is one piece that grows rather than a stack of daily entries.
 */

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** A date if the string is one, else nothing: a bad date must not fail the page. */
const formatDate = (format, iso) => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : format.format(new Date(time));
};

const NarrativePageView = ({ page }) => {
  const { name, attention, headlines, post, asOf } = page;
  const share = shareOf(attention);
  const pace = paceOf(attention);

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <a
            href="/research/narratives"
            className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Crypto narratives
          </a>

          <h1 className="max-w-[24ch] font-display text-[clamp(30px,4.6vw,50px)] font-medium leading-[1.05] tracking-tight text-text">
            {post?.title ?? name}
          </h1>

          {post?.excerpt && (
            <p className="mt-5 max-w-160 text-[19px] leading-relaxed text-text-muted">
              {post.excerpt}
            </p>
          )}

          {/* Each fact is shown only when it was read; a "–" states nothing. */}
          <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
            {attention.news7 !== null && (
              <Fact mono label="Articles, 7 days">{attention.news7.toLocaleString("en-GB")}</Fact>
            )}
            {share !== null && (
              <Fact mono label="Share of all news">{formatShare(share)}</Fact>
            )}
            {pace !== null && <Fact mono label="Pace vs 30 days">{pace.toFixed(1)}×</Fact>}
            {attention.podcasts7 !== null && (
              <Fact mono label="Podcast episodes">{attention.podcasts7}</Fact>
            )}
            {attention.videos7 !== null && <Fact mono label="Videos">{attention.videos7}</Fact>}
          </dl>
        </div>
      </Section>

      {post && (
        <Section className="bg-background">
          <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-14">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
              Analysis
              <span className="ml-3 font-normal normal-case tracking-normal text-text-muted/70">
                {readingMinutes(post.blocks)} min read
                {formatDate(DATE, post.modified) && ` · updated ${formatDate(DATE, post.modified)}`}
              </span>
            </h2>

            <PostBlocks blocks={post.blocks} />
            <SourcesRead urls={post.sourcesRead} />
          </div>
        </Section>
      )}

      {headlines.length > 0 && (
        <Section className="bg-background">
          <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-14">
            <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
              This week&rsquo;s coverage
            </h2>
            <ul className="mt-6 border-t border-surface-border">
              {headlines.map((item) => (
                <li
                  key={item.url}
                  className="flex flex-col gap-1 border-b border-surface-border py-3.5 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <time
                    dateTime={item.publishedAt}
                    className="w-20 shrink-0 font-mono text-[13px] tabular-nums text-text-muted"
                  >
                    {formatDate(SHORT, item.publishedAt)}
                  </time>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex-1 text-[17px] font-medium leading-snug text-text ${LINK}`}
                  >
                    {item.title}
                  </a>
                  <span className="shrink-0 text-[13px] text-text-muted">{item.sourceName}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-24">
          <p className="max-w-160 text-[13px] text-text-muted">
            Counts are items in Alphaday&rsquo;s index of news outlets, podcasts
            and YouTube channels over the last 7 days that match {name}&rsquo;s
            keywords, the same matching that scores it as trending. A match is a
            mention, so an item that names {name} in passing counts. Share is of
            every article in the index, which carries general outlets as well as
            crypto ones. Pace compares this week&rsquo;s daily rate with the 30-day
            average. Updated {formatDate(DATE, asOf)}.
          </p>
          <p className="mt-6 text-[16px]">
            <a
              href={`${CONFIG.api}/data/news`}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
            >
              Query the news index yourself — free, no signup
            </a>
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default NarrativePageView;
