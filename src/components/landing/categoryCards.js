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
import { CARDS } from "./widgetCategoryMap";

// Description templates may include {project} and {token}.
// {token} segments wrapped in [[ ... ]] are dropped entirely when the token is unknown,
// so copy still reads cleanly without a ticker.
export const CATEGORY_CARDS = {
  [CARDS.NEWS]: {
    icon: Newspaper,
    heading: "News",
    description:
      "Curated {project} headlines from hundreds of crypto media sources, blogs, and official announcements.",
  },
  [CARDS.PRICE]: {
    icon: LineChart,
    heading: "Price & Market Data",
    description:
      "[[{token} ]]price, volume, market cap, circulating supply, 24h highs/lows, and historical charts.",
  },
  [CARDS.GOVERNANCE]: {
    icon: Vote,
    heading: "Governance",
    description:
      "Active proposals, snapshot votes, and governance discussions — never miss a decision.",
  },
  [CARDS.ONCHAIN]: {
    icon: Activity,
    heading: "On-Chain Analytics",
    description:
      "TVL, active addresses, transaction volume, and key network metrics at a glance.",
  },
  [CARDS.SOCIAL]: {
    icon: MessagesSquare,
    heading: "Social Feed",
    description:
      "What the {project} community is saying across Twitter, Reddit, and Discord — one stream.",
  },
  [CARDS.EVENTS]: {
    icon: Calendar,
    heading: "Events",
    description:
      "Upcoming {project} AMAs, community calls, hackathons, and conferences.",
  },
  [CARDS.VIDEOS]: {
    icon: Video,
    heading: "Videos",
    description:
      "Latest {project} video content, tutorials, and explainers.",
  },
  [CARDS.PODCASTS]: {
    icon: Mic,
    heading: "Podcasts",
    description:
      "Episodes covering {project} news, deep dives, and ecosystem analysis.",
  },
  [CARDS.BLOG]: {
    icon: BookOpen,
    heading: "Blog & Forum",
    description:
      "Official posts, Medium articles, and community forum highlights.",
  },
  [CARDS.TOKEN]: {
    icon: Coins,
    heading: "Token Metrics",
    description: "Supply mechanics, staking stats, and exchange listings.",
  },
};

export function renderTemplate(template, { project, token }) {
  let result = template;
  if (token) {
    result = result.replace(/\[\[([^\]]*)\]\]/g, "$1").replace(/\{token\}/g, token);
  } else {
    result = result.replace(/\[\[[^\]]*\]\]/g, "");
  }
  return result.replace(/\{project\}/g, project || "");
}
