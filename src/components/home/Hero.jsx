import React from "react";
import { Section } from "../../shared";
import CONFIG from "../../config";
import FlowArrows from "./FlowArrows";

// Every crypto data type the layer ingests. Breadth is the argument here, so
// every type reads at full contrast — `+100 more` is a count rather than a
// data type, so it alone reads as secondary.
const DATA_TYPES = [
  { label: "Market data" },
  { label: "On-chain & DeFi" },
  { label: "News" },
  { label: "Research" },
  { label: "Podcasts" },
  { label: "Video" },
  { label: "Social" },
  { label: "Governance" },
  { label: "Dev activity" },
  { label: "Events" },
  { label: "AI content" },
  { label: "+100 more", more: true },
];

// What the layer feeds. Approved as a set — do not edit individually.
// Ordered by audience priority: agent builders, then developers, then app users.
const OUTPUTS = [
  { name: "Your AI agent", detail: "Trades with sight" },
  { name: "Your Trading bot", detail: "Live signals" },
  { name: "Your Data terminal", detail: "Research anything" },
  { name: "Your Research desk", detail: "Sourced in seconds" },
  { name: "Your Portfolio tracker", detail: "Context behind prices" },
];

/**
 * Entrance choreography, in ms. The hero animates once on load and never
 * again — the point is to *perform* the claim the diagram makes (many types
 * converge into one layer, which then feeds many things) rather than to
 * decorate it, so the order matters more than the easing.
 *
 * Copy lands first so the page is readable almost immediately; the diagram
 * then plays top-to-bottom in the direction the data travels. Everything is
 * done by ~1.5s, and nothing blocks interaction at any point.
 */
const T = {
  headline: 0,
  paragraph: 90,
  actions: 180,
  chips: 140,
  chipStagger: 26,
  arrowsIn: 460,
  layer: 560,
  arrowsOut: 640,
  outputs: 700,
  outputStagger: 45,
};

const ConvergenceVisual = () => (
  <div
    role="img"
    aria-label="Every crypto data type flows into the Alphaday Data Layer, which feeds whatever you build"
    className="flex flex-col"
  >
    <div className="flex flex-wrap gap-2 justify-center">
      {DATA_TYPES.map(({ label, more }, i) => (
        <span
          key={label}
          style={{ animationDelay: `${T.chips + i * T.chipStagger}ms` }}
          className={`animate-rise bg-surface-light border rounded-full px-3.25 pt-1.5 pb-1 text-[12.5px] font-medium whitespace-nowrap ${
            more
              ? "text-text-muted border-surface-border"
              : "text-text border-surface-border-strong"
          }`}
        >
          {label}
        </span>
      ))}
    </div>

    <FlowArrows count={4} direction="down" delay={T.arrowsIn} />

    {/* The convergence point. Outlined rather than filled: a solid orange
        rounded rect reads as a button, and the only button here is the CTA. */}
    <div
      style={{ animationDelay: `${T.layer}ms` }}
      className="animate-rise bg-surface border-2 border-primary text-primary text-center font-black uppercase tracking-[0.18em] text-[15px] py-4 px-2.5 rounded-[10px]"
    >
      Alphaday Data Layer
    </div>

    <FlowArrows count={4} direction="down" delay={T.arrowsOut} />

    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {OUTPUTS.map(({ name, detail }, i) => (
        <div
          key={name}
          style={{ animationDelay: `${T.outputs + i * T.outputStagger}ms` }}
          /* Five cards in two columns leaves the last one stranded alone on
             mobile, so it spans the full row instead of sitting half-empty. */
          /* flex + mt-auto pins the detail line to the bottom of every card.
             Names wrap to one or two lines depending on length, which
             otherwise leaves the details sitting at ragged heights. */
          className={`animate-rise flex flex-col bg-surface border border-surface-border rounded-[9px] px-2 py-2.75 text-center ${
            i === OUTPUTS.length - 1 ? "col-span-2 sm:col-span-1" : ""
          }`}
        >
          <span className="block text-text font-extrabold text-[11.5px] leading-tight sm:mb-2">
            {name}
          </span>
          <span className="block text-text-muted text-[11px] mt-auto pt-0.75 leading-tight">
            {detail}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default function Hero() {
  return (
    <Section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto w-11/12 max-w-7xl grid lg:grid-cols-[1.04fr_0.96fr] gap-12 lg:gap-16 items-center py-24">
        <div>
          <h1
            style={{ animationDelay: `${T.headline}ms` }}
            className="animate-rise font-display text-[clamp(42px,5.8vw,66px)] leading-[1.04] font-extrabold tracking-tight text-text"
          >
            All of crypto.
            <br />
            <span className="text-primary">One data layer.</span>
          </h1>
          <p
            style={{ animationDelay: `${T.paragraph}ms` }}
            className="animate-rise text-text-muted text-[18.5px] mt-5 max-w-140"
          >
            Alphaday structures every crypto data type into one queryable layer,
            for AI agents, apps, and humans. Plug in with MCP or REST. Free, no
            signup, no API key.
          </p>
          <div
            style={{ animationDelay: `${T.actions}ms` }}
            className="animate-rise mt-8 flex flex-wrap gap-3.5"
          >
            <a
              className="btn-primary rounded-[10px] px-7 py-3.5 text-base"
              href={CONFIG.api}
            >
              Start building
            </a>
            <a
              className="border border-surface-border text-text rounded-[10px] px-7 py-3.5 text-base font-bold hover:border-primary/50 hover:-translate-y-px transition-all duration-200"
              href={CONFIG.alphadayApp}
            >
              Launch app
            </a>
          </div>
        </div>

        <ConvergenceVisual />
      </div>
    </Section>
  );
}
