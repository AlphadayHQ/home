import React from "react";
import { backers, contributors } from "./backersData";
import { Section } from "../../shared";

function Backers() {
  return (
    <Section className="bg-background">
      <div className="mx-auto w-11/12 max-w-7xl py-20 text-center">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-muted">
          Our Backers
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-5 gap-y-6 mt-11 place-items-center">
          {backers.map(({ id, img, partner, link, size }) => (
            <a
              key={id}
              target="_blank"
              rel="noreferrer"
              href={link}
              className="transcale flex items-center justify-center"
            >
              <img src={img} className={size} alt={partner} title={partner} />
            </a>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-10 mt-12">
          {contributors.map(({ id, img, contributor, handle, link }) => (
            <div key={id} className="text-center">
              <a target="_blank" rel="noreferrer" href={link}>
                <img
                  src={img}
                  className="w-19 h-19 mx-auto mb-3"
                  alt={contributor}
                />
              </a>
              <p className="font-bold text-[15px] text-text">{contributor}</p>
              <a
                target="_blank"
                rel="noreferrer"
                href={link}
                className="inline-block mt-1.75 bg-surface-light border border-surface-border rounded-full px-3 py-1 text-[12.5px] text-text-muted hover:text-text transition-colors"
              >
                {handle}
              </a>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

export default Backers;
