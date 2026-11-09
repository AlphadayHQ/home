import React from "react";
import { Section, Div } from "../../shared";
import { proposalPath } from "../../data/governanceProposals";
import { exploitPostPath } from "../../data/exploitPosts";

const LinkList = ({ heading, links, pathOf }) => (
  <div>
    <h3 className="text-platinum text-base md:text-lg font-medium mb-3">{heading}</h3>
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.slug}>
          <a
            href={pathOf(link.slug)}
            className="text-aluminium hover:text-california text-sm md:text-base underline decoration-white/10 underline-offset-4 transition-colors duration-200"
          >
            {link.title}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Alphaday's research on this project: governance analyses of its DAO and
 * exploit analyses on its chain (`server/projectResearch.ts`).
 *
 * Below the call to action, beside the sibling dashboards, and titles only —
 * the page sells the dashboard, and this is somewhere to go after, not a reason
 * not to click. It is also the only way into these posts from the 66 project
 * pages, which linked to no research at all.
 */
function ProjectResearch({ research, name }) {
  const governance = research?.governance ?? [];
  const exploits = research?.exploits ?? [];
  if (governance.length === 0 && exploits.length === 0) return null;

  return (
    <Section className="bg-shark border-t border-white/5">
      <Div className="py-12! md:py-16!">
        <h2 className="text-platinum text-xl md:text-2xl font-medium mb-2">
          Alphaday research on {name}
        </h2>
        <p className="text-aluminium text-sm md:text-base mb-8">
          Written from Alphaday&rsquo;s feeds and reviewed, with every source each one read.
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          {governance.length > 0 && (
            <LinkList
              heading={`${name} governance, explained`}
              links={governance}
              pathOf={proposalPath}
            />
          )}
          {exploits.length > 0 && (
            <LinkList heading={`Exploits on ${name}`} links={exploits} pathOf={exploitPostPath} />
          )}
        </div>
      </Div>
    </Section>
  );
}

export default ProjectResearch;
