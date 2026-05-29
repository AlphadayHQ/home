// Dev-only mock payloads matching the /ui/landing-pages/?slug={slug} contract.
// Used when VITE_USE_MOCKS=true so the UI can be iterated on without the backend.

const AVALANCHE = {
  slug: "avalanche",
  name: "Avalanche",
  icon: "https://s3.eu-west-1.amazonaws.com/dev-zettaday.com/media/icons/sources/avax_MppBUlK.png",
  token_symbol: "AVAX",
  meta: {
    title: "Avalanche (AVAX) Dashboard — Price, News, Research & Governance",
    description:
      "Track AVAX price, Avalanche news, daily AI briefings, governance, research reports, ecosystem projects, dev docs and jobs — from one free, customizable dashboard.",
    og_image: null,
  },
  hero: {
    headline: "Avalanche (AVAX), the full stack.",
    subheading:
      "AVAX price, daily AI briefings, news, governance proposals, on-chain activity, research reports, ecosystem directory, dev docs, jobs and the events calendar — every Avalanche signal on a single customizable workspace.",
  },
  category_cards: [
    {
      id: "briefing",
      heading: "Daily Avalanche briefing",
      description:
        "An AI-generated summary of the day's most important Avalanche stories, governance moves and on-chain shifts — refreshed every morning so you start the day already caught up.",
    },
    {
      id: "news",
      heading: "Avalanche news",
      description:
        "Curated AVAX headlines and Avalanche ecosystem updates from 200+ crypto outlets, official channels and ecosystem blogs — filtered to what actually matters.",
    },
    {
      id: "price",
      heading: "AVAX price & market data",
      description:
        "Live AVAX price, 24h volume, market cap, circulating supply, all-time highs and lows, plus historical charts across any timeframe.",
    },
    {
      id: "governance",
      heading: "Avalanche governance",
      description:
        "Active proposals, recent votes and governance discussions — surfaced as they happen so you never miss a decision affecting the network.",
    },
    {
      id: "onchain",
      heading: "On-chain activity",
      description:
        "Daily active addresses, transactions, fees, bridge flows and validator stats across the C-Chain and major Avalanche subnets.",
    },
    {
      id: "research",
      heading: "Research reports",
      description:
        "Long-form Avalanche research aggregated from Messari, Binance Research, Investopedia, CoinDesk and 50+ other sources — the work other analysts cite.",
    },
    {
      id: "ecosystem",
      heading: "Avalanche ecosystem",
      description:
        "A live directory of projects building on Avalanche — DeFi, NFTs, gaming, infrastructure and subnets — with category tags and links you can browse in seconds.",
    },
    {
      id: "social",
      heading: "Community & social",
      description:
        "What Avalanche builders, validators and holders are saying across X, Reddit and Discord — all in one ranked stream.",
    },
    {
      id: "forum",
      heading: "Forum discussions",
      description:
        "Long-form posts and threads from the Avalanche forum — bridge integrations, subnet proposals, ecosystem ideas and the conversations behind them.",
    },
    {
      id: "events",
      heading: "Events & calls",
      description:
        "A classified calendar of AMAs, validator calls, hackathons, DAO votes, dev calls and Avalanche-focused conferences — never miss an ecosystem moment.",
    },
    {
      id: "videos",
      heading: "Videos",
      description:
        "Latest Avalanche video coverage: AVAX market analysis, subnet deep dives, ecosystem tutorials and developer explainers — with a curated channel directory.",
    },
    {
      id: "podcasts",
      heading: "Podcasts",
      description:
        "Episodes covering Avalanche news, subnet deep dives, validator economics and broader ecosystem analysis — across a curated set of crypto-native shows.",
    },
    {
      id: "blog",
      heading: "Blog & official posts",
      description:
        "Official Avalanche posts and ecosystem Medium articles — the long-form complement to the news feed, surfaced as they're published.",
    },
    {
      id: "devdocs",
      heading: "Developer docs",
      description:
        "Direct links into the Avalanche developer documentation: launch your first subnet, deploy an ERC-20, integrate the C-Chain on an exchange and more.",
    },
    {
      id: "jobs",
      heading: "Hiring & job board",
      description:
        "Open roles across the Avalanche ecosystem — from foundation positions to subnet teams and ecosystem startups, kept up to date for active job seekers.",
    },
    {
      id: "token",
      heading: "AVAX token metrics",
      description:
        "Supply mechanics, staking participation, validator economics and exchange listings for AVAX in one place.",
    },
  ],
  intro_paragraph:
    "If you follow Avalanche, you already know how exhausting the daily ritual is. AVAX price action lives on one site, governance proposals on another, ecosystem news scattered across X and Discord, dev docs in a separate portal, research reports behind paywalls, hiring on a third site, and on-chain analytics buried behind dashboards that weren't built for daily reading. The Alphaday Avalanche dashboard pulls all of it — every signal a serious Avalanche user actually needs — into a single customizable workspace, so you spend your time understanding what's happening on the network, not switching tabs to find it.",
  about_project:
    "Avalanche is a high-throughput, low-latency layer-1 blockchain built around a novel consensus protocol and a modular subnet architecture that lets independent networks settle to a shared security layer. Its ecosystem spans DeFi, institutional finance, tokenized real-world assets, web3 gaming and a growing roster of enterprise subnets — one of the more diverse layer-1 ecosystems out there.\n\nThe Alphaday Avalanche dashboard isn't just a price tracker. It pulls together the daily AI-generated briefing, news from 200+ outlets, governance proposals, on-chain analytics, long-form research from Messari, Binance Research, Investopedia and CoinDesk, the live ecosystem projects directory, the official developer documentation, a classified calendar of validator calls, hackathons and DAO votes, and the Avalanche hiring board — every layer of the stack on one page.\n\nWhether you hold AVAX, validate on the network, build on a subnet or simply follow where the ecosystem is heading, every panel can be added, removed, resized or filtered. Want a focused trading view with just the AVAX price chart and ecosystem news? Hide the rest. Want to follow governance proposals alongside research reports and validator activity? Pin those panels to the top. The dashboard adapts to how you work — not the other way around.",
  value_props: [
    {
      heading: "Everything Avalanche, one screen",
      body: "Stop bouncing between CoinGecko, X, governance forums and block explorers. Every Avalanche signal lives on a single dashboard.",
    },
    {
      heading: "Real-time, all the time",
      body: "Price, news, governance and on-chain widgets pull from 200+ sources in real time. If something's happening in Avalanche, it shows up here first.",
    },
    {
      heading: "Built around how you work",
      body: "Drag, resize, swap, hide. Save your layout once and your Avalanche workspace looks exactly the same every time you open it.",
    },
  ],
  faqs: [
    {
      question: "What is Avalanche (AVAX)?",
      answer:
        "Avalanche is a layer-1 blockchain known for fast finality, low fees and its subnet architecture — independent networks that can launch their own rules while settling to a shared security layer. AVAX is the native token used for fees, staking and governance.",
    },
    {
      question: "What is the Alphaday Avalanche dashboard?",
      answer:
        "A customizable workspace that pulls Avalanche news, AVAX price data, governance proposals, on-chain analytics and social activity into a single page. Every widget can be rearranged, resized or hidden to fit how you actually use the information.",
    },
    {
      question: "Is the Avalanche dashboard free to use?",
      answer:
        "Yes. The Avalanche dashboard is free and does not require an account to view. Signing in lets you save layouts and sync them across devices.",
    },
    {
      question: "Where does the AVAX price data come from?",
      answer:
        "Price, volume, market cap and historical chart data are aggregated from major exchange APIs and updated in real time. You can switch between time ranges and pair denominations directly inside the price widget.",
    },
    {
      question: "Can I track Avalanche governance proposals here?",
      answer:
        "Yes. The governance widget shows active and recent proposals, voting status and links through to the original discussion so you never miss a decision that affects the network.",
    },
    {
      question: "Which news sources does the Avalanche feed cover?",
      answer:
        "The news widget pulls from 200+ crypto media outlets, official Avalanche channels, ecosystem blogs and curated X / Discord sources — filtered to surface what's actually relevant to Avalanche and AVAX.",
    },
    {
      question: "Can I see activity from Avalanche subnets?",
      answer:
        "Yes. On-chain widgets cover the C-Chain and the most active Avalanche subnets — including daily active addresses, transactions, fees and bridge volume. New subnets are added as they reach meaningful activity.",
    },
    {
      question: "Can I customize which widgets appear on my Avalanche dashboard?",
      answer:
        "Every panel can be added, removed, resized, filtered or reordered. Save your layout and it will persist next time you open the dashboard.",
    },
  ],
  sibling_dashboards: [
    { slug: "ethereum", name: "Ethereum" },
    { slug: "solana", name: "Solana" },
    { slug: "base", name: "Base" },
    { slug: "polygon", name: "Polygon" },
    { slug: "berachain", name: "Berachain" },
    { slug: "fantom", name: "Fantom" },
    { slug: "alephium", name: "Alephium" },
    { slug: "arbitrum", name: "Arbitrum" },
    { slug: "optimism", name: "Optimism" },
  ],
};

export const LANDING_MOCKS = {
  avalanche: AVALANCHE,
};
