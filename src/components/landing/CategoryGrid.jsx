import React from "react";
import { Section, Div, Title } from "../../shared";
import { CATEGORY_CARDS, renderTemplate } from "./categoryCards";

function CategoryGrid({ project, token, cardIds }) {
  if (!cardIds?.length) return null;

  return (
    <Section className="bg-eerie">
      <Div>
        <Title className="text-platinum text-center mb-12">
          Everything {project}, all in one place
        </Title>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardIds.map((id) => {
            const card = CATEGORY_CARDS[id];
            if (!card) return null;
            const Icon = card.icon;
            return (
              <div
                key={id}
                className="bg-black/40 border border-white/5 rounded-xl p-6 hover:border-california/30 transition-colors duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-california/15 text-california flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-platinum text-lg font-medium mb-2">
                  {card.heading}
                </h3>
                <p className="text-aluminium text-sm leading-relaxed">
                  {renderTemplate(card.description, { project, token })}
                </p>
              </div>
            );
          })}
        </div>
      </Div>
    </Section>
  );
}

export default CategoryGrid;
