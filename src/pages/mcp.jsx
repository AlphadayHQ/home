import React from "react";
import { ArrowRight, Check } from "lucide-react";
import { Layout, Section } from "../shared";
import { CodeBlock } from "../components/ui/CodeBlock";
import CONFIG from "../config";
import {
  API_COMMANDS,
  API_TOOLS,
  CAPABILITY_COUNT,
  TOOL_COUNT,
} from "../data/apiSurface";
import { TOOL_DOMAINS, domainsNotCovering } from "../data/mcpTools";
import {
  CAPABILITY_COPY,
  CAPABILITY_LABELS,
  HEADLINE_CAPABILITIES,
} from "../data/mcpCapabilities";
import {
  FEATURED_INSTALLS,
  MCP_CLIENTS,
  MCP_CLIENTS_VERIFIED_ON,
} from "../data/mcpClients";

/**
 * /mcp — the MCP server page.
 *
 * CLAUDE.md puts agent builders first and names MCP as the wedge: the `<head>`
 * already leads with "Free API & MCP, no signup", and until now that sentence
 * appeared nowhere above the fold on any page. This is where it lands.
 *
 * The page answers the four questions an agent builder actually asks, in the
 * order they ask them: is there an MCP server, can I connect it right now, what
 * is in it, and what does it cost. Everything else was cut — principle 7, the
 * default answer to "should we add this?" is no.
 *
 * The capability inventory is the argument. A tool list is a list of verbs; the
 * capability list is what the layer actually holds, and eleven of the twenty-two
 * entries have never been shown anywhere on this site. That is the substance,
 * so it gets the space.
 */

/** The domains the twelve-tool showcase on /api never mentions. */
const unsurfaced = new Set(domainsNotCovering(API_TOOLS.map((t) => t.name)));

const capabilities = Object.keys(TOOL_DOMAINS).map((slug) => ({
  slug,
  copy: CAPABILITY_COPY[slug],
  toolCount: TOOL_DOMAINS[slug].length,
  isNew: unsurfaced.has(slug),
  isHeadline: HEADLINE_CAPABILITIES.includes(slug),
}));

const label = (slug) => CAPABILITY_LABELS[slug] ?? slug.replace(/-/g, " ");

const McpPage = () => (
  <Layout>
    <Section className="bg-background">
      <div className="mx-auto w-11/12 max-w-7xl pt-24 pb-4">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary mb-3.5">
          Model Context Protocol
        </p>
        <h1 className="font-display text-[clamp(34px,6vw,62px)] leading-[1.02] font-extrabold tracking-tight text-text max-w-[18ch]">
          Crypto context for your agent.
        </h1>
        <p className="text-text-muted text-[18px] max-w-160 mt-5">
          One endpoint. {CAPABILITY_COUNT} data capabilities across {TOOL_COUNT}{" "}
          pre-described tools — news, governance, DeFi, security and market data.{" "}
          <span className="text-text font-semibold">
            Free, and no signup.
          </span>
        </p>

        {/*
          The endpoint before the prose. An agent builder evaluating this wants
          the URL in the first screen, not after a paragraph explaining what MCP
          is — they already know, which is why they are here.
        */}
        {/*
          Principle 3: orange means act, and the act on this page is connecting.
          The accent used to sit on a "REST API" button in the footer, which
          spent the page's one accent telling the reader to leave. It belongs on
          the endpoint - the thing they came to copy.
        */}
        <div className="mt-9 max-w-2xl rounded-xl border border-primary/40 bg-primary/[0.04] p-1.5">
          <CodeBlock code={API_COMMANDS.mcpUrl} language="bash" />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-[14px] text-text-muted">
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" /> No API key
          </span>
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" /> No signup
          </span>
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" /> Remote HTTP, no local process
          </span>
        </div>
      </div>
    </Section>

    <Section className="bg-background">
      <div className="mx-auto w-11/12 max-w-7xl pt-16">
        <h2 className="font-display text-[clamp(24px,3.4vw,34px)] leading-tight font-extrabold tracking-tight text-text">
          Connect it
        </h2>
        <p className="text-text-muted text-[16px] max-w-160 mt-3">
          Alphaday is a remote server, so there is no package to install and no
          process to keep running. Most clients take the URL directly.
        </p>

        <div className="grid sm:grid-cols-2 gap-5 mt-8">
          {FEATURED_INSTALLS.map(({ slug, name, label: kind, command, language }) => (
            <div key={slug} className="flex flex-col">
              <div className="flex items-center gap-2.5 mb-3.5">
                <h3 className="text-[15.5px] font-extrabold text-text">{name}</h3>
                <span className="ml-auto text-xs text-text-muted font-mono">
                  {kind}
                </span>
              </div>
              <CodeBlock
                code={command}
                language={language}
                className="grow flex items-center"
              />
              <a
                href={`${CONFIG.mcp}/${slug}`}
                className="text-[13px] font-bold text-text-muted hover:text-primary transition-colors mt-2.5"
              >
                {name} setup, in full &rarr;
              </a>
            </div>
          ))}
        </div>

        {/*
          Every client gets a link, not just the four with a quick-start. /mcp
          shipped promoted and linked from nowhere; doing that again one level
          down would be the same mistake with eight more URLs.
        */}
        <div className="flex flex-wrap gap-2.5 mt-8">
          {MCP_CLIENTS.map(({ slug, name }) => (
            <a
              key={slug}
              href={`${CONFIG.mcp}/${slug}`}
              className="text-[13.5px] font-medium text-text-muted border border-surface-border rounded-lg px-3.5 py-2 hover:border-primary/50 hover:text-text transition-colors"
            >
              {name}
            </a>
          ))}
        </div>

        {/*
          The verification date is shown, not buried. Client config formats move
          on their own schedule — the `npx mcp-remote` bridge went from required
          to unnecessary inside a year — and a stale config block is worse than
          no page, because it is the first thing a prospect or a model will try.
          Showing the date lets a reader judge staleness instead of trusting it,
          and gives the quarterly re-check something visible to fail against.
        */}
        <p className="text-text-muted text-[13.5px] mt-6">
          Configs verified {MCP_CLIENTS_VERIFIED_ON}. Using a different client?
          The endpoint is a standard remote MCP server — most take the URL as-is.
        </p>
      </div>
    </Section>

    <Section className="bg-background">
      <div className="mx-auto w-11/12 max-w-7xl pt-20">
        <h2 className="font-display text-[clamp(24px,3.4vw,34px)] leading-tight font-extrabold tracking-tight text-text">
          What&apos;s in it
        </h2>
        <p className="text-text-muted text-[16px] max-w-176 mt-3">
          {CAPABILITY_COUNT} distinct datasets. {TOOL_COUNT} tools reach them —
          most datasets have a list form, a detail form and a trending form, which
          is why the two numbers differ.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-9">
          {capabilities.map(({ slug, copy, toolCount, isNew, isHeadline }) => (
            <div
              key={slug}
              className={`bg-surface-light border rounded-[10px] px-4.25 py-3.75 transition-colors ${
                isHeadline
                  ? "border-primary/45 hover:border-primary"
                  : "border-surface-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[13.5px] font-semibold text-primary">
                  {label(slug)}
                </span>
                {isNew && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted border border-surface-border rounded px-1.5 py-0.5">
                    New
                  </span>
                )}
                <span className="ml-auto font-mono text-[11.5px] text-text-muted">
                  {toolCount}
                </span>
              </div>
              <div className="text-[13.5px] text-text-muted mt-1.5">{copy}</div>
            </div>
          ))}
        </div>

        <p className="text-text-muted text-[14px] mt-6">
          <span className="text-text font-semibold">
            {unsurfaced.size} of these
          </span>{" "}
          are not in the twelve-tool showcase on{" "}
          <a href={CONFIG.api} className="text-primary hover:underline">
            /api
          </a>
          . The number in each card is how many tools reach that dataset.
        </p>
      </div>
    </Section>

    <Section className="bg-background">
      <div className="mx-auto w-11/12 max-w-7xl pt-20 pb-24">
        <div className="border border-surface-border rounded-[14px] bg-surface p-8 md:p-11">
          <h2 className="font-display text-[clamp(22px,3vw,30px)] leading-tight font-extrabold tracking-tight text-text">
            No key. No signup. No rate-limit tier.
          </h2>
          <p className="text-text-muted text-[16px] max-w-160 mt-3">
            Point your client at the endpoint and start calling. If you would
            rather use plain REST, the same data is available there.
          </p>
          <div className="flex flex-wrap gap-3.5 mt-7">
            <a
              className="group inline-flex items-center gap-2 border border-surface-border text-text font-bold text-[14.5px] rounded-lg px-5 py-3 hover:border-primary/50 transition-colors"
              href={CONFIG.api}
            >
              REST API
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              className="inline-flex items-center gap-2 border border-surface-border text-text font-bold text-[14.5px] rounded-lg px-5 py-3 hover:border-primary/50 transition-colors"
              href="/api/docs"
            >
              Full reference
            </a>
          </div>
        </div>
      </div>
    </Section>
  </Layout>
);

export default McpPage;
