/**
 * Client identity and install commands for the Alphaday MCP server.
 *
 * WHY THIS IS A MODULE AND NOT COPY ON A PAGE
 *
 * `/api` held four of these inline before `/mcp` existed. Two pages each keeping
 * their own copy of the same command is the shape of finding 22 — `/api`
 * hardcoded the trending `curl` in its desktop variant while the mobile variant
 * read the shared string, and the two disagreed on the same screen. One source.
 *
 * WHY THE SETUP GUIDES LIVE IN A SEPARATE FILE
 *
 * `mcpClientGuides.js` holds the rest of each record — prerequisites, the
 * verification step, the gotchas, the symptom table. Only `/mcp/{client}`
 * renders any of it, but `/api` and `/mcp` both import this file for
 * `FEATURED_INSTALLS`, and a single array cannot be tree-shaken field by field.
 * Keeping them together put 9 KB gzipped of setup prose on two pages that show
 * none of it. This is the same cut, for the same reason, as the one between
 * `mcpTools.js` and `mcpCapabilities.js`.
 *
 * The cost of splitting a record across two files is drift — a client added
 * here and forgotten there. `src/__tests__/mcp-clients.test.ts` asserts the two
 * key sets match exactly, so that failure is a red build rather than a page
 * that renders half of itself.
 *
 * THE TRANSPORT DETAIL THAT MAKES MOST INTERNET EXAMPLES WRONG
 *
 * Alphaday's server is **remote HTTP**, not a local stdio process. Nearly every
 * MCP config example online is `command` + `args`, spawning a binary. Those do
 * not apply. The remote shape is a URL, and the `npx mcp-remote` bridge that
 * older guides insist on is no longer needed by any client documented here.
 *
 * WHAT THE RESEARCH FOUND, AND WHY THESE PAGES EXIST
 *
 * Six of these clients take JSON and **five of them disagree about its shape**:
 * the top-level key is `mcpServers` for most, `servers` for VS Code and `mcp`
 * for Kilo; the URL field is `url` everywhere except Windsurf, whose own
 * examples use `serverUrl`; and `type` is absent for Cursor, required as
 * `"http"` for VS Code, `"streamableHttp"` for Cline and `"streamable-http"`
 * for Roo — a casing difference between two clients people routinely copy
 * configs between, which silently falls back to legacy SSE and fails.
 *
 * You cannot write one config block for that. Hence a record per client.
 *
 * `verifiedOn` is load-bearing, not decoration. Formats move on their own
 * schedule, and a stale config block is worse than no page: it is the first
 * thing both a prospect and a model will try.
 */
import { API_COMMANDS } from "./apiSurface";

const URL = API_COMMANDS.mcpUrl;

/**
 * Clients with a verified remote-HTTP setup, in rough order of audience size.
 *
 * `install` is a list because several clients have more than one real path —
 * Claude has a CLI for Code and a UI flow for Desktop, and they are genuinely
 * different products sharing a name.
 */
export const MCP_CLIENTS = [
  {
    slug: "claude",
    name: "Claude",
    blurb:
      "Claude Code takes a one-line command. Claude Desktop is different: its JSON config is documented for local stdio servers only, so a remote server goes through the Connectors UI instead.",
    install: [
      {
        label: "Claude Code",
        kind: "Terminal",
        code: `claude mcp add --transport http alphaday ${URL}`,
        language: "bash",
      },
      {
        label: "Claude Desktop",
        kind: "Settings UI",
        steps: [
          "Settings → Customize → Connectors",
          "Add custom connector",
          `Enter the URL: ${URL}`,
          "Leave the authentication fields blank — the server needs none",
          "Quit Claude Desktop completely and reopen it",
        ],
      },
    ],
    verifiedOn: "2026-09-14",
  },
  {
    slug: "cursor",
    name: "Cursor",
    blurb:
      "The simplest of the JSON clients: a bare `url`, no transport field. Cursor negotiates the transport itself.",
    install: [
      {
        label: "Project",
        kind: ".cursor/mcp.json",
        code: `{\n  "mcpServers": {\n    "alphaday": {\n      "url": "${URL}"\n    }\n  }\n}`,
        language: "json",
      },
    ],
    verifiedOn: "2026-09-14",
  },
  {
    slug: "vscode",
    name: "VS Code",
    alsoKnownAs: "GitHub Copilot",
    blurb:
      "The one client that does not use `mcpServers`. VS Code's top-level key is `servers`, and `type` is required — a config copied from Cursor or Claude will not load.",
    install: [
      {
        label: "Workspace",
        kind: ".vscode/mcp.json",
        code: `{\n  "servers": {\n    "alphaday": {\n      "type": "http",\n      "url": "${URL}"\n    }\n  }\n}`,
        language: "json",
      },
    ],
    verifiedOn: "2026-09-14",
  },
  {
    slug: "windsurf",
    name: "Windsurf",
    alsoKnownAs: "Devin Desktop",
    blurb:
      "Windsurf's own examples use `serverUrl` where every other client uses `url`. Both are accepted, but a config copied from Cursor is reported to fail silently.",
    install: [
      {
        label: "Config",
        kind: "mcp_config.json",
        code: `{\n  "mcpServers": {\n    "alphaday": {\n      "serverUrl": "${URL}"\n    }\n  }\n}`,
        language: "json",
      },
    ],
    verifiedOn: "2026-09-14",
  },
  {
    slug: "codex",
    name: "Codex",
    blurb:
      "The only client here that uses TOML. One line of config, or one CLI command.",
    install: [
      {
        label: "CLI",
        kind: "Terminal",
        code: `codex mcp add alphaday --url ${URL}`,
        language: "bash",
      },
      {
        label: "Config file",
        kind: "~/.codex/config.toml",
        code: `[mcp_servers.alphaday]\nurl = "${URL}"`,
        language: "toml",
      },
    ],
    verifiedOn: "2026-09-14",
  },
  {
    slug: "chatgpt",
    name: "ChatGPT",
    blurb:
      "No config file — a UI flow. Note the naming has changed: what older guides call Connectors is now Apps, and the path runs through developer mode.",
    install: [
      {
        label: "Developer mode",
        kind: "Settings UI",
        steps: [
          "Settings → Apps → Advanced Settings → turn on Developer mode",
          "Settings → Apps → Create",
          `Enter the endpoint: ${URL}`,
          "Leave the authentication mechanism unset — the server needs none",
          "Scan Tools, then Create",
        ],
      },
    ],
    verifiedOn: "2026-09-14",
  },
  {
    slug: "cline",
    name: "Cline & Roo Code",
    blurb:
      "Same shape, one character apart. Cline wants `streamableHttp`; Roo wants `streamable-http`. Use the wrong one and the client quietly falls back to legacy SSE, which this server answers with a 406.",
    install: [
      {
        label: "Cline",
        kind: "cline_mcp_settings.json",
        code: `{\n  "mcpServers": {\n    "alphaday": {\n      "type": "streamableHttp",\n      "url": "${URL}",\n      "disabled": false,\n      "autoApprove": []\n    }\n  }\n}`,
        language: "json",
      },
      {
        label: "Roo Code",
        kind: ".roo/mcp.json",
        code: `{\n  "mcpServers": {\n    "alphaday": {\n      "type": "streamable-http",\n      "url": "${URL}",\n      "disabled": false,\n      "alwaysAllow": []\n    }\n  }\n}`,
        language: "json",
      },
    ],
    verifiedOn: "2026-09-14",
  },
  {
    slug: "kilo",
    name: "Kilo Code",
    blurb:
      "Diverged from its Cline and Roo ancestors: a different top-level key, a different file, and an enable flag with the opposite polarity.",
    install: [
      {
        label: "Config",
        kind: "kilo.jsonc",
        code: `{\n  "mcp": {\n    "alphaday": {\n      "type": "remote",\n      "url": "${URL}",\n      "enabled": true\n    }\n  }\n}`,
        language: "json",
      },
    ],
    verifiedOn: "2026-09-14",
  },
];

/** Lookup by slug, for the `/mcp/$client` route. */
export const clientBySlug = (slug) =>
  MCP_CLIENTS.find((client) => client.slug === slug);

/**
 * The four shown on `/api` and given a quick-start on the `/mcp` hub.
 *
 * A subset, because the hub's job is to get someone connected, not to enumerate
 * every client — that is what the per-client pages are for. Every client is
 * still linked from the hub; only these four get a config block there.
 */
export const FEATURED_CLIENT_SLUGS = ["claude", "cursor", "vscode", "codex"];

/**
 * The oldest `verifiedOn` in the set.
 *
 * Deliberately the oldest, not the newest: the pages show one date, and the
 * most recent check would let a freshly-added client vouch for stale ones.
 */
export const MCP_CLIENTS_VERIFIED_ON = MCP_CLIENTS.map((c) => c.verifiedOn)
  .sort()
  .at(0);

/**
 * A flat {name, label, command, language} view of the featured clients, for the
 * tabbed quick-start on `/api` and the hub.
 *
 * Derived rather than hand-kept: it takes the first install path of each
 * featured client, which is the one a reader should try first. The full record
 * — the other install paths, the file locations, the gotchas — lives on that
 * client's own page, because a tab strip cannot carry "Cline wants
 * `streamableHttp` and Roo wants `streamable-http`" without becoming a page
 * itself.
 */
export const FEATURED_INSTALLS = FEATURED_CLIENT_SLUGS.map((slug) => {
  const client = clientBySlug(slug);
  const first = client.install[0];
  return {
    slug,
    name: client.name,
    label: first.kind,
    command: first.code ?? first.steps.join("\n"),
    language: first.language ?? "bash",
  };
});
