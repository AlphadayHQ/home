import React from "react";
import { ArrowRight, Clock } from "lucide-react";
import { Layout, Section } from "../shared";
import { Rich } from "../components/ui/Rich";
import CONFIG from "../config";
import { RECIPES, RECIPES_VERIFIED_ON } from "../data/cookbook";
import { CAPABILITY_COUNT, TOOL_COUNT } from "../data/apiSurface";

/**
 * `/cookbook` — the index.
 *
 * Its whole job is to get someone into a recipe, so it is a list and not a
 * landing page: no second hero, no repeat of the capability inventory that
 * `/mcp` already carries, no feature grid. Principle 7 — the default answer to
 * "should we add this?" is no.
 *
 * Each card leads with the question the recipe answers rather than the product
 * noun, because that is the shape of the query these pages exist to catch:
 * people search "automate a crypto newsletter", not "Alphaday digest endpoint".
 */
const CookbookPage = () => (
  <Layout>
    <Section className="bg-background">
      <div className="mx-auto w-11/12 max-w-5xl pt-24 pb-4">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary mb-3.5">
          Cookbook
        </p>
        <h1 className="font-display text-[clamp(34px,6vw,62px)] leading-[1.02] font-extrabold tracking-tight text-text max-w-[16ch]">
          Things worth building, already built.
        </h1>
        <p className="text-text-muted text-[18px] max-w-160 mt-5">
          Six use cases against {CAPABILITY_COUNT} data capabilities and{" "}
          {TOOL_COUNT} tools. Every one has code that runs and the output it
          actually produced.{" "}
          <span className="text-text font-semibold">Free, and no signup.</span>
        </p>
      </div>
    </Section>

    <Section className="bg-background">
      <div className="mx-auto w-11/12 max-w-5xl pt-10 pb-24">
        <div className="grid md:grid-cols-2 gap-4">
          {RECIPES.map((r) => (
            <a
              key={r.slug}
              href={`${CONFIG.cookbook}/${r.slug}`}
              className="group flex flex-col bg-surface-light border border-surface-border rounded-[12px] px-6 py-5.5 hover:border-primary/50 transition-colors"
            >
              <p className="font-mono text-[12.5px] text-primary/80">
                &ldquo;{r.query}&rdquo;
              </p>
              <h2 className="text-[17px] font-extrabold text-text mt-2.5 leading-snug">
                {r.title}
              </h2>
              <p className="text-[14px] text-text-muted leading-relaxed mt-2 grow">
                <Rich>{r.blurb}</Rich>
              </p>
              <div className="flex items-center gap-x-4 mt-4 text-[13px] text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> ~{r.minutes} min
                </span>
                <span>{r.stack}</span>
                <ArrowRight className="w-4 h-4 ml-auto text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </a>
          ))}
        </div>

        <p className="text-text-muted text-[13.5px] mt-8">
          Code run and outputs captured {RECIPES_VERIFIED_ON}. Every recipe uses
          the free API or the{" "}
          <a href={CONFIG.mcp} className="text-primary hover:underline">
            MCP server
          </a>
          — no key, no signup, no rate-limit tier to pick.
        </p>
      </div>
    </Section>
  </Layout>
);

export default CookbookPage;
