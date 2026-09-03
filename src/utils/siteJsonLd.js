import CONFIG from "../config";
import { canonicalFor } from "./canonical";

const ORIGIN = canonicalFor("/").replace(/\/$/, "");

// Stable @ids so nodes can reference each other across pages instead of each
// page restating the organisation inline. Google follows these.
export const ORGANIZATION_ID = `${ORIGIN}/#organization`;
export const WEBSITE_ID = `${ORIGIN}/#website`;

/**
 * `sameAs` is the entity-reconciliation signal: it is how a search engine
 * decides that this Organization and the @AlphadayHQ posting on X are one
 * thing. Only profiles Alphaday actually controls belong here.
 */
const sameAs = [
  CONFIG.twitter,
  CONFIG.linkedin,
  CONFIG.blog,
  `${CONFIG.alphadayApp}`,
].filter(Boolean);

export const organizationNode = () => ({
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: CONFIG.seo.siteName,
  url: `${ORIGIN}/`,
  logo: CONFIG.seo.cover,
  description:
    "Alphaday is a crypto data layer: market, on-chain, news, governance, " +
    "research and event data normalised into one queryable API and MCP server.",
  sameAs,
});

export const webSiteNode = () => ({
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${ORIGIN}/`,
  name: CONFIG.seo.siteName,
  publisher: { "@id": ORGANIZATION_ID },
});

/**
 * Compose the homepage graph. Extra nodes (the FAQ) are appended rather than
 * merged so each keeps its own @type.
 */
export const buildSiteJsonLd = (nodes = []) => ({
  "@context": "https://schema.org",
  "@graph": [organizationNode(), webSiteNode(), ...nodes],
});
