import React from "react";
import { ArrowLeft } from "lucide-react";
import { Layout, Section } from "../shared";
import CONFIG from "../config";
import { API_COMMANDS } from "../data/apiSurface";
import { CodeBlock } from "../components/ui/CodeBlock";
import { proposalPath } from "../data/governanceProposals";
import { readingMinutes } from "../data/analysis";
import { Fact, LINK, PostBlocks, SourcesRead } from "../components/PostBody";

/**
 * One governance proposal, explained: a facts panel from the post's `metadata`,
 * the vote as it stood when the page was written, the explainer, and every
 * source it was written from. The rules are in `data/governanceProposals.ts`.
 *
 * WHY THE TALLY IS VOTING POWER AND IS DATED
 *
 * Snapshot reports scores, not voters: a choice's figure is the voting power
 * behind it, in the DAO's token, and a handful of delegates can carry most of
 * it. So the panel says "voting power" and gives the vote count beside it, never
 * "voters". And it says when it was read, because the post is not edited when a
 * vote closes; the forum and vote links are there for the current state.
 */

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const POWER = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

const SHARE = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });

/*
 * A real but tiny figure is not zero. Balancer's BIP-936 drew 0.005 BAL against,
 * which the compact format prints as "0" and the page's own text gives as 0.005:
 * the panel must not contradict the prose, or claim a vote was unopposed.
 */
const power = (value) => (value > 0 && value < 1 ? "<1" : POWER.format(value));
const share = (value) => (value > 0 && value < 0.001 ? "<0.1%" : SHARE.format(value));

/** A day that can be formatted, or null: `Intl` throws a RangeError on an invalid date. */
const day = (iso) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : DATE.format(date);
};

const Tally = ({ vote, asOf }) => {
  const total = vote.choices.reduce((sum, choice) => sum + choice.power, 0);
  return (
    <div className="mt-8 max-w-160">
      <h2 className="text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
        The vote{asOf && `, as read on ${day(asOf)}`}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {/* By position: labels are trimmed, so two can read the same; the order is the vote's. */}
        {vote.choices.map((choice, index) => (
          <li key={index} className="flex items-baseline justify-between gap-6 text-[16px]">
            <span className="text-text">{choice.label}</span>
            <span className="whitespace-nowrap font-mono tabular-nums text-text">
              {power(choice.power)}
              {total > 0 && (
                <span className="ml-3 text-text-muted">{share(choice.power / total)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-text-muted">
        Voting power, not people
        {vote.votes !== null && `: ${vote.votes.toLocaleString("en-GB")} votes cast`}.
      </p>
    </div>
  );
};

/*
 * WHERE THE PAGE SENDS A READER NEXT
 *
 * One block, after the sources: the page was researched from Alphaday's DAO and
 * forum feeds, so the offer is those feeds. In the order the site ranks its
 * readers: a working call first, because for someone wiring governance into an
 * agent or a bot a request that answers beats any sentence about it; then one
 * action in orange, the API; then the recipe, MCP and the forum feed as plain
 * links. The call is the real, keyless endpoint, unfiltered: the feed's source
 * slugs are not the DAO names a post carries, and a filter guessed from one
 * would return nothing for some DAOs. It comes from `API_COMMANDS`, like every
 * command the site prints, so a change to the API is made in one place.
 */

const NEXT = [
  {
    href: `${CONFIG.cookbook}/dao-proposal-alerts`,
    name: "Alert on proposals closing soon",
    why: "A 15-minute recipe: forty lines and a cron entry.",
  },
  {
    href: CONFIG.mcp,
    name: "Use it from your agent over MCP",
    why: "The same feeds as tools, for Claude, Cursor and any MCP client.",
  },
  {
    href: `${CONFIG.api}/data/forum`,
    name: "Governance forum API",
    why: "The discussion threads that come before the votes.",
  },
];

const BuildOnIt = () => (
  <div className="mt-14 max-w-160 border-t border-surface-border pt-10">
    <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
      Every DAO proposal, as data
    </h2>
    <p className="mt-3 text-[16px] text-text-muted">
      This page was researched from Alphaday&rsquo;s DAO proposal and governance forum feeds. They
      are open: free, no signup, no key.
    </p>
    <div className="mt-5 rounded-xl border border-surface-border bg-surface p-1.5">
      <CodeBlock code={API_COMMANDS.dao} language="bash" />
    </div>
    <p className="mt-5 text-[17px]">
      <a
        href={`${CONFIG.api}/data/dao`}
        className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
      >
        Start building with the DAO proposals API
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

const GovernanceProposalPage = ({ article }) => {
  const { post, others } = article;
  const { meta } = post;
  const { vote } = meta;
  // A vote known by one date still says so: an open vote may have a start and no tally yet.
  const voting = !vote
    ? null
    : vote.start && vote.end
      ? `${day(vote.start)} to ${day(vote.end)}`
      : vote.start
        ? `From ${day(vote.start)}`
        : vote.end
          ? `Until ${day(vote.end)}`
          : null;

  return (
    <Layout>
      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
          <a
            href="/research/governance"
            className="mb-5 inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            DAO governance
          </a>

          <h1 className="max-w-[24ch] font-display text-[clamp(30px,4.6vw,50px)] font-medium leading-[1.05] tracking-tight text-text">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 max-w-160 text-[19px] leading-relaxed text-text-muted">
              {post.excerpt}
            </p>
          )}

          <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
            {meta.dao && <Fact label="DAO">{meta.dao}</Fact>}
            {meta.stageLabel && (
              <Fact label={meta.asOf ? `Stage, ${day(meta.asOf)}` : "Stage"}>{meta.stageLabel}</Fact>
            )}
            {voting && <Fact label="Voting">{voting}</Fact>}
            {meta.treasuryAsk && (
              <Fact label="Moves">
                <span className="block max-w-120 text-[15px] font-normal">{meta.treasuryAsk}</span>
              </Fact>
            )}
            {(meta.forumUrl || meta.snapshotUrl) && (
              <Fact label="Read it">
                {meta.forumUrl && (
                  <a href={meta.forumUrl} target="_blank" rel="noreferrer" className={LINK}>
                    Forum thread
                  </a>
                )}
                {meta.forumUrl && meta.snapshotUrl && <span className="text-text-muted"> · </span>}
                {meta.snapshotUrl && (
                  <a href={meta.snapshotUrl} target="_blank" rel="noreferrer" className={LINK}>
                    Snapshot vote
                  </a>
                )}
              </Fact>
            )}
          </dl>

          {vote && vote.choices.length > 0 && <Tally vote={vote} asOf={meta.asOf} />}
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl pt-6 pb-14">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
            The proposal
            <span className="ml-3 font-normal normal-case tracking-normal text-text-muted/70">
              {readingMinutes(post.blocks)} min read
            </span>
          </h2>

          <PostBlocks blocks={post.blocks} />
          <SourcesRead urls={meta.sourcesRead} />
          <BuildOnIt />
        </div>
      </Section>

      <Section className="bg-background">
        <div className="mx-auto w-11/12 max-w-5xl border-t border-surface-border pt-10 pb-24">
          {others.length > 0 && (
            <>
              <h2 className="font-display text-[26px] font-medium tracking-tight text-text">
                Other proposals
              </h2>
              <ul className="mt-5 flex flex-col gap-2.5">
                {others.map((other) => (
                  <li key={other.slug} className="max-w-160 text-[16px]">
                    <a href={proposalPath(other.slug)} className={`font-medium text-text ${LINK}`}>
                      {other.title}
                    </a>
                    {other.meta.stageLabel && (
                      <span className="ml-2 text-[13px] text-text-muted">{other.meta.stageLabel}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-8 text-[13px] text-text-muted">
            {meta.asOf ? `Stage and vote as read on ${day(meta.asOf)}. ` : ""}
            Proposals move after a page is written; the forum thread and the vote have the current
            state. Quotes are from the posts linked beside them.
          </p>
        </div>
      </Section>
    </Layout>
  );
};

export default GovernanceProposalPage;
