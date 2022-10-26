import coverImg from "./images/seo1200x627-black.png";

const CONFIG = {
  privacyPolicy:
    "https://app.termly.io/document/privacy-policy/ae1c7443-6788-4493-91d3-ba6f87ff05e0",
  terms:
    "https://app.termly.io/document/terms-of-use-for-website/0f183823-fe52-47af-87d2-d1058b844918",
  feedBack: "https://forms.gle/hBXWWTAvsN7dAMN66",
  discord: "https://alphaday.com/discord",
  twitter: "https://twitter.com/AlphadayHQ",
  alphadayApp: "https://app.alphaday.com",
  blog: "https://alphaday.substack.com",
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
};

export default CONFIG;