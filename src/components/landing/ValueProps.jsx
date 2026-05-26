import React from "react";
import { Section, Div, Title } from "../../shared";

function ValueProps({ project }) {
  const blocks = [
    {
      heading: "Stop tab-hopping",
      body: `No more bouncing between CoinGecko, Twitter, governance forums, and block explorers. Everything about ${project} lives here.`,
    },
    {
      heading: "Always up to date",
      body: `Feeds pull from 200+ sources in real time. If something's happening in ${project}, it shows up.`,
    },
    {
      heading: "Make it yours",
      body: "Drag, resize, add, remove. Only see what you care about.",
    },
  ];

  return (
    <Section className="bg-shark">
      <Div>
        <Title className="text-platinum text-center mb-12">
          Why use a {project} dashboard?
        </Title>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {blocks.map((b) => (
            <div key={b.heading}>
              <h3 className="text-platinum text-xl md:text-2xl font-medium mb-3">
                {b.heading}
              </h3>
              <p className="text-aluminium text-sm md:text-base leading-relaxed">
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </Div>
    </Section>
  );
}

export default ValueProps;
