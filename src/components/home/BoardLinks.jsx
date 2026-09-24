import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Section, Div } from "../../shared";
import CONFIG from "../../config";

function BoardLinks() {
  const boards = CONFIG.featuredBoards;
  if (!boards?.length) return null;

  return (
    <Section className="bg-shark border-white/5">
      <Div>
        <h2 className="text-platinum text-xl md:text-2xl font-medium mb-2 text-center">
          Explore crypto dashboards
        </h2>
        <p className="text-aluminium text-sm md:text-base mb-8 text-center">
          A dedicated, customizable workspace for every major ecosystem.
        </p>
        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
          {boards.map((b) => (
            <a
              key={b.slug}
              href={`/${b.slug}`}
              className="group inline-flex items-center gap-1.5 bg-black/40 border border-white/5 text-platinum hover:border-california/40 hover:text-california transition-colors duration-200 rounded-full px-4 py-2 text-sm md:text-base"
              aria-label={`${b.name} dashboard`}
            >
              <span>{b.name}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </Div>
    </Section>
  );
}

export default BoardLinks;
