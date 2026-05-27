import React from "react";
import { Section, Div, Title } from "../../shared";
import {
  Newspaper,
  LineChart,
  Vote,
  Activity,
  MessagesSquare,
  Calendar,
  Video,
  Mic,
  BookOpen,
  Coins,
} from "lucide-react";

const CARD_ICONS = {
  news: Newspaper,
  price: LineChart,
  governance: Vote,
  onchain: Activity,
  social: MessagesSquare,
  events: Calendar,
  videos: Video,
  podcasts: Mic,
  blog: BookOpen,
  token: Coins,
};

function CategoryGrid({ name, cards }) {
  if (!cards?.length) return null;

  return (
    <Section className="bg-eerie">
      <Div>
        <Title className="text-platinum text-center mb-12">
          Everything {name}, all in one place
        </Title>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = CARD_ICONS[card.id];
            return (
              <div
                key={card.id}
                className="bg-black/40 border border-white/5 rounded-xl p-6 hover:border-california/30 transition-colors duration-300"
              >
                <div className="w-11 h-11 rounded-lg bg-california/15 text-california flex items-center justify-center mb-4">
                  {Icon && <Icon className="w-5 h-5" />}
                </div>
                <h3 className="text-platinum text-lg font-medium mb-2">
                  {card.heading}
                </h3>
                <p className="text-aluminium text-sm leading-relaxed">
                  {card.description}
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
