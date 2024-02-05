import coverImg from "./images/seo1200x627-black.png";

const ALPHADAY_ROOT_URL = "https://alphaday.com/";

const CONFIG = {
  privacyPolicy: ALPHADAY_ROOT_URL + "privacy",
  terms: ALPHADAY_ROOT_URL + "terms",
  feedBack: "https://forms.gle/hBXWWTAvsN7dAMN66",
  discord: ALPHADAY_ROOT_URL + "discord",
  twitter: "https://twitter.com/AlphadayHQ",
  alphadayApp: "https://app.alphaday.com",
  blog: "https://blog.alphaday.com",
  linkedin: "https://www.linkedin.com/company/alphaday",
  // import.meta.env.PROD returns a boolean on whether the app is running in production
  emailSubscrptionUrl: `https://api.${import.meta.env.PROD ? "alphaday" : "zettaday"
    }.com/v1/user/email_subscriptions/subscribe/`,
  seo: {
    domain: ALPHADAY_ROOT_URL,
    siteName: "Alphaday",
    defaultTitle: "Alphaday",
    defaultDescription: "Everything Crypto, All in one place.",
    socialLinks: {
      twitter: "https://twitter.com/AlphadayHQ",
    },
    cover: coverImg,
  },
  CLARITY_ID: import.meta.env.VITE_CLARITY_PROJECT_ID ?? "",
  blogLinks: {
    learn: [
      {
        title: "Making Money with Cryptocurrency",
        link: "https://blog.alphaday.com/p/making-money-with-cryptocurrency",
      },
      {
        title: "How to Build a Cryptocurrency Dashboard",
        link: "https://blog.alphaday.com/p/how-to-build-a-cryptocurrency-dashboard",
      },
      {
        title: "What Is Crypto Halving: A Bitcoin Story",
        link: "https://blog.alphaday.com/p/what-is-crypto-halving-a-bitcoin",
      },
      {
        title: "How To Set Up Ethereum Wallet",
        link: "https://blog.alphaday.com/p/how-to-set-up-ethereum-wallet",
      },
      {
        title: "How to Read Crypto Charts",
        link: "https://blog.alphaday.com/p/how-to-read-crypto-charts-full-guide",
      },
      {
        title: "Crypto Asset Management Guide",
        link: "https://blog.alphaday.com/p/crypto-asset-management-guide",
      },
      {
        title: "Staking vs. Liquidity Mining (Yield Farming)",
        link: "https://blog.alphaday.com/p/staking-vs-liquidity-mining-yield",
      },
    ],
    "Crypto 101": [
      {
        title: "What is Bitcoin?",
        link: "https://blog.alphaday.com/p/what-is-bitcoin",
      },
      {
        title: "What Is Ethereum?",
        link: "https://blog.alphaday.com/p/what-is-ethereum",
      },
      {
        title: "What is Wrapped Crypto?",
        link: "https://blog.alphaday.com/p/what-is-wrapped-crypto",
      },
      {
        title: "What is Arbitrum?",
        link: "https://blog.alphaday.com/p/what-is-arbitrum-everything-you-need",
      },
      {
        title: "What is zkSync?",
        link: "https://blog.alphaday.com/p/understanding-zksync-from-scratch",
      },
    ],
  },
};

export default CONFIG;
