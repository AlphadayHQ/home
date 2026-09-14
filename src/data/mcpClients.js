/**
 * Install recipes for the Alphaday MCP server, one record per client.
 *
 * WHY THIS IS A MODULE AND NOT COPY ON A PAGE
 *
 * These four configs already existed, inline in `src/pages/api.jsx`. `/mcp` needs
 * the same ones, and two pages holding their own copy of the same command is the
 * precise shape of finding 22: `/api` hardcoded the trending `curl` in its
 * desktop variant while the mobile variant read the shared string, the two
 * disagreed on the same screen, and nobody noticed because each looked right on
 * its own. One source, both pages.
 *
 * THE TRANSPORT DETAIL THAT MAKES MOST INTERNET EXAMPLES WRONG HERE
 *
 * Alphaday's server is **remote HTTP**, not a local stdio process. Nearly every
 * MCP config example you will find is `command` + `args` — spawning a binary —
 * which does not apply. The remote shape is a single `url` field, and clients
 * that used to need the `npx mcp-remote` bridge mostly no longer do.
 *
 * `verifiedOn` is load-bearing, not decoration. Client config formats change on
 * their own schedule — `mcp-remote` went from required to unnecessary inside a
 * year — and a stale config block is worse than no page at all, because it is
 * the first thing both a prospect and a model will try. The date is rendered so
 * a reader can judge staleness, and it is the hook for the quarterly re-check.
 */
import { API_COMMANDS } from "./apiSurface";

/** The remote-server config shape, shared by every JSON-configured client. */
export const MCP_JSON_CONFIG = `{
  "mcpServers": {
    "alphaday": {
      "url": "${API_COMMANDS.mcpUrl}"
    }
  }
}`;

/**
 * Clients with a verified one-line install.
 *
 * Deliberately only the ones already on `/api` and therefore already shipped.
 * The wider set — Cursor, Windsurf, VS Code, ChatGPT, Cline and friends — is
 * P04, and each needs its format checked against that client's live docs before
 * it appears anywhere. Adding an unverified row here would put a broken command
 * in front of the exact audience least willing to forgive one.
 */
export const MCP_CLIENTS = [
  {
    slug: "mcporter",
    name: "MCP Importer",
    label: "Terminal",
    command: API_COMMANDS.mcporter,
    verifiedOn: "2026-09-08",
  },
  {
    slug: "claude",
    name: "Claude Code",
    label: "Terminal",
    command: `claude mcp add --transport http alphaday ${API_COMMANDS.mcpUrl}`,
    verifiedOn: "2026-09-08",
  },
  {
    slug: "codex",
    name: "Codex",
    label: "Terminal",
    command: `codex mcp add alphaday --url ${API_COMMANDS.mcpUrl}`,
    verifiedOn: "2026-09-08",
  },
  {
    slug: "json",
    name: "JSON Config",
    label: "config.json",
    command: MCP_JSON_CONFIG,
    language: "json",
    verifiedOn: "2026-09-08",
  },
];

/**
 * The oldest `verifiedOn` in the set.
 *
 * Deliberately the oldest, not the newest. The page shows one date for the
 * whole block, and claiming the most recent check would let a freshly-added
 * client vouch for three stale ones beside it.
 */
export const MCP_CLIENTS_VERIFIED_ON = MCP_CLIENTS.map((c) => c.verifiedOn)
  .sort()
  .at(0);
