const ALPHADAY_ROOT_URL = "https://alphaday.com/";
// Absolute on purpose: several OG crawlers cannot resolve relative paths.
// There is no longer a static fallback to keep in sync — index.html is gone and
// every page server-renders its own head, so this is the single source.
const coverImg = `${ALPHADAY_ROOT_URL}assets/seo1200x627-black.png`;

const CONFIG = {
  privacyPolicy: "/privacy",
  video: {
    title: "Alphaday Video",
    link: "https://www.youtube.com/embed/ThCd_W3rK_8",
  },
  mobile: "/mobile",
  dashboards: "/dashboards",
  dashboard: "/dashboard",
  pulse: "https://getpulse.xyz/",
  recipes: "https://recipes.alphaday.com/",
  api: "/api",
  apiDocs: "/api/docs",
  mcp: "/mcp",
  cookbook: "/cookbook",
  /*
   * The research pages, linked from the footer so every page reaches them; until
   * then only the sitemap did. Each must match the constant its route reads
   * (`data/trending.ts` and the rest), which `footer-links.test.ts` checks.
   */
  research: {
    exploits: "/security/exploits",
    governance: "/research/governance",
    trending: "/research/trending",
    podcasts: "/research/podcasts",
  },
  events: "/events",
  appStore: {
    apple: "https://apps.apple.com/us/app/alphaday/id1581443943",
    google: "https://play.google.com/store/apps/details?id=com.alphaday",
  },
  terms: ALPHADAY_ROOT_URL + "terms",
  feedBack: "https://forms.gle/hBXWWTAvsN7dAMN66",
  discord: ALPHADAY_ROOT_URL + "discord",
  twitter: "https://twitter.com/AlphadayHQ",
  alphadayApp: "https://app.alphaday.com",
  blog: "https://blog.alphaday.com",
  linkedin: "https://www.linkedin.com/company/alphaday",
  // import.meta.env.PROD returns a boolean on whether the app is running in production
  emailSubscrptionUrl: `https://api.${
    import.meta.env.PROD ? "alphaday" : "zettaday"
  }.com/v1/user/email_subscriptions/subscribe/`,
  seo: {
    domain: ALPHADAY_ROOT_URL,
    siteName: "Alphaday",
    defaultTitle: "Alphaday",
    defaultDescription: "Everything Crypto, All in one place.",
    socialLinks: {
      // twitter:site expects the @handle, not a profile URL. Use CONFIG.twitter
      // above for anything that needs a clickable link.
      twitter: "@AlphadayHQ",
    },
    cover: coverImg,
  },
  CLARITY_ID: import.meta.env.VITE_CLARITY_PROJECT_ID ?? "",
  // Curated board landing pages featured on the home page (internal-linking / SEO).
  // Each slug must map to a published page served at alphaday.com/projects/{slug}.
  featuredBoards: [
    { slug: "ethereum", name: "Ethereum" },
    { slug: "solana", name: "Solana" },
    { slug: "base", name: "Base" },
    { slug: "arbitrum", name: "Arbitrum" },
    { slug: "optimism", name: "Optimism" },
    { slug: "polygon", name: "Polygon" },
    { slug: "avalanche", name: "Avalanche" },
    // berachain removed: it is a board in /ui/views/ but has no record in
    // /ui/landing-pages/, so /berachain rendered a 404 from the home page.
    // Re-add only once the landing page exists — the sitemap now builds from
    // the landing-pages endpoint, so it will never publish a slug this list
    // gets wrong again, but this list is hand-maintained and still can.
  ],
};

export default CONFIG;
