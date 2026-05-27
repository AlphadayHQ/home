// Dev-only mock payloads matching the /ui/landing-pages/?slug={slug} contract.
// Used when VITE_USE_MOCKS=true so the UI can be iterated on without the backend.

const AVALANCHE = {
  slug: "avalanche",
  name: "Avalanche",
  icon: "https://s3.eu-west-1.amazonaws.com/dev-zettaday.com/media/icons/sources/avax_MppBUlK.png",
  token_symbol: "AVAX",
  dashboard_url: "https://app.alphaday.com/b/avalanche",
  meta: {
    title: "Avalanche — News, Price, Governance & Analytics Dashboard",
    description:
      "Your all-in-one Avalanche dashboard. Track AVAX price, news, governance, on-chain data, community updates and more.",
    og_image: null,
  },
  hero: {
    headline: "The homepage for Avalanche enthusiasts.",
    subheading:
      "All the Avalanche news, prices, governance, on-chain data, and community updates — in one place.",
  },
  category_cards: [
    {
      id: "news",
      heading: "News",
      description:
        "Curated Avalanche headlines from hundreds of crypto media sources, blogs, and official announcements.",
    },
    {
      id: "price",
      heading: "Price & Market Data",
      description:
        "AVAX price, volume, market cap, circulating supply, 24h highs/lows, and historical charts.",
    },
    {
      id: "governance",
      heading: "Governance",
      description:
        "Active proposals, snapshot votes, and governance discussions — never miss a decision.",
    },
    {
      id: "social",
      heading: "Social Feed",
      description:
        "What the Avalanche community is saying across Twitter, Reddit, and Discord — one stream.",
    },
    {
      id: "events",
      heading: "Events",
      description:
        "Upcoming Avalanche AMAs, community calls, hackathons, and conferences.",
    },
    {
      id: "videos",
      heading: "Videos",
      description: "Latest Avalanche video content, tutorials, and explainers.",
    },
    {
      id: "podcasts",
      heading: "Podcasts",
      description:
        "Episodes covering Avalanche news, deep dives, and ecosystem analysis.",
    },
    {
      id: "blog",
      heading: "Blog & Forum",
      description:
        "Official posts, Medium articles, and community forum highlights.",
    },
    {
      id: "token",
      heading: "Token Metrics",
      description: "Supply mechanics, staking stats, and exchange listings.",
    },
  ],
  intro_paragraph:
    "If you follow Avalanche, you already know how exhausting it is to keep up. Price action lives on one site, governance proposals on another, ecosystem news scattered across Twitter and Discord, and on-chain analytics buried in dashboards that were not built for daily reading. This page pulls all of that into a single, drag-and-drop workspace so you spend time understanding what is happening — not switching tabs to find it.",
  about_project:
    "Avalanche is a high-throughput, low-latency layer-1 blockchain known for its subnet architecture and a developer ecosystem that spans DeFi, gaming, institutional finance, and tokenized real-world assets. Whether you are tracking AVAX as a holder, participating in governance, building on a subnet, or following the broader ecosystem, the Alphaday Avalanche dashboard surfaces what matters in one place.\n\nThe widgets you see are not a fixed template — every panel can be added, removed, resized, or filtered. Want only the news feed and the price chart for a focused trading view? Hide everything else. Want to follow governance proposals alongside community sentiment? Pin those panels at the top. The dashboard is yours.",
  value_props: [
    {
      heading: "Stop tab-hopping",
      body: "No more bouncing between CoinGecko, Twitter, governance forums, and block explorers. Everything about Avalanche lives here.",
    },
    {
      heading: "Always up to date",
      body: "Feeds pull from 200+ sources in real time. If something's happening in Avalanche, it shows up.",
    },
    {
      heading: "Make it yours",
      body: "Drag, resize, add, remove. Only see what you care about.",
    },
  ],
};

export const LANDING_MOCKS = {
  avalanche: AVALANCHE,
};
