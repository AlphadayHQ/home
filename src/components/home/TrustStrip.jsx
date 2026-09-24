import React from "react";
import { Section } from "../../shared";
import { partners } from "./partnersData";

// The approved strip also lists Arbitrum, but there is no Arbitrum logo in
// src/images/partners/ — add one and append "Arbitrum" here to restore it.
const TRUSTED = ["Avalanche", "Aave", "Polygon", "Ripple", "TheGraph", "Worldcoin"];

const logos = TRUSTED.map((name) =>
  partners.find((partner) => partner.partner === name),
).filter(Boolean);

function TrustStrip() {
  return (
    <Section className="bg-surface border-y border-surface-border">
      <div className="mx-auto w-11/12 max-w-7xl py-8 flex flex-col items-center gap-5">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted text-center">
          The biggest projects in crypto already use us
        </span>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4 opacity-60 grayscale hover:grayscale-0 hover:opacity-90 transition-all duration-500">
          {logos.map(({ id, img, partner, size }) => (
            <img key={id} src={img} className={size} alt={partner} title={partner} />
          ))}
        </div>
      </div>
    </Section>
  );
}

export default TrustStrip;
