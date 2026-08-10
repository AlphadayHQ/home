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
  { name: "Your AI agent", detail: "trades with sight" },
  { name: "Your trading bot", detail: "live signals" },
  { name: "Your data terminal", detail: "research anything" },
  { name: "Your research desk", detail: "sourced in seconds" },
  { name: "Your portfolio tracker", detail: "context behind prices" },
];

const ConvergenceVisual = () => (
  <div
    className="flex flex-col"
    aria-label="Every crypto data type flows into the Alphaday Data Layer, which feeds whatever you build"
  >
    <div className="flex flex-wrap gap-2 justify-center">
      {DATA_TYPES.map(({ label, more }) => (
        <span
          key={label}
          className={`bg-surface-light border rounded-full px-3.25 py-1.5 text-[12.5px] font-medium whitespace-nowrap ${
            more
              ? "text-text-muted border-surface-border"
              : "text-text border-[#4a4a4a]"
          }`}
        >
          {label}
        </span>
      ))}
    </div>

    <FlowArrows count={4} direction="down" />

    {/* The convergence point. Outlined rather than filled: a solid orange
        rounded rect reads as a button, and the only button here is the CTA. */}
    <div className="bg-surface border-2 border-primary text-primary text-center font-black uppercase tracking-[0.18em] text-[15px] py-4 px-2.5 rounded-[10px]">
      Alphaday Data Layer
    </div>

    <FlowArrows count={4} direction="down" />

    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {OUTPUTS.map(({ name, detail }) => (
        <div
          key={name}
          className="bg-surface border border-surface-border rounded-[9px] px-1 py-2.75 text-center"
        >
          <span className="block text-text font-extrabold text-[11.5px] leading-tight">
            {name}
          </span>
          <span className="block text-text-muted/70 text-[9.5px] mt-0.75 leading-tight">
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
      <div className="relative mx-auto w-11/12 max-w-7xl grid lg:grid-cols-[1.04fr_0.96fr] gap-12 lg:gap-16 items-center py-24 lg:py-26">
        <div>
          <h1 className="font-display text-[clamp(42px,5.8vw,66px)] leading-[1.04] font-extrabold tracking-tight text-text">
            All of crypto.
            <br />
            <span className="text-primary">One data layer.</span>
          </h1>
          <p className="text-text-muted text-[18.5px] mt-5 max-w-140">
            Alphaday structures every crypto data type into one queryable layer
            — for AI agents, apps, and humans. Plug in with MCP or REST. Free,
            no signup, no API key.
          </p>
          <div className="mt-8 flex flex-wrap gap-3.5">
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
