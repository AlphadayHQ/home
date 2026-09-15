import React from "react";
import { ArrowLeft, AlertTriangle, Check, Terminal } from "lucide-react";
import { Layout, Section } from "../shared";
import { CodeBlock } from "../components/ui/CodeBlock";
import { Rich } from "../components/ui/Rich";
import CONFIG from "../config";
import { CAPABILITY_COUNT, TOOL_COUNT, API_COMMANDS } from "../data/apiSurface";
import {
  CAPABILITY_COPY,
  CAPABILITY_LABELS,
  HEADLINE_CAPABILITIES,
} from "../data/mcpCapabilities";
import { MCP_CLIENTS } from "../data/mcpClients";
import {
  HANDSHAKE_CHECK,
  SAMPLE_PROMPTS,
  endpointIssuesFor,
} from "../data/mcpClientGuides";

/**
 * `/mcp/{client}` — one page per MCP client.
 *
 * WHY THESE ARE SEPARATE PAGES RATHER THAN SECTIONS ON /mcp
 *
 * Because a single config block would be wrong for almost everyone. Six of these
 * clients take JSON and five disagree about its shape: the top-level key is
 * `mcpServers`, `servers` or `mcp` depending on the client; the URL field is
 * `url` except in Windsurf's examples; and `type` is absent, `"http"`,
 * `"streamableHttp"` or `"streamable-http"` depending on where you paste it.
 *
 * That last one is the sharpest: Cline and Roo Code share a codebase ancestor
 * and differ only in the casing of that string, and the wrong value does not
 * error — the client falls back to the deprecated SSE transport, which this
 * server answers with a 406.
 *
 * WHY THE PAGE IS LONGER THAN THE CONFIG BLOCK
 *
 * The first version was the snippet, the file path and a gotcha list, and it
 * was too thin to be worth ranking — eight near-identical pages differing by a
 * JSON key is the shape of a doorway cluster, and it is also just not enough to
 * get someone connected. The sections added since are the rest of the actual
 * job: what has to be true before the snippet works, how you confirm it did,
 * what to type first, and what to do when it fails.
 *
 * The discipline that keeps that from becoming filler is that **the shared
 * material is selected, not pasted**. `endpointIssuesFor` returns only the
 * endpoint symptoms that can happen to this client — the SSE fallback is a real
 * risk where there is a `type` field to get wrong and impossible where there is
 * not. Everything else on the page is per-client by construction. Principle 7
 * survives: nothing here is present to make the page longer.
 */

const H2 = ({ children }) => (
  <h2 className="font-display text-[clamp(22px,3vw,30px)] leading-tight font-extrabold tracking-tight text-text">
    {children}
  </h2>
);

const Lede = ({ children }) => (
  <p className="text-text-muted text-[15.5px] max-w-160 mt-3 leading-relaxed">
    {children}
  </p>
);

const Wrap = ({ children, className = "" }) => (
  <div className={`mx-auto w-11/12 max-w-4xl ${className}`}>{children}</div>
);

/** An ordered list of UI steps — used wherever a client has no file to edit. */
const Steps = ({ steps }) => (
  <ol className="border border-surface-border rounded-[10px] bg-surface divide-y divide-surface-border">
    {steps.map((step, i) => (
      <li
        key={step}
        className="flex gap-3.5 px-5 py-3.5 text-[14.5px] text-text-muted"
      >
        <span className="font-mono text-[12.5px] text-primary shrink-0 pt-0.5">
          {i + 1}
        </span>
        <span>
          <Rich>{step}</Rich>
        </span>
      </li>
    ))}
  </ol>
);

const headlines = HEADLINE_CAPABILITIES.map((slug) => ({
  slug,
  label: CAPABILITY_LABELS[slug] ?? slug.replace(/-/g, " "),
  copy: CAPABILITY_COPY[slug],
}));

const ClientPage = ({ client, guide }) => {
  const endpointIssues = endpointIssuesFor(guide);

  return (
    <Layout>
      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-24 pb-6">
          <a
            href={CONFIG.mcp}
            className="group inline-flex items-center gap-2 text-[13.5px] font-bold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            All clients
          </a>

          <h1 className="font-display text-[clamp(30px,5vw,52px)] leading-[1.04] font-extrabold tracking-tight text-text mt-6">
            Connect {client.name} to Alphaday
          </h1>
          {client.alsoKnownAs && (
            <p className="text-text-muted text-[14px] mt-2.5 font-mono">
              also known as {client.alsoKnownAs}
            </p>
          )}
          <p className="text-text-muted text-[17px] max-w-160 mt-4 leading-relaxed">
            <Rich>{client.blurb}</Rich>
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-[14px] text-text-muted">
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
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-10">
          <H2>What you&apos;re connecting to</H2>
          <Lede>
            One endpoint exposing {CAPABILITY_COUNT} data capabilities across{" "}
            {TOOL_COUNT} pre-described tools — news, governance, DeFi, security
            and market data. It is a <strong className="text-text font-semibold">remote</strong>{" "}
            server, so there is no package to install, no process to keep alive
            and no key to obtain. That matters for {client.name} setup
            specifically: almost every MCP example online is{" "}
            <code className="font-mono text-[0.92em] text-primary/90">command</code> +{" "}
            <code className="font-mono text-[0.92em] text-primary/90">args</code>{" "}
            spawning a local binary, and none of it applies here.
          </Lede>

          <div className="mt-6 max-w-2xl rounded-xl border border-primary/40 bg-primary/[0.04] p-1.5">
            <CodeBlock code={API_COMMANDS.mcpUrl} language="bash" />
          </div>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <H2>Before you start</H2>
          <Lede>
            The config below assumes all of this is already true. Most failed
            setups are one of these rather than a wrong field.
          </Lede>
          <ul className="mt-6 space-y-3">
            {guide.requirements.map((req) => (
              <li
                key={req}
                className="text-[14.5px] text-text-muted leading-relaxed pl-4 border-l border-surface-border"
              >
                <Rich>{req}</Rich>
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <H2>Set it up</H2>
          {client.install.length > 1 && (
            <Lede>
              {client.name} has more than one route in, and they are genuinely
              different rather than alternatives to the same thing. Use the one
              that matches the surface you work in.
            </Lede>
          )}

          <div className="mt-7">
            {client.install.map(({ label, kind, code, language, steps }) => (
              <div key={label} className="mb-9">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <h3 className="text-[16px] font-extrabold text-text">{label}</h3>
                  <span className="ml-auto text-xs text-text-muted font-mono">
                    {kind}
                  </span>
                </div>

                {code ? (
                  <CodeBlock code={code} language={language ?? "bash"} />
                ) : (
                  /*
                   * Some clients have no config file at all — Claude Desktop and
                   * ChatGPT are both UI flows. Rendering an ordered list rather
                   * than faking a code block keeps the page honest: there is
                   * nothing here to copy, and a monospace box implying otherwise
                   * would be the "terminal aesthetic as decoration" CLAUDE.md
                   * rules out.
                   */
                  <Steps steps={steps} />
                )}
              </div>
            ))}
          </div>

          {guide.paths && (
            <div className="mb-2">
              <h3 className="text-[16px] font-extrabold text-text mb-3">
                Where it goes
              </h3>
              <ul className="text-[14.5px] text-text-muted space-y-1.5">
                {guide.paths.map((path) => (
                  <li key={path}>
                    <Rich>{path}</Rich>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <H2>Check it worked</H2>
          <Lede>
            Confirm the connection before you go looking for a bug in your
            prompt. A server that is listed but not connected looks identical to
            a model that chose not to call it.
          </Lede>

          <div className="mt-7 flex items-center gap-2.5 mb-3.5">
            <h3 className="text-[16px] font-extrabold text-text">In {client.name}</h3>
            <span className="ml-auto text-xs text-text-muted font-mono">
              {guide.verify.kind}
            </span>
          </div>
          {guide.verify.code ? (
            <CodeBlock
              code={guide.verify.code}
              language={guide.verify.language ?? "bash"}
            />
          ) : (
            <Steps steps={guide.verify.steps} />
          )}
          <p className="text-[14.5px] text-text-muted leading-relaxed mt-3.5 max-w-160">
            <Rich>{guide.verify.expect}</Rich>
          </p>

          {/*
            The client-independent check. "It will not connect" is two different
            problems — a wrong config and an unreachable server — and they have
            nothing to do with each other. Settling which one you have before
            editing JSON is the single most useful thing this page can offer,
            and it is a real protocol handshake rather than a liveness ping.
          */}
          <div className="mt-9 border border-surface-border rounded-[14px] bg-surface p-6 md:p-7">
            <div className="flex items-center gap-2.5 mb-3">
              <Terminal className="w-4.5 h-4.5 text-primary" />
              <h3 className="text-[16px] font-extrabold text-text">
                Or test the endpoint directly
              </h3>
            </div>
            <p className="text-[14.5px] text-text-muted leading-relaxed mb-4 max-w-160">
              This is the first message of the MCP protocol, sent by hand. If it
              answers, the server is reachable from your machine and every
              remaining problem is on the {client.name} side.
            </p>
            <CodeBlock code={HANDSHAKE_CHECK.code} language={HANDSHAKE_CHECK.language} />
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-text-muted mt-5 mb-2.5">
              Expected response
            </p>
            <CodeBlock code={HANDSHAKE_CHECK.response} language="json" />
            <p className="text-[13.5px] text-text-muted leading-relaxed mt-3.5">
              <Rich>{HANDSHAKE_CHECK.note}</Rich>
            </p>
          </div>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <H2>Try it</H2>
          <Lede>
            Ask these in {guide.promptSurface}. Each one needs data the model
            cannot have — a live feed, an incident record, a yield table — so a
            good answer is proof the tools fired, not just that the server is
            listed.
          </Lede>
          <ul className="mt-7 space-y-2.5">
            {SAMPLE_PROMPTS.map((prompt) => (
              <li
                key={prompt}
                className="bg-surface-light border border-surface-border rounded-[10px] px-5 py-3.5 text-[14.5px] text-text-muted"
              >
                {prompt}
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <div className="border border-surface-border rounded-[14px] bg-surface p-7 md:p-9">
            <div className="flex items-center gap-2.5 mb-4">
              <AlertTriangle className="w-4.5 h-4.5 text-primary" />
              <H2>Things that catch people out</H2>
            </div>
            <ul className="space-y-3">
              {guide.gotchas.map((gotcha) => (
                <li
                  key={gotcha}
                  className="text-[14.5px] text-text-muted leading-relaxed pl-4 border-l border-surface-border"
                >
                  <Rich>{gotcha}</Rich>
                </li>
              ))}
            </ul>
          </div>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <H2>When it doesn&apos;t connect</H2>
          <Lede>
            Symptom first, because that is what you have. The status codes below
            were produced against the live server rather than copied from
            elsewhere — if yours does not appear here, it is worth trusting that
            difference.
          </Lede>

          <div className="mt-7 space-y-4">
            {[...guide.troubleshooting, ...endpointIssues].map(
              ({ symptom, cause, fix }) => (
                <div
                  key={symptom}
                  className="border border-surface-border rounded-[12px] bg-surface px-6 py-5"
                >
                  <p className="text-[15px] font-bold text-text leading-snug">
                    <Rich>{symptom}</Rich>
                  </p>
                  <p className="text-[14px] text-text-muted leading-relaxed mt-2.5">
                    <Rich>{cause}</Rich>
                  </p>
                  <p className="text-[14px] text-text-muted leading-relaxed mt-2.5 pl-4 border-l-2 border-primary/50">
                    <Rich>{fix}</Rich>
                  </p>
                </div>
              )
            )}
          </div>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <H2>What you get once it&apos;s connected</H2>
          <Lede>
            {CAPABILITY_COUNT} datasets, reached by {TOOL_COUNT} tools — most
            datasets have a list form, a detail form and a trending form, which
            is why the two numbers differ. These four are the ones a general
            crypto API does not have:
          </Lede>
          <div className="grid sm:grid-cols-2 gap-3.5 mt-7">
            {headlines.map(({ slug, label, copy }) => (
              <div
                key={slug}
                className="bg-surface-light border border-surface-border rounded-[10px] px-4.5 py-4"
              >
                <span className="font-mono text-[13.5px] font-semibold text-primary">
                  {label}
                </span>
                <p className="text-[14px] text-text-muted leading-relaxed mt-1.5">
                  {copy}
                </p>
              </div>
            ))}
          </div>
          <p className="text-text-muted text-[14.5px] mt-5">
            <a href={CONFIG.mcp} className="text-primary hover:underline">
              All {CAPABILITY_COUNT} capabilities
            </a>{" "}
            are listed on the MCP overview, with the tool count behind each.
          </p>
        </Wrap>
      </Section>

      {/* ---------------------------------------------------------------- */}
      <Section className="bg-background">
        <Wrap className="pt-14 pb-24">
          <div className="border-t border-surface-border pt-6 text-[13px] text-text-muted">
            <p className="mb-2">
              Verified {client.verifiedOn} against{" "}
              {guide.sources.length === 1 ? "the vendor's docs" : "vendor docs"}:
            </p>
            <ul className="space-y-1">
              {guide.sources.map((src) => (
                <li key={src}>
                  <a
                    href={src}
                    rel="nofollow noopener"
                    className="font-mono text-[12px] text-primary/80 hover:text-primary break-all"
                  >
                    {src.replace(/^https:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3.5 mt-8">
            <a
              className="inline-flex items-center gap-2 border border-surface-border text-text font-bold text-[14.5px] rounded-lg px-5 py-3 hover:border-primary/50 transition-colors"
              href={CONFIG.mcp}
            >
              Other clients
            </a>
            <a
              className="inline-flex items-center gap-2 border border-surface-border text-text font-bold text-[14.5px] rounded-lg px-5 py-3 hover:border-primary/50 transition-colors"
              href={CONFIG.api}
            >
              REST API
            </a>
          </div>
        </Wrap>
      </Section>
    </Layout>
  );
};

export { MCP_CLIENTS };
export default ClientPage;
