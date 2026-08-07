import dashboards from "../../images/products/dashboards.jpg";
import apimcp from "../../images/products/apimcp.jpg";
import pulse from "../../images/products/pulse.jpg";
import recipes from "../../images/products/recipes.jpg";
import alphadaytv from "../../images/products/alphadaytv.jpg";
import CONFIG from "../../config";

// The source screenshots are tall deck slides. `focus` picks the region worth
// showing once they are cropped into the card's aspect ratio.
const products = [
  {
    name: "Dashboards",
    blurb: "Custom dashboards for crypto's biggest communities.",
    img: dashboards,
    focus: "object-top",
    alt: "Alphaday dashboard showing news, market and calendar widgets",
    link: { label: "app.alphaday.com", href: CONFIG.alphadayApp },
  },
  {
    name: "API & MCP",
    blurb: "Universal data feed. Free, no signup.",
    img: apimcp,
    focus: "object-top",
    alt: "Alphaday API response in a terminal",
    link: { label: "Start building", href: CONFIG.api },
  },
  {
    name: "Pulse",
    blurb: "TikTok-style crypto app — the layer, in a scroll.",
    img: pulse,
    focus: "object-top",
    alt: "Pulse mobile app feed cards",
    // DEV: confirm whether Pulse is the existing Alphaday mobile app or a new
    // listing — currently points at the /mobile page.
    link: { label: "Get the app", href: CONFIG.mobile },
  },
  {
    name: "Recipes",
    blurb: "Personalized push alerts from any signal.",
    img: recipes,
    focus: "object-center",
    alt: "Recipe builder configuring a Bitcoin price alert",
    link: { label: "Cook your own", href: CONFIG.alphadayApp },
  },
  {
    name: "Alphaday TV",
    badge: "Soon",
    blurb: "24/7 AI-generated crypto news channel.",
    img: alphadaytv,
    focus: "object-top",
    alt: "Alphaday TV daily briefing broadcast frame",
  },
];

export { products };
