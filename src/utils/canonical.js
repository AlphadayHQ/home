import CONFIG from "../config";

const ORIGIN = CONFIG.seo.domain.replace(/\/$/, "");

/**
 * Build the canonical URL for a route path.
 *
 * One helper so every page produces the same shape: absolute, no trailing
 * slash except at the root. Hand-built canonicals drifted before — `/dashboard`
 * and `/dashboards` are the same page and must resolve to one string.
 */
export const canonicalFor = (path = "/") => {
  if (path === "/" || path === "") return `${ORIGIN}/`;
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return `${ORIGIN}${withSlash.replace(/\/$/, "")}`;
};

export default canonicalFor;
