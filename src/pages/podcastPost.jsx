import React from "react";
import { ArrowLeft } from "lucide-react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { API_COMMANDS, podcastEpisodeCommand } from "../data/apiSurface";
import { CodeBlock } from "../components/ui/CodeBlock";
import { PODCAST_HUB, podcastPostPath } from "../data/podcastPosts";
import { readingMinutes } from "../data/analysis";
import { Fact, LINK, PostBlocks, SourcesRead } from "../components/PostBody";

/**
 * One idea from crypto podcasts: the episodes it was heard on, the write-up,
 * and every outside source it was checked against. The rules are in
 * `data/podcastPosts.ts`.
 *
 * The episodes lead, above the body, because they are what a reader checks a
 * quote against: each links to the episode's own page, and every quote in the
 * body carries the timestamp it starts at.
 */

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A day that can be formatted, or null: `Intl` throws a RangeError on an invalid date. */
const day = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
};

/*
 * WHERE THE PAGE SENDS A READER NEXT
 *
 * One block, after the sources, in the order the site ranks its readers: a
 * working call first, then one action in orange, then the recipe, MCP and the
 * news feed as plain links. The call is the record of the episode the page
 * quotes first, by its id in the podcast feed, so what it prints is the data
 * this page was written from rather than a sample. A page whose episodes carry
 * no id shows the feed itself. Both come from `data/apiSurface.js`, like every
 * command the site prints.
 */

const NEXT = [
  {
    href: `${CONFIG.cookbook}/sentiment-from-podcasts`,
    name: "Analyse crypto podcasts programmatically",
    why: "Track what the shows say about a project, from each episode's description.",
  },
  {
    href: CONFIG.mcp,
    name: "Use it from your agent over MCP",
    why: "The podcast feed as tools, for Claude, Cursor and any MCP client.",
  },
  {
    href: `${CONFIG.api}/data/news`,
    name: "Crypto news API",
    why: "The stories the shows are reacting to.",
  },
];

const BuildOnIt = ({ itemId }) => (
  <div className="mt-14 max-w-160 border-t border-surface-border pt-10">
    <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
      Every crypto podcast episode, as data
    </h2>
    <p className="mt-3 text-[16px] text-text-muted">
      {itemId
        ? "This page was written from an episode in Alphaday’s podcast feed. Its record, with the audio file, the episode page and a description, is one call away."
        : "The episodes behind these pages are in Alphaday’s podcast feed, each with its audio file, its page and a description."}{" "}
      Free, no signup, no key.
    </p>
    <div className="mt-5 rounded-xl border border-surface-border bg-surface p-1.5">
      <CodeBlock
        code={itemId ? podcastEpisodeCommand(itemId) : API_COMMANDS.podcasts}
        language="bash"
      />
    </div>
    <p className="mt-5 text-[17px]">
      <a
        href={`${CONFIG.api}/data/podcasts`}
        className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
      >
        Start building with the podcasts API
      </a>
    </p>
    <ul className="mt-6 flex flex-col gap-4">
      {NEXT.map((step) => (
        <li key={step.href}>
          <a href={step.href} className={`text-[16px] font-medium text-text ${LINK}`}>
            {step.name}
          </a>
          <p className="mt-1 text-[15px] text-text-muted">{step.why}</p>
        </li>
      ))}
    </ul>
  </div>
);

const PodcastPostPage = ({ article }) => {
  const { post, others } = article;
  const { meta } = post;
  const itemId = meta.episodes.find((episode) => episode.itemId)?.itemId ?? null;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <a
            href={PODCAST_HUB}
            className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Podcast ideas
          </a>

          <h1 className="max-w-[24ch] font-display text-[clamp(30px,4.6vw,50px)] font-medium leading-[1.05] tracking-tight text-text">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 max-w-160 text-[19px] leading-relaxed text-text-muted">
              {post.excerpt}
            </p>
          )}

          {meta.episodes.length > 0 && (
            <dl className="mt-8">
              <Fact label={meta.episodes.length === 1 ? "Episode" : "Episodes"}>
                <ul className="flex flex-col gap-1.5">
                  {/* By position: two episodes of one show can share a title. */}
                  {meta.episodes.map((episode, index) => (
                    <li key={index} className="max-w-160">
                      {episode.pageUrl ? (
                        <a href={episode.pageUrl} target="_blank" rel="noreferrer" className={LINK}>
                          {episode.show}
                          {episode.title && `: ${episode.title}`}
                        </a>
                      ) : (
                        <>
                          {episode.show}
                          {episode.title && `: ${episode.title}`}
                        </>
                      )}
                      {day(episode.aired) && (
                        <span className="ml-2 text-[14px] font-normal text-text-muted">
                          {day(episode.aired)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Fact>
            </dl>
          )}
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-14">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
            The idea
            <span className="ml-3 font-normal normal-case tracking-normal text-text-muted/70">
              {readingMinutes(post.blocks)} min read
            </span>
          </h2>

          <PostBlocks blocks={post.blocks} />
          <SourcesRead urls={meta.sourcesRead} />
          <BuildOnIt itemId={itemId} />
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-24">
          {others.length > 0 && (
            <>
              <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
                More from the podcasts
              </h2>
              <ul className="mt-5 flex flex-col gap-2.5">
                {others.map((other) => (
                  <li key={other.slug} className="max-w-160 text-[16px]">
                    <a href={podcastPostPath(other.slug)} className={`font-medium text-text ${LINK}`}>
                      {other.title}
                    </a>
                    {other.shows.length > 0 && (
                      <span className="ml-2 text-[13px] text-text-muted">
                        {other.shows.join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-8 text-[13px] text-text-muted">
            Quotes are from machine transcripts of the episodes, with misheard names corrected, and
            each timestamp is where its passage starts. What a guest says is their claim; the
            sources linked beside it are what it was checked against.
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default PodcastPostPage;
