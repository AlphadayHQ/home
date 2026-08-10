import React from "react";
import { Section } from "../../shared";
import { API_COMMANDS } from "../../data/apiSurface";

// Three unstructured inputs about the same project, and the structured records
// the layer extracts from each.
//
// !! PENDING API-TEAM SIGN-OFF !!
// These field names (type/project/source/timestamp/summary/proposal/status/
// ends_in/repo/commits_7d/trend) must match the real API response schema —
// visitors will compare this against a live call.
const EXTRACTIONS = [
  {
    tag: "🎙 Podcast · unstructured audio",
    source: "The Rollup — Ep. 214",
    quote: (
      <>
        &ldquo;…what nobody&apos;s pricing in is <b>Arbitrum&apos;s</b> new
        incentive program. That&apos;s 120 million in emissions and nobody&apos;s
        modelling the second-order flows…&rdquo;
      </>
    ),
    meta: "1h 02m of audio",
    json: [
      { key: "type", value: "podcast" },
      { key: "project", value: "arbitrum", highlight: true },
      { key: "source", value: "The Rollup" },
      { key: "timestamp", value: "48:12" },
      { key: "summary", value: "Guest flags ARB incentive program as underpriced" },
    ],
  },
  {
    tag: "🗳 Governance · forum sprawl",
    source: "Arbitrum DAO — AIP-1.05",
    quote: (
      <>
        &ldquo;Reallocate 120M <b>ARB</b> to incentives… strongly oppose per my
        earlier point… amended after community call… quorum reached…&rdquo;
      </>
    ),
    meta: "214 forum replies",
    json: [
      { key: "type", value: "dao_vote" },
      { key: "project", value: "arbitrum", highlight: true },
      { key: "proposal", value: "AIP-1.05: 120M ARB incentive program" },
      { key: "status", value: "passing" },
      { key: "ends_in", value: "2d 14h" },
    ],
  },
  {
    tag: "⌥ Dev activity · commit noise",
    source: "GitHub — OffchainLabs/nitro",
    quote: (
      <>
        &ldquo;fix: node sync edge case… merge #4821… feat: stylus bench… 37
        merged PRs this week across <b>Arbitrum</b> core repos, nobody&apos;s
        watching…&rdquo;
      </>
    ),
    meta: "Hundreds of commits / week",
    json: [
      { key: "type", value: "dev_activity" },
      { key: "project", value: "arbitrum", highlight: true },
      { key: "repo", value: "OffchainLabs/nitro" },
      { key: "commits_7d", value: 184 },
      { key: "trend", value: "rising" },
      { key: "summary", value: "Core repo activity climbing ahead of release" },
    ],
  },
];

const Punctuation = ({ children }) => (
  <span className="text-text-muted">{children}</span>
);

const JsonRecord = ({ entries }) => (
  <div className="bg-surface border border-primary rounded-xl px-4.5 py-4 font-mono text-xs leading-relaxed">
    <Punctuation>{"{"}</Punctuation>
    {entries.map(({ key, value, highlight }, i) => (
      <div key={key} className="pl-3">
        <span className="text-primary">&quot;{key}&quot;</span>
        <Punctuation>: </Punctuation>
        <span className={highlight ? "text-text font-semibold" : "text-text-muted"}>
          {typeof value === "number" ? value : `"${value}"`}
        </span>
        {i < entries.length - 1 && <Punctuation>,</Punctuation>}
      </div>
    ))}
    <Punctuation>{"}"}</Punctuation>
  </div>
);

const DownArrow = () => (
  <div className="flex justify-center py-2.5" aria-hidden="true">
    <svg width="12" height="22" viewBox="0 0 12 22" fill="none">
      <defs>
        <linearGradient
          id="demo-arrow"
          gradientUnits="userSpaceOnUse"
          x1="6"
          y1="0"
          x2="6"
          y2="22"
        >
          <stop offset="0" stopColor="#3b3a3a" />
          <stop offset="1" stopColor="#faa202" />
        </linearGradient>
      </defs>
      <path d="M6 0 V14" stroke="url(#demo-arrow)" strokeWidth="2" />
      <path d="M1 13 H11 L6 22 Z" fill="#faa202" />
    </svg>
  </div>
);

function LayerDemo() {
  return (
    <Section id="layer" className="bg-background scroll-mt-16">
      <div className="mx-auto w-11/12 max-w-7xl py-24">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary mb-3.5">
          The layer at work
        </p>
        <h2 className="font-display text-[clamp(26px,3.6vw,38px)] leading-tight font-extrabold tracking-tight text-text max-w-190">
          Alpha hides in podcasts, votes, and commits. The layer extracts it.
        </h2>
        <p className="text-text-muted text-[17px] max-w-165 mt-3.5">
          The same project gets discussed across every format. Alphaday turns
          each one into machine-readable data, tagged, timestamped, queryable.
        </p>

        <div className="grid lg:grid-cols-3 gap-5 mt-13">
          {EXTRACTIONS.map(({ tag, source, quote, meta, json }) => (
            <div key={source} className="flex flex-col">
              <div className="bg-surface-light border border-surface-border rounded-xl px-5 py-4.5 grow">
                <span className="inline-block text-[10.5px] font-bold uppercase tracking-[0.12em] text-text-muted border border-surface-border rounded-[5px] px-2 py-0.75 mb-3">
                  {tag}
                </span>
                <div className="font-extrabold text-[14.5px] text-text">
                  {source}
                </div>
                <p className="text-text-muted text-[13.5px] italic mt-2 leading-normal [&_b]:text-text [&_b]:not-italic">
                  {quote}
                </p>
                <div className="text-text-muted text-xs mt-2.5 font-mono">
                  {meta}
                </div>
              </div>
              <DownArrow />
              <JsonRecord entries={json} />
            </div>
          ))}
        </div>

        {/* Three records converge into one query.
            gradientUnits="userSpaceOnUse" is deliberate — with the default
            bounding-box units the vertical middle path has a zero-width bbox
            and its gradient stroke disappears. */}
        <svg
          className="hidden lg:block w-full h-21 mt-1.5"
          viewBox="0 0 1200 84"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="mergeGrad"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2="84"
            >
              <stop offset="0" stopColor="#3b3a3a" />
              <stop offset="1" stopColor="#faa202" />
            </linearGradient>
          </defs>
          <path d="M200,0 C200,52 600,34 600,74" fill="none" stroke="url(#mergeGrad)" strokeWidth="2" />
          <path d="M600,0 L600,74" fill="none" stroke="url(#mergeGrad)" strokeWidth="2" />
          <path d="M1000,0 C1000,52 600,34 600,74" fill="none" stroke="url(#mergeGrad)" strokeWidth="2" />
          <path d="M593,72 L607,72 L600,84 Z" fill="#faa202" />
        </svg>

        <div className="bg-surface border border-primary rounded-xl px-6 py-5 flex flex-wrap items-center gap-5 mt-8 lg:mt-0">
          <pre className="font-mono text-[13.5px] text-text overflow-x-auto hide-scrollbar">
            <span className="text-primary">$</span> {API_COMMANDS.search}
          </pre>
          <p className="text-text-muted text-sm flex-1 min-w-65">
            News, blogs, podcasts, videos, DAO proposals, events, and forum posts
            — all tagged <b className="text-text">arbitrum</b>, in one call.
          </p>
        </div>
      </div>
    </Section>
  );
}

export default LayerDemo;
