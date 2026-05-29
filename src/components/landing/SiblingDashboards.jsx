import React from "react";
import { Section, Div } from "../../shared";
import { ArrowUpRight } from "lucide-react";

function SiblingDashboards({ siblings, currentName }) {
  if (!siblings?.length) return null;

  return (
    <Section className="bg-shark border-t border-white/5">
      <Div className="py-12! md:py-16!">
        <h2 className="text-platinum text-xl md:text-2xl font-medium mb-2">
          Explore other dashboards
        </h2>
        <p className="text-aluminium text-sm md:text-base mb-8">
          The same workspace, tuned for the rest of the ecosystem.
        </p>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {siblings.map((s) => (
            <a
              key={s.slug}
              href={`/${s.slug}`}
              className="group inline-flex items-center gap-1.5 bg-black/40 border border-white/5 text-platinum hover:border-california/40 hover:text-california transition-colors duration-200 rounded-full px-4 py-2 text-sm md:text-base"
              aria-label={`${s.name} dashboard`}
            >
              <span>{s.name}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </Div>
    </Section>
  );
}

export default SiblingDashboards;
