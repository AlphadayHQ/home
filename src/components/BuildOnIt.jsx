import React from "react";
import { CodeBlock } from "./ui/CodeBlock";
import { LINK } from "./PostBody";

/**
 * Where a post page sends a reader next: one block, after the sources, offering
 * the feed the page was researched from.
 *
 * In the order the site ranks its readers: a working call first, because for
 * someone wiring the data into an agent or a bot a request that answers beats any
 * sentence about it; then one action in orange, the API; then the recipe, MCP
 * and a related feed as plain links. Each page passes its own copy and call; the
 * call must come from `data/apiSurface.js`, like every command the site prints.
 */
const BuildOnIt = ({ title, intro, code, action, next }) => (
  <div className="mt-14 max-w-160 border-t border-surface-border pt-10">
    <h2 className="font-display text-[26px] font-medium tracking-tight text-text">{title}</h2>
    <p className="mt-3 text-[16px] text-text-muted">{intro}</p>
    <div className="mt-5 rounded-xl border border-surface-border bg-surface p-1.5">
      <CodeBlock code={code} language="bash" />
    </div>
    <p className="mt-5 text-[17px]">
      <a
        href={action.href}
        className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:text-primary-hover"
      >
        {action.label}
      </a>
    </p>
    <ul className="mt-6 flex flex-col gap-4">
      {next.map((step) => (
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

export default BuildOnIt;
