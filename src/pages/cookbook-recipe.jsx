import React from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, Clock, Terminal } from "lucide-react";
import { Layout, Section } from "../shared";
import { CodeBlock } from "../components/ui/CodeBlock";
import { Rich } from "../components/ui/Rich";
import CONFIG from "../config";
import { RECIPES_VERIFIED_ON, caveatsFor, nextFor } from "../data/cookbook";

/**
 * `/cookbook/{recipe}` — one use case, start to finish.
 *
 * THE OUTPUT BLOCK IS THE POINT OF THE PAGE
 *
 * §A1's bar is "working code and a real, pasted output", and the output half is
 * the half that cannot be faked. Anyone can publish a snippet; a snippet with
 * the response it actually produced is a claim the reader can check in one
 * paste. That is principle 5 — show, don't claim — applied to a page format
 * rather than to a hero.
 *
 * So the output gets its own treatment rather than being a fourth code block in
 * a row: an accent border, a verification date, and a note that says what is
 * surprising about it. Every note on every recipe points at something real the
 * run turned up — a broken filter, a tag that reads wider than expected, a mean
 * that misleads. Those notes are the reason to read this rather than the
 * README-grade version of the same snippet.
 *
 * WHY THE CAVEATS ARE SELECTED AND NOT LISTED
 *
 * `caveatsFor` returns only the data caveats that bite this recipe, the same
 * discipline as the MCP client pages' symptom tables. Six pages each carrying
 * all six caveats is six pages whose caveat section nobody reads.
 */

const H2 = ({ children }) => (
  <h2 className="font-display text-[clamp(22px,3vw,30px)] leading-tight font-extrabold tracking-tight text-text">
    {children}
  </h2>
);

const Wrap = ({ children, className = "" }) => (
  <div className={`mx-auto w-11/12 max-w-4xl ${className}`}>{children}</div>
);

const RecipePage = ({ recipe }) => {
  const caveats = caveatsFor(recipe);
  const next = nextFor(recipe);

  return (
    <Layout>
      <Section className="bg-background">
        <Wrap className="pt-24 pb-6">
          <a
            href={CONFIG.cookbook}
            className="group inline-flex items-center gap-2 text-[13.5px] font-bold text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Cookbook
          </a>

          <h1 className="font-display text-[clamp(30px,5vw,52px)] leading-[1.04] font-extrabold tracking-tight text-text mt-6">
            {recipe.title}
          </h1>
          <p className="text-text-muted text-[17px] max-w-160 mt-4 leading-relaxed">
            <Rich>{recipe.blurb}</Rich>
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-[14px] text-text-muted">
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> ~{recipe.minutes} min
            </span>
            <span className="inline-flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" /> {recipe.stack}
            </span>
            <span>No API key, no signup</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {recipe.uses.map((u) => (
              <span
                key={u}
                className="font-mono text-[12.5px] text-text-muted border border-surface-border rounded px-2.5 py-1"
              >
                {u}
              </span>
            ))}
          </div>
        </Wrap>
      </Section>

      {recipe.steps.map((step, i) => (
        <Section className="bg-background" key={step.heading}>
          <Wrap className="pt-12">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[13px] text-primary font-semibold shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <H2>{step.heading}</H2>
            </div>
            <p className="text-text-muted text-[15.5px] max-w-160 mt-3 mb-5 leading-relaxed">
              <Rich>{step.body}</Rich>
            </p>
            <CodeBlock code={step.code} language={step.language} />
          </Wrap>
        </Section>
      ))}

      {/*
        Principle 3 says orange means act. The act on a cookbook page is running
        the thing, so the accent sits on the evidence that running it works —
        not on a "Get started" button that would spend it sending the reader
        somewhere else.
      */}
      <Section className="bg-background">
        <Wrap className="pt-14">
          <H2>What it prints</H2>
          <p className="text-text-muted text-[15.5px] max-w-160 mt-3 mb-5 leading-relaxed">
            Produced by running the code above against the live API, not written
            by hand.
          </p>
          <div className="rounded-xl border border-primary/40 bg-primary/[0.04] p-1.5">
            <CodeBlock code={recipe.output.code} language={recipe.output.language} />
          </div>
          <p className="text-[14.5px] text-text-muted leading-relaxed mt-4 max-w-176">
            <Rich>{recipe.output.note}</Rich>
          </p>
        </Wrap>
      </Section>

      {/*
        Variations are where a cookbook page earns its length honestly. Each one
        is a real parameter change with a figure behind it — `sources` narrows
        Arbitrum governance from the whole Ethereum ecosystem to its own 171
        proposals, `period=2` widens Ethereum news to 1,024 articles — rather
        than prose restating the step above it. They were all run.
      */}
      <Section className="bg-background">
        <Wrap className="pt-16">
          <H2>Variations</H2>
          <p className="text-text-muted text-[15.5px] max-w-160 mt-3 mb-7 leading-relaxed">
            The same shape, pointed somewhere else. Every figure below came back
            from the live API.
          </p>
          <div className="space-y-5">
            {recipe.variations.map((v) => (
              <div
                key={v.heading}
                className="border border-surface-border rounded-[12px] bg-surface px-6 py-5"
              >
                <p className="text-[15px] font-bold text-text leading-snug">
                  {v.heading}
                </p>
                <p className="text-[14px] text-text-muted leading-relaxed mt-2 mb-4 max-w-160">
                  <Rich>{v.body}</Rich>
                </p>
                <CodeBlock code={v.code} language={v.language ?? recipe.steps[0].language} />
              </div>
            ))}
          </div>
        </Wrap>
      </Section>

      {caveats.length > 0 && (
        <Section className="bg-background">
          <Wrap className="pt-16">
            <div className="border border-surface-border rounded-[14px] bg-surface p-7 md:p-9">
              <div className="flex items-center gap-2.5 mb-5">
                <AlertTriangle className="w-4.5 h-4.5 text-primary" />
                <H2>Before you build on this</H2>
              </div>
              <div className="space-y-5">
                {caveats.map(({ id, title, body }) => (
                  <div key={id} className="pl-4 border-l border-surface-border">
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
      )}

      <Section className="bg-background">
        <Wrap className="pt-16 pb-24">
          <H2>Next</H2>
          <div className="grid sm:grid-cols-2 gap-3.5 mt-6">
            {next.map((r) => (
              <a
                key={r.slug}
                href={`${CONFIG.cookbook}/${r.slug}`}
                className="group bg-surface-light border border-surface-border rounded-[10px] px-5 py-4 hover:border-primary/50 transition-colors"
              >
                <p className="text-[15px] font-extrabold text-text">{r.title}</p>
                <p className="text-[13.5px] text-text-muted mt-1.5">
                  ~{r.minutes} min · {r.stack}
                </p>
              </a>
            ))}
          </div>

          <div className="border-t border-surface-border mt-10 pt-6 text-[13px] text-text-muted">
            Code run and output captured {RECIPES_VERIFIED_ON}. The API needs no
            key and no signup —{" "}
            <a href={CONFIG.api} className="text-primary hover:underline">
              the full endpoint reference
            </a>{" "}
            and{" "}
            <a href={CONFIG.mcp} className="text-primary hover:underline">
              the MCP server
            </a>{" "}
            are both free.
          </div>

          <div className="flex flex-wrap gap-3.5 mt-7">
            <a
              className="group inline-flex items-center gap-2 border border-surface-border text-text font-bold text-[14.5px] rounded-lg px-5 py-3 hover:border-primary/50 transition-colors"
              href={CONFIG.cookbook}
            >
              All recipes
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </Wrap>
      </Section>
    </Layout>
  );
};

export default RecipePage;
