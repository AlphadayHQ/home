// Marketing card ids — keep in sync with categoryCards.js
export const CARDS = {
  NEWS: "news",
  PRICE: "price",
  GOVERNANCE: "governance",
  ONCHAIN: "onchain",
  SOCIAL: "social",
  EVENTS: "events",
  VIDEOS: "videos",
  PODCASTS: "podcasts",
  BLOG: "blog",
  TOKEN: "token",
};

const EXACT = {
  news_widget: [CARDS.NEWS],
  news_summary: [CARDS.NEWS],
  market_widget: [CARDS.PRICE],
  forum_widget: [CARDS.GOVERNANCE],
  reddit_widget: [CARDS.SOCIAL],
  discord_widget: [CARDS.SOCIAL],
  twitter_widget: [CARDS.SOCIAL],
  video_widget: [CARDS.VIDEOS],
  podcast_widget: [CARDS.PODCASTS],
  calendar_widget: [CARDS.EVENTS],
  blog_widget: [CARDS.BLOG],
};

const PREFIX = [
  ["metadata_", [CARDS.TOKEN]],
  // TODO: confirm on-chain widget slug pattern once a dashboard with one is identified
  ["onchain_", [CARDS.ONCHAIN]],
  ["tvl_", [CARDS.ONCHAIN]],
];

const CARD_ORDER = [
  CARDS.NEWS,
  CARDS.PRICE,
  CARDS.GOVERNANCE,
  CARDS.ONCHAIN,
  CARDS.SOCIAL,
  CARDS.EVENTS,
  CARDS.VIDEOS,
  CARDS.PODCASTS,
  CARDS.BLOG,
  CARDS.TOKEN,
];

function cardsForSlug(slug) {
  if (!slug) return [];
  if (EXACT[slug]) return EXACT[slug];
  for (const [prefix, cards] of PREFIX) {
    if (slug.startsWith(prefix)) return cards;
  }
  return [];
}

export function deriveCards(board) {
  const widgets = board?.widgets || [];
  const present = new Set();
  for (const w of widgets) {
    for (const card of cardsForSlug(w?.widget?.slug)) {
      present.add(card);
    }
  }
  return CARD_ORDER.filter((c) => present.has(c));
}
