import { createFileRoute } from "@tanstack/react-router";
import McpPage from "../pages/mcp";
import { canonicalFor, seoHead } from "../seo/head";
import { CAPABILITY_COUNT, TOOL_COUNT } from "../data/apiSurface";

/**
 * `/mcp` — the MCP server page.
 *
 * Naming note: `/mcp` now means two things in this codebase. This route is the
 * marketing page at `alphaday.com/mcp`; the JSON-RPC endpoint lives at
 * `api.alphaday.com/mcp` and is allowlisted as `"/mcp"` in
 * `src/__tests__/api-surface.test.js`, which skips the trailing-slash rule for
 * it. Different hosts, same path, and they are easy to confuse when grepping.
 *
 * Promoted in `src/seo/indexState.ts`: this is the page CLAUDE.md names as the
 * hook for audience one, and the MCP registries link to it.
 */
export const Route = createFileRoute("/mcp/")({
  head: () =>
    seoHead({
      index: true,
      canonical: canonicalFor("/mcp"),
      title: "Alphaday MCP Server — Crypto Data for AI Agents",
      // Interpolated, not written out. A hardcoded "22 capabilities" here would
      // be the same defect the stat band carried for months: correct at the
      // moment of writing and silently wrong after the next tool lands. The
      // meta description is the copy a model quotes back, so it is the worst
      // place to keep a number that cannot update itself.
      description: `Free crypto MCP server, no signup. ${CAPABILITY_COUNT} data capabilities across ${TOOL_COUNT} pre-described tools: news, governance, DeFi, security incidents and market data. Remote HTTP — point your client at the URL.`,
    }),
  component: McpPage,
});
