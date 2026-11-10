import { describe, expect, it } from "vitest";
import {
  TOOL_DOMAINS,
  PLUMBING_TOOLS,
  CAPABILITY_COUNT,
  MCP_TOOL_COUNT,
  domainsNotCovering,
} from "../data/mcpTools";
import { API_STATS, TOOL_COUNT, API_TOOLS } from "../data/apiSurface";
import {
  CAPABILITY_COPY,
  HEADLINE_CAPABILITIES,
} from "../data/mcpCapabilities";
import mcp from "../api/mcp-tools.generated.json";

/**
 * Keeps `src/data/mcpTools.js` honest against the live tool list.
 *
 * The site publishes two derived numbers — capabilities and tools — and both
 * are only as good as the filing behind them. `mcpTools.js` deliberately does
 * not import the 73 KB generated tool list, because it is reachable from the
 * home page. This is where the two halves are compared, since tests are not
 * bundled.
 *
 * The three assertions below exist because a previous attempt at this used a
 * *negative* rule — "a tool that doesn't look like a sibling is a capability" —
 * and silently miscounted six tools, including `get_tvl_yields_top` and
 * `get_news_last_24_hours`. A negative rule cannot catch a plausible name. The
 * positive map can, but only if something checks it, which is this file.
 */

const liveNames = new Set(mcp.tools.map((tool) => tool.name));
const filed = [...Object.values(TOOL_DOMAINS).flat(), ...PLUMBING_TOOLS];

describe("the tool map covers the live server", () => {
  it("files every tool the server exposes", () => {
    // The failure this catches: a tool ships, nothing claims it, and the
    // published capability count silently stops describing the server.
    const unfiled = [...liveNames].filter((name) => !filed.includes(name));
    expect(
      unfiled,
      `${unfiled.length} live tool(s) belong to no domain in mcpTools.js. ` +
        `File each under a data capability, or add it to PLUMBING_TOOLS:\n  ` +
        unfiled.join("\n  ")
    ).toEqual([]);
  });

  it("names no tool the server has stopped serving", () => {
    const ghosts = filed.filter((name) => !liveNames.has(name));
    expect(
      ghosts,
      `mcpTools.js names ${ghosts.length} tool(s) the live server no longer ` +
        `exposes:\n  ${ghosts.join("\n  ")}`
    ).toEqual([]);
  });

  it("files each tool exactly once", () => {
    // Two domains claiming one tool inflates MCP_TOOL_COUNT without inflating
    // the tool list, so the published numbers drift apart without either
    // looking wrong on its own.
    const seen = new Set<string>();
    const duplicated = filed.filter((name) => {
      if (seen.has(name)) return true;
      seen.add(name);
      return false;
    });
    expect(
      duplicated,
      `filed under more than one domain: ${duplicated.join(", ")}`
    ).toEqual([]);
  });
});

describe("capability copy", () => {
  it("describes every domain, and no domain that does not exist", () => {
    // /mcp renders one card per domain. A domain with no copy renders a blank
    // card rather than throwing, which is the failure mode most likely to ship
    // unnoticed — so the filing obligation covers the sentence, not just the
    // tool name.
    const domains = Object.keys(TOOL_DOMAINS).sort();
    const described = Object.keys(CAPABILITY_COPY).sort();
    expect(described, "CAPABILITY_COPY keys must match TOOL_DOMAINS exactly").toEqual(
      domains
    );
  });

  it("leads with capabilities that actually exist", () => {
    for (const slug of HEADLINE_CAPABILITIES) {
      expect(
        Object.keys(TOOL_DOMAINS),
        `${slug} is headlined on /mcp but is not a domain`
      ).toContain(slug);
    }
  });
});

describe("the published numbers", () => {
  it("reports the live tool count", () => {
    expect(MCP_TOOL_COUNT).toBe(mcp.tools.length);
  });

  it("renders the derived capability count in the stat band", () => {
    // The regression: a hardcoded "12" that drifted 45 behind the server.
    const stat = API_STATS.find((entry) => entry.label === "Data capabilities");
    expect(stat, "API_STATS has no Data capabilities entry").toBeDefined();
    expect(stat?.num).toBe(String(CAPABILITY_COUNT));
  });

  it("does not publish the showcase length as the tool count", () => {
    // TOOL_COUNT is rendered as "{n} tools" in four places. It used to be
    // API_TOOLS.length, which is how many cards to draw — not how many tools
    // exist. Asserting they differ would break if the showcase ever grew to
    // cover everything, so assert the meaning instead.
    expect(TOOL_COUNT).toBe(mcp.tools.length);
  });

  it("counts more capabilities than the showcase advertises", () => {
    // Guards the premise of the change: if the showcase ever covered every
    // domain, the capability framing would be redundant and this should be
    // revisited rather than quietly kept.
    const missed = domainsNotCovering(API_TOOLS.map((tool) => tool.name));
    expect(missed.length).toBeGreaterThan(0);
    expect(CAPABILITY_COUNT).toBeGreaterThan(API_TOOLS.length);
  });
});
