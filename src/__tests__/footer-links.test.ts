import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import CONFIG from "../config";
import Footer from "../components/footer/Footer";
import ApiPage from "../pages/api";
import { GOVERNANCE_SECTION } from "../data/governanceProposals";
import { PODCAST_HUB } from "../data/podcastPosts";
import { TRENDING_HUB } from "../data/trending";
import { indexStateFor } from "../seo/indexState";

/**
 * The research pages are reached from the footer, which every page renders.
 * Before it linked them, a crawler found them only through the sitemap, and a
 * reader not at all. These links are paths typed into `config.js`, so this
 * checks they cannot drift from the routes they point at.
 */

const LINKED = { ...CONFIG.research, events: CONFIG.events };

describe("the footer's research links", () => {
  it("are the paths the routes read", () => {
    expect(CONFIG.research.governance).toBe(GOVERNANCE_SECTION);
    expect(CONFIG.research.trending).toBe(TRENDING_HUB);
    expect(CONFIG.research.podcasts).toBe(PODCAST_HUB);
  });

  it("each go to a promoted page with a route of its own", () => {
    const router = createRouter({ routeTree });
    for (const [name, path] of Object.entries(LINKED)) {
      expect(indexStateFor(path), name).toBe("promoted");
      const matches = router.matchRoutes({ pathname: path, search: {} } as never);
      expect(matches[matches.length - 1]?.routeId, name).toBe(`${path}/`);
    }
  });

  it("are on the API page too, which draws a footer of its own", () => {
    const html = renderToStaticMarkup(createElement(ApiPage));
    for (const [name, path] of Object.entries(LINKED)) {
      expect(html, name).toContain(`href="${path}"`);
    }
  });

  it("are rendered, in the same tab", () => {
    const html = renderToStaticMarkup(createElement(Footer));
    for (const [name, path] of Object.entries(LINKED)) {
      expect(html, name).toContain(`href="${path}" target="_self"`);
    }
  });
});
