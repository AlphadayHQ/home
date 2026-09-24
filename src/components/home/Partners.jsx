import React from "react";
import { partners } from "./partnersData";
import { Section } from "../../shared";

function Partners() {
  return (
    <Section id="partners" className="bg-surface border-y border-surface-border">
      <div className="mx-auto w-11/12 max-w-7xl py-20 text-center">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-muted">
          Board Partners
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-5 gap-y-6 mt-11 place-items-center">
          {partners.map(({ id, img, partner, slug, size }) => (
            <a
              key={id}
              target="_blank"
              rel="noreferrer"
              href={slug ? `https://app.alphaday.com/b/${slug}` : undefined}
              className="transcale flex items-center justify-center"
            >
              <img src={img} className={size} alt={partner} title={partner} />
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}

export default Partners;
