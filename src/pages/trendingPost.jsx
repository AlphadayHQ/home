import React from "react";
import { ArrowLeft } from "lucide-react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { TRENDING_HUB, trendingPostPath } from "../data/trending";
import { readingMinutes } from "../data/analysis";
import { LINK, PostBlocks, SourcesRead } from "../components/PostBody";
import Pager, { pagedHref } from "../components/Pager";

/**
 * One trending topic (content doc B3).
 *
 * A stream, newest first: each update as its own dated section, then the
 * original page as the background they build on. The excerpt under the title
 * is the newest update's, so the top of the page always says why the topic is
 * in the news now. Older updates are paged; the original stays on the first
 * page, where a reader arriving from search lands.
 */

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A date if the string is one, else nothing: a bad date must not fail the page. */
const formatDate = (iso) => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : DATE.format(new Date(time));
};

const Dated = ({ iso }) =>
  formatDate(iso) && (
    <time dateTime={iso} className="font-mono text-[13px] tabular-nums text-text-muted">
      {formatDate(iso)}
    </time>
  );

const TrendingArticlePage = ({ article }) => {
  const { post, updates, updateCount, latest, lead, page, pages, others } = article;
  // Only what this page shows: later pages do not carry the original's body.
  const sources = [
    ...new Set([
      ...updates.flatMap((update) => update.sourcesRead),
      ...(post.blocks ? post.sourcesRead : []),
    ]),
  ];

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <a
            href={TRENDING_HUB}
            className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Trending in crypto
          </a>

          <h1 className="max-w-[24ch] font-display text-[clamp(30px,4.6vw,50px)] font-medium leading-[1.05] tracking-tight text-text">
            {post.title}
          </h1>

          {(lead.excerpt || post.excerpt) && (
            <p className="mt-5 max-w-160 text-[19px] leading-relaxed text-text-muted">
              {lead.excerpt || post.excerpt}
            </p>
          )}

          <p className="mt-5 font-mono text-[13px] tabular-nums text-text-muted">
            {formatDate(latest) && `Updated ${formatDate(latest)}`}
            {updateCount > 0 && ` · ${updateCount} ${updateCount === 1 ? "update" : "updates"}`}
            {page > 1 && ` · earlier updates, page ${page} of ${pages}`}
          </p>
        </div>
      </Section>

      {updates.map((update) => (
        <Section key={update.slug} className="bg-background">
          <article className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-8 pb-10">
            <Dated iso={update.publishedAt} />
            <h2 className="mt-2 max-w-160 font-display text-[clamp(24px,3vw,30px)] font-medium tracking-tight text-text">
              {update.title}
            </h2>
            <PostBlocks blocks={update.blocks} />
          </article>
        </Section>
      ))}

      {post.blocks && (
        <Section className="bg-background">
          <article className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-8 pb-10">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
              {updateCount > 0 ? "Background" : "Analysis"}
              <span className="ml-3 font-normal normal-case tracking-normal text-text-muted/70">
                {readingMinutes(post.blocks)} min read
                {formatDate(post.publishedAt) && ` · first published ${formatDate(post.publishedAt)}`}
              </span>
            </h2>
            <PostBlocks blocks={post.blocks} />
          </article>
        </Section>
      )}

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pb-14">
          <Pager
            page={page}
            pages={pages}
            hrefFor={(n) => pagedHref(trendingPostPath(post.slug), n)}
            newer="Newer updates"
            older="Earlier updates"
          />
          <SourcesRead urls={sources} />
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-24">
          {others.length > 0 && (
            <>
              <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
                Other topics
              </h2>
              <ul className="mt-5 flex flex-col gap-2.5">
                {others.map((other) => (
                  <li key={other.slug} className="max-w-160 text-[16px]">
                    <a href={trendingPostPath(other.slug)} className={`font-medium text-text ${LINK}`}>
                      {other.topic}
                    </a>{" "}
                    {formatDate(other.latest) && (
                      <span className="whitespace-nowrap font-mono text-[13px] text-text-muted">
                        {formatDate(other.latest)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-8 text-[16px]">
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

export default TrendingArticlePage;
