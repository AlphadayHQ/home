import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Boxes,
  Code2,
  FileSearch,
  ListChecks,
} from "lucide-react";
import { Layout, Section } from "../shared";
import { CodeBlock } from "../components/ui/CodeBlock";
import { Rich } from "../components/ui/Rich";
import CONFIG from "../config";
import { CAPABILITY_COUNT } from "../data/apiSurface";
import { CAPABILITY_PAGES_VERIFIED_ON } from "../data/capabilityPages";

/**
 * `/api/data/{slug}` — one page per headline data capability.
 *
 * WHY THESE EXIST AT ALL
 *
 * Four of the 22 data capabilities are not on any incumbent crypto API: a
 * structured incident database, per-coin developer activity, AI-detected chart
 * patterns and one-call-per-pool DeFi yields. Most readers who land on `/api`
 * never realise the server has them, because the page is a stat band and a
 * twelve-tool showcase. These pages are the place where the four can rank on
 * substance rather than brand — a real payload, a real `curl` that runs, and
 * a Known-limits section the site does not let any other page fudge.
 *
 * The structural discipline that keeps them honest is the same as the cookbook
 * pages: **the content lives in a route-only data module, every section is
 * present or absent on its own merits, and the "Known limits" block is required
 * rather than optional.** `src/__tests__/capability-pages.test.ts` enforces the
 * structure; the prose inside is enforced by the same review that already
 * signs off the cookbook output blocks.
 *
 * WHAT THIS PAGE DOES NOT DO
 *
 * It does not invent a worked-example link. Plan §5.3 says the "Worked example"
 * section exists where a cookbook recipe genuinely uses the capability; for
 * the four slugs here, none does (the six recipes in `src/data/cookbook.js` all
 * read news, blogs, podcasts, DAO proposals or keywords). Inventing a recipe
 * link would be exactly the failure mode the plan calls out in §6 — orphan
 * promoted pages are worse than no link at all.
 */

const H2 = ({ children }) => (
  <h2 className="font-display text-[clamp(22px,3vw,30px)] leading-tight font-extrabold tracking-tight text-text">
    {children}
  </h2>
);

const Wrap = ({ children, className = "" }) => (
  <div className={`mx-auto w-11/12 max-w-4xl ${className}`}>{children}</div>
);

const CapabilityPage = ({ page }) => {
  return (
    <Layout>
      {/* ---------------------------------------------------------- Hero */}
      <Section className="bg-background">
        <Wrap className="pt-24 pb-6">
          <a
            href={CONFIG.api}
            className="group inline-flex items-center gap-2 text-[13.5px] font-bold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            All capabilities
          </a>

          <h1 className="font-display text-[clamp(30px,5vw,52px)] leading-[1.04] font-extrabold tracking-tight text-text mt-6">
            {page.title}
          </h1>
          <p className="text-text-muted text-[17px] max-w-160 mt-4 leading-relaxed">
            <Rich>{page.blurb}</Rich>
          </p>

          <div className="mt-9 border border-surface-border rounded-[14px] bg-surface p-7">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-[clamp(34px,6vw,52px)] leading-none font-black tracking-tighter text-primary">
                {page.heroFigure.big}
              </span>
              <span className="text-text-muted text-[14.5px] font-semibold">
                {page.heroFigure.suffix}
              </span>
            </div>
            <p className="text-[14.5px] text-text-muted leading-relaxed mt-4 max-w-176">
              <Rich>{page.heroFigure.note}</Rich>
            </p>
          </div>
        </Wrap>
      </Section>

      {/* ------------------------------------------------- What's in a record */}
      <Section className="bg-background">
        <Wrap className="pt-12">
          <div className="flex items-center gap-2.5">
            <FileSearch className="w-4.5 h-4.5 text-primary" />
            <H2>What&apos;s in a record</H2>
          </div>
          <p className="text-text-muted text-[15.5px] max-w-160 mt-3 mb-5 leading-relaxed">
            Every field the corpus returns for one record. Real shape — walked
            corpus-wide, not sampled.
          </p>

          <div className="rounded-xl border border-surface-border bg-surface p-5 mb-5">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px]">
              {page.recordShape.map((field) => (
                <li key={field} className="text-primary">
                  {field}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-primary/40 bg-primary/[0.04] p-1.5">
            <CodeBlock code={page.samplePayload} language="json" />
          </div>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------- Get it */}
      <Section className="bg-background">
        <Wrap className="pt-14">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-4.5 h-4.5 text-primary" />
            <H2>Get it</H2>
          </div>
          <p className="text-text-muted text-[15.5px] max-w-160 mt-3 mb-5 leading-relaxed">
            A <code className="font-mono text-[0.92em] text-primary/90 bg-surface-light border border-surface-border rounded px-1 py-px">curl</code>{" "}
            that runs against the live API right now, plus the MCP tool names
            for the same data.
          </p>

          <div className="rounded-xl border border-surface-border bg-surface p-1.5 mb-7">
            <CodeBlock code={page.getIt.curl} language="bash" />
          </div>

          <p className="text-[13.5px] font-bold uppercase tracking-[0.12em] text-text-muted mb-3">
            MCP tools
          </p>
          <div className="flex flex-wrap gap-2">
            {page.getIt.mcpTools.map((tool) => (
              <code
                key={tool}
                className="font-mono text-[13px] text-primary border border-surface-border rounded px-2.5 py-1.5"
              >
                {tool}
              </code>
            ))}
          </div>
        </Wrap>
      </Section>

      {/* --------------------------------------------------- What it's for */}
      <Section className="bg-background">
        <Wrap className="pt-14">
          <div className="flex items-center gap-2.5">
            <ListChecks className="w-4.5 h-4.5 text-primary" />
            <H2>What it&apos;s for</H2>
          </div>
          <p className="text-text-muted text-[15.5px] max-w-160 mt-3 mb-6 leading-relaxed">
            Three concrete questions this capability answers that a general
            crypto API does not.
          </p>

          <ul className="space-y-4">
            {page.whatItsFor.map((q, i) => (
              <li
                key={i}
                className="text-[14.5px] text-text-muted leading-relaxed pl-4 border-l border-surface-border"
              >
                <Rich>{q}</Rich>
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------- Known limits */}
      <Section className="bg-background">
        <Wrap className="pt-14">
          <div className="border border-surface-border rounded-[14px] bg-surface p-7 md:p-9">
            <div className="flex items-center gap-2.5 mb-5">
              <AlertTriangle className="w-4.5 h-4.5 text-primary" />
              <H2>Known limits</H2>
            </div>
            <p className="text-[14px] text-text-muted leading-relaxed mb-6 max-w-176">
              Required, not optional. Coverage gaps, staleness and parameter
              traps that were observed by running the <code className="font-mono text-[0.92em] text-primary/90 bg-surface-light border border-surface-border rounded px-1 py-px">curl</code>{" "}
              above against the live server on {CAPABILITY_PAGES_VERIFIED_ON}.
            </p>
            <div className="space-y-5">
              {page.knownLimits.map(({ title, body }) => (
                <div key={title} className="pl-4 border-l border-surface-border">
                  <p className="text-[14.5px] font-bold text-text leading-snug">
                    <Rich>{title}</Rich>
                  </p>
                  <p className="text-[14px] text-text-muted leading-relaxed mt-1.5">
                    <Rich>{body}</Rich>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------- Footer */}
      <Section className="bg-background">
        <Wrap className="pt-14 pb-24">
          <div className="border-t border-surface-border pt-6 text-[13px] text-text-muted">
            Figures and payloads verified against the live API on{" "}
            {CAPABILITY_PAGES_VERIFIED_ON}. The API needs no key and no signup —
            see{" "}
            <a href={CONFIG.apiDocs} className="text-primary hover:underline">
              the full endpoint reference
            </a>{" "}
            and{" "}
            <a href={CONFIG.mcp} className="text-primary hover:underline">
              the MCP server
            </a>
            .
          </div>

          <div className="flex flex-wrap gap-3.5 mt-7">
            <a
              className="group inline-flex items-center gap-2 border border-surface-border text-text font-bold text-[14.5px] rounded-lg px-5 py-3 hover:border-primary/50 transition-colors"
              href={CONFIG.api}
            >
              <Boxes className="w-4 h-4" />
              All {CAPABILITY_COUNT} capabilities
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              className="group inline-flex items-center gap-2 border border-surface-border text-text font-bold text-[14.5px] rounded-lg px-5 py-3 hover:border-primary/50 transition-colors"
              href={CONFIG.cookbook}
            >
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              Cookbook: worked use cases
            </a>
          </div>
        </Wrap>
      </Section>
    </Layout>
  );
};

export default CapabilityPage;
