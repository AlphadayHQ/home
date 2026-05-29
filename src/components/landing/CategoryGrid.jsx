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
  Sparkles,
  FileSearch,
  Boxes,
  MessageCircle,
  Code,
  Briefcase,
  ArrowUpRight,
} from "lucide-react";

const CARD_ICONS = {
  briefing: Sparkles,
  news: Newspaper,
  price: LineChart,
  governance: Vote,
  onchain: Activity,
  research: FileSearch,
  ecosystem: Boxes,
  social: MessagesSquare,
  forum: MessageCircle,
  events: Calendar,
  videos: Video,
  podcasts: Mic,
  blog: BookOpen,
  devdocs: Code,
  jobs: Briefcase,
  token: Coins,
};

function CategoryGrid({ name, cards }) {
  if (!cards?.length) return null;

  const [featured, ...rest] = cards;
  const FeaturedIcon = CARD_ICONS[featured.id];

  return (
    <Section className="bg-eerie">
      <Div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-5 mb-14 md:mb-20 md:items-end">
          <div className="md:col-span-7">
            <div className="text-california text-[11px] uppercase tracking-[0.22em] font-medium mb-4">
              The {name} workspace
            </div>
            <Title className="text-platinum mb-0 max-w-2xl">
              Everything {name}, all in one place
            </Title>
          </div>
          <p className="md:col-span-5 text-aluminium text-sm md:text-base leading-relaxed md:pb-2">
            {cards.length} connected views — from the daily briefing through
            on-chain activity — laid out on a workspace you rearrange any way
            you like.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <article className="group relative sm:col-span-2 lg:row-span-2 bg-linear-to-br from-black/9 via-black/40 to-black/40 rounded-2xl p-7 md:p-9 flex flex-col overflow-hidden">
            <div className="w-14 h-14 rounded-xl bg-california text-black flex items-center justify-center mb-7">
              {FeaturedIcon && <FeaturedIcon className="w-6 h-6" />}
            </div>
            <h3 className="text-platinum text-2xl md:text-[28px] font-medium tracking-tight leading-tight mb-3">
              {featured.heading}
            </h3>
            <p className="text-aluminium text-sm md:text-base leading-relaxed max-w-md">
              {featured.description}
            </p>
            <div className="mt-auto pt-10 flex items-center gap-2 text-california text-[11px] uppercase tracking-[0.22em] font-medium">
              <span className="h-px w-8 bg-california/60" />
              Featured
            </div>
            <ArrowUpRight className="absolute top-7 right-7 w-5 h-5 text-aluminium/40 group-hover:text-california group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300" />
          </article>

          {rest.map((card) => {
            const Icon = CARD_ICONS[card.id];
            return (
              <article
                key={card.id}
                className="group relative bg-black/30 hover:bg-black/55 rounded-xl p-5 transition-colors duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 shrink-0 rounded-md bg-california/10 text-california flex items-center justify-center group-hover:bg-california/20 transition-colors duration-300">
                    {Icon && <Icon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-platinum text-[15px] font-medium leading-snug mb-1.5">
                      {card.heading}
                    </h3>
                    <p className="text-aluminium text-[13px] leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Div>
    </Section>
  );
}

export default CategoryGrid;
