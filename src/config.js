import coverImg from "./images/seo1200x627-black.png";

const CONFIG = {
  privacyPolicy: `${window.location.origin}/privacy-policy`,
  terms: "https://alpahday.com/terms",
  feedBack: "https://forms.gle/hBXWWTAvsN7dAMN66",
  discord: "https://alphaday.com/discord",
  twitter: "https://twitter.com/AlphadayHQ",
  alphadayApp: "https://app.alphaday.com",
  blog: "https://blog.alphaday.com",
  linkedin: "https://www.linkedin.com/company/alphaday",
  // import.meta.env.PROD returns a boolean on whether the app is running in production
  emailSubscrptionUrl: `https://api.${
    import.meta.env.PROD ? "alphaday" : "zettaday"
  }.com/v1/user/email_subscriptions/subscribe/`,
  seo: {
    domain: "https://alphaday.com",
    siteName: "Alphaday",
    defaultTitle: "Alphaday",
    defaultDescription: "Everything Crypto, All in one place.",
    socialLinks: {
      twitter: "https://twitter.com/AlphadayHQ",
    },
    cover: coverImg,
  },
  CLARITY_ID: import.meta.env.VITE_CLARITY_PROJECT_ID ?? "",
};

export default CONFIG;
