import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import CONFIG from "../config";
import { indexStateFor } from "../seo/indexState";
import { HEADLINE_CAPABILITIES } from "../data/mcpCapabilities";
import { entityKey, isAbout, projectSlugFor } from "../data/projectLinks";

/**
 * The links between the site's families of pages: the header and footer every
 * page wears, the MCP page into the capability pages, the capability pages into
 * the cookbook, and the research posts and project pages into each other.
 *
 * Before these, the agent-builder pages offered "Launch app" as the only way
 * on, /api linked nowhere near /mcp, and the research posts and the 66 project
 * pages did not link to each other at all.
 */

/** The two held lists, as `server/projectResearch.ts` reads them. */
const lists = vi.hoisted(() => ({ cold: false }));
/** A list still being walked: it never answers within the page's wait. */
const never = () => new Promise<never>(() => {});
vi.mock("../server/governanceProposals", () => ({
  readProposalList: async () => lists.cold ? never() : ({
    ok: true,
    asOf: "",
    rows: [
      { slug: "arb-one", title: "Arbitrum one", meta: { dao: "Arbitrum" } },
      { slug: "aave-one", title: "Aave one", meta: { dao: "Aave" } },
      { slug: "arb-two", title: "Arbitrum two", meta: { dao: "ARBITRUM" } },
      { slug: "no-dao", title: "No DAO", meta: { dao: null } },
    ],
  }),
}));
vi.mock("../server/exploits", () => ({
  readExploitList: async () => lists.cold ? never() : ({
    ok: true,
    asOf: "",
    rows: [
      { slug: "eth-hack", title: "Ethereum hack", meta: { chain: "Ethereum" } },
      { slug: "bnb-hack", title: "BNB hack", meta: { chain: "BNB Chain" } },
    ],
  }),
}));

const routeIdFor = (path: string): string | undefined => {
  const router = createRouter({ routeTree });
  const matches = router.matchRoutes({ pathname: path, search: {} } as never);
  return matches[matches.length - 1]?.routeId;
};

const html = (component: unknown, props: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(component as never, props as never));

describe("the join between research posts and project pages", () => {
  it("matches a DAO or chain to a slug once case and punctuation are dropped", () => {
    expect(entityKey("Ethereum Classic")).toBe("ethereumclassic");
    expect(isAbout("Arbitrum", "arbitrum")).toBe(true);
    expect(isAbout("Ethereum Classic", "ethereumclassic")).toBe(true);
    expect(isAbout("Ethereum", "ethereumclassic")).toBe(false);
    expect(isAbout(null, "arbitrum")).toBe(false);
    expect(isAbout("—", "")).toBe(false);
  });

  it("names the project page only where there is one", () => {
    const slugs = ["arbitrum", "aave", "zcash"];
    expect(projectSlugFor("Aave", slugs)).toBe("aave");
    expect(projectSlugFor("ENS", slugs)).toBeNull();
    expect(projectSlugFor(null, slugs)).toBeNull();
  });

  it("gives a project page its DAO's analyses and its chain's exploits, newest first", async () => {
    const { buildProjectResearch } = await import("../server/projectResearch");
    expect(await buildProjectResearch("arbitrum")).toEqual({
      governance: [
        { slug: "arb-one", title: "Arbitrum one" },
        { slug: "arb-two", title: "Arbitrum two" },
      ],
      exploits: [],
    });
    expect((await buildProjectResearch("ethereum")).exploits).toEqual([
      { slug: "eth-hack", title: "Ethereum hack" },
    ]);
    expect(await buildProjectResearch("solana")).toEqual({ governance: [], exploits: [] });
  });

  it("never holds a project page for a list that is still cold", async () => {
    const { buildProjectResearch } = await import("../server/projectResearch");
    lists.cold = true;
    try {
      const started = Date.now();
      expect(await buildProjectResearch("arbitrum")).toEqual({ governance: [], exploits: [] });
      expect(Date.now() - started).toBeLessThan(100);
    } finally {
      lists.cold = false;
    }
  });

  it("renders the research under a project page, and nothing when there is none", async () => {
    const { default: ProjectResearch } = await import("../components/landing/ProjectResearch");
    const { buildProjectResearch } = await import("../server/projectResearch");
    const page = html(ProjectResearch, {
      name: "Arbitrum",
      research: await buildProjectResearch("arbitrum"),
    });
    expect(page).toContain('href="/research/governance/arb-one"');
    expect(page).toContain("Arbitrum governance, explained");
    expect(html(ProjectResearch, { name: "Solana", research: { governance: [], exploits: [] } })).toBe("");
  });
});

describe("the header every Layout page wears", () => {
  it("offers the builder's next pages and Start building, not only Launch app", async () => {
    const { default: Layout } = await import("../shared/containers/Layout");
    const page = html(Layout, { children: null });
    for (const path of [CONFIG.mcp, CONFIG.cookbook, CONFIG.apiDocs, CONFIG.dashboards, CONFIG.api]) {
      expect(page, path).toContain(`href="${path}"`);
    }
    expect(page).toContain("Start building");
    // The home page's anchors mean nothing off it.
    expect(page).not.toContain('href="#layer"');
  });

  it("keeps the links reachable below lg, in a menu that needs no script to open", async () => {
    const { default: Layout } = await import("../shared/containers/Layout");
    const page = html(Layout, { children: null });
    const menu = page.slice(page.indexOf("<details"), page.indexOf("</details>"));
    expect(menu).toContain("lg:hidden");
    for (const path of [CONFIG.mcp, CONFIG.cookbook, CONFIG.apiDocs, CONFIG.dashboards, CONFIG.alphadayApp]) {
      expect(menu, path).toContain(`href="${path}"`);
    }
  });
});

describe("the footer's build and product links", () => {
  const LINKED = {
    api: CONFIG.api,
    mcp: CONFIG.mcp,
    apiDocs: CONFIG.apiDocs,
    cookbook: CONFIG.cookbook,
    dashboards: CONFIG.dashboards,
    mobile: CONFIG.mobile,
  };

  it("each go to a promoted page with a route of its own", () => {
    for (const [name, path] of Object.entries(LINKED)) {
      expect(indexStateFor(path), name).toBe("promoted");
      expect([path, `${path}/`], name).toContain(routeIdFor(path));
    }
  });

  it("are rendered, in the same tab", async () => {
    const { default: Footer } = await import("../components/footer/Footer");
    const page = html(Footer);
    for (const [name, path] of Object.entries(LINKED)) {
      expect(page, name).toContain(`href="${path}" target="_self"`);
    }
  });
});

describe("the API page", () => {
  it("links to the MCP page and the cookbook, and to nothing that is a placeholder", async () => {
    const { default: ApiPage } = await import("../pages/api");
    const page = html(ApiPage);
    expect(page).toContain(`href="${CONFIG.mcp}"`);
    expect(page).toContain(`href="${CONFIG.cookbook}"`);
    expect(page).not.toContain('href="#"');
  });
});

describe("the MCP page", () => {
  it("links every capability card that has a page to that page", async () => {
    const { default: McpPage } = await import("../pages/mcp");
    const page = html(McpPage);
    for (const slug of HEADLINE_CAPABILITIES) {
      expect(page, slug).toContain(`href="/api/data/${slug}"`);
    }
    expect(page).toContain(`href="${CONFIG.cookbook}"`);
  });
});

describe("a capability page", () => {
  it("links to the recipes that call it", async () => {
    const { default: CapabilityPage } = await import("../pages/capability");
    const { pageBySlug } = await import("../data/capabilityPages");
    const page = html(CapabilityPage, { page: pageBySlug("dao") });
    expect(page).toContain(`href="${CONFIG.cookbook}/dao-proposal-alerts"`);
    expect(page).toContain(`href="${CONFIG.cookbook}/weekly-ecosystem-digest"`);
    expect(page).not.toContain(`href="${CONFIG.cookbook}/claude-crypto-news"`);
  });
});

describe("the home page's partner logos", () => {
  it("go to a partner's project page where it has one, and to its board otherwise", async () => {
    const { default: Partners } = await import("../components/home/Partners");
    const page = html(Partners, { projectSlugs: ["aave"] });
    expect(page).toContain('href="/projects/aave"');
    expect(page).not.toContain("app.alphaday.com/b/aave");
    expect(page).toContain('href="https://app.alphaday.com/b/iotex"');
    // Nothing read: every logo keeps its board.
    expect(html(Partners)).not.toContain('href="/projects/');
  });

  it("follow the same rule on /dashboards, which draws them again", async () => {
    const { default: Partners } = await import("../components/dashboards/Partners");
    const page = html(Partners, { projectSlugs: ["aave"] });
    expect(page).toContain('href="/projects/aave"');
    expect(page).toContain('href="https://app.alphaday.com/b/iotex"');
  });
});

describe("the featured boards", () => {
  it("on the home page, go to a project page only where the backend has one", async () => {
    const { default: Products } = await import("../components/home/Products");
    const page = html(Products, { projectSlugs: ["avalanche"] });
    expect(page).toContain('href="/projects/avalanche"');
    expect(page).not.toContain('href="/projects/ethereum"');
    expect(page).toContain('href="https://app.alphaday.com/b/ethereum"');
    // Nothing read: the row stays, every board on the app.
    expect(html(Products)).not.toContain('href="/projects/');
    expect(html(Products)).toContain('href="https://app.alphaday.com/b/avalanche"');
  });

  it("follow the same rule on /dashboards", async () => {
    const { default: BoardLinks } = await import("../components/dashboards/BoardLinks");
    const page = html(BoardLinks, { projectSlugs: ["avalanche"] });
    expect(page).toContain('href="/projects/avalanche"');
    expect(page).not.toContain('href="/projects/ethereum"');
    expect(page).toContain('href="https://app.alphaday.com/b/ethereum"');
  });
});
