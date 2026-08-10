import React from "react";
import { ArrowRight } from "lucide-react";
import { Section } from "../../shared";
import { CodeBlock } from "../ui/CodeBlock";
import CONFIG from "../../config";
import { API_COMMANDS, API_STATS, HOME_TOOLS, TOOL_COUNT } from "../../data/apiSurface";

const QUICKSTARTS = [
  {
    step: "1",
    title: "MCP Server",
    context: "Claude · Cursor · your agent",
    code: API_COMMANDS.mcporter,
    footer:
      "Every endpoint arrives as a pre-described tool. Your agent knows exactly what to do.",
  },
  {
    step: "2",
    title: "REST API",
    context: "any language",
    code: API_COMMANDS.news,
    footer:
      "Ask by project, not endpoint. One call returns every content type, tagged and deduped.",
  },
];

function Builders() {
  return (
    <Section id="builders" className="bg-background scroll-mt-16">
      <div className="mx-auto w-11/12 max-w-7xl pt-24">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary mb-3.5">
          For builders
        </p>
        <h2 className="font-display text-[clamp(26px,3.6vw,38px)] leading-tight font-extrabold tracking-tight text-text">
          Works with your stack.
        </h2>
        <p className="text-text-muted text-[17px] max-w-160 mt-3.5">
          One-line setup for every major MCP client. Or plain REST if your agent
          doesn&apos;t speak MCP. Same data either way.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mt-11">
          {QUICKSTARTS.map(({ step, title, context, code, footer }) => (
            <div key={title} className="flex flex-col">
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="w-5.5 h-5.5 shrink-0 rounded-md bg-primary text-background font-mono font-bold text-xs flex items-center justify-center">
                  {step}
                </span>
                <h3 className="text-[15.5px] font-extrabold text-text">{title}</h3>
                <span className="ml-auto text-xs text-text-muted font-mono">
                  {context}
                </span>
              </div>
              <CodeBlock code={code} language="bash" className="grow flex items-center" />
              <p className="text-[13.5px] text-text-muted mt-3.5">{footer}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-12">
          {HOME_TOOLS.map(({ name, desc }) => (
            <div
              key={name}
              className="bg-surface-light border border-surface-border rounded-[10px] px-4.25 py-3.75 hover:border-primary/50 transition-colors"
            >
              <div className="font-mono text-[13.5px] font-semibold text-primary">
                {name}
              </div>
              <div className="text-[13.5px] text-text-muted mt-1">{desc}</div>
            </div>
          ))}
        </div>

        <a
          className="group inline-flex items-center gap-2 mt-5 font-bold text-[14.5px] text-text hover:text-primary transition-colors"
          href={CONFIG.api}
        >
          {TOOL_COUNT} tools, zero setup — see all
          <ArrowRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-1" />
        </a>
      </div>

      <div className="bg-primary text-background py-12 mt-18">
        <div className="mx-auto w-11/12 max-w-7xl grid md:grid-cols-3 gap-6 text-center font-display">
          {API_STATS.map(({ num, label }) => (
            <div key={label}>
              <div className="text-[clamp(32px,4.6vw,48px)] font-black tracking-tight leading-none">
                {num}
              </div>
              <div className="text-[12.5px] font-bold uppercase tracking-widest mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export default Builders;
