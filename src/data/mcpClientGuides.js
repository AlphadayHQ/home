/**
 * The setup guide for each MCP client — everything `/mcp/{client}` renders that
 * `/mcp` and `/api` do not.
 *
 * WHY THIS IS SEPARATE FROM mcpClients.js
 *
 * `/api` and `/mcp` import `FEATURED_INSTALLS` from `mcpClients.js`, and a
 * single array of records cannot be tree-shaken field by field: holding the
 * prose below in those records shipped 9 KB gzipped of troubleshooting copy to
 * two pages that render none of it. Only the per-client route imports this
 * file. Same cut, same reason, as `mcpTools.js` / `mcpCapabilities.js`.
 *
 * `src/__tests__/mcp-clients.test.ts` asserts the key sets match, so adding a
 * client without its guide fails the build instead of rendering half a page.
 *
 * WHAT EACH FIELD IS FOR
 *
 * The config block was never the hard part. `requirements` is the state that
 * has to be true before it can work — and most failed setups are one of those,
 * not a wrong field. `verify` is how a reader finds out it worked, which is the
 * step install docs skip and every reader wants, because "listed but not
 * connected" and "connected but the model ignored it" look identical from the
 * outside. `troubleshooting` is symptom-first: someone whose client will not
 * connect is searching their error string, not reading top to bottom.
 *
 * `gotchas` stays separate from `troubleshooting` on purpose. One is what to
 * know going in; the other is what to do once it is already broken. Merging
 * them would make the read-first list something nobody reads first.
 *
 * THE STATUS CODES WERE OBSERVED, NOT ASSUMED
 *
 * Every code in `ENDPOINT_ISSUES` came from sending that exact request to the
 * live server on 14 Sep 2026 and recording the reply. That was not busywork:
 * the first draft asserted that a client left on the legacy SSE transport
 * "fails with a 405", which is the number the internet repeats. The real
 * response is **406, `Could not satisfy the request Accept header`**. A symptom
 * table with guessed codes is worse than no table — the reader searching their
 * exact error finds the page, does not see their code, and concludes the
 * problem is somewhere else entirely.
 */
import { API_COMMANDS } from "./apiSurface";

const URL = API_COMMANDS.mcpUrl;

/**
 * Prompts worth trying first, shared by every client page.
 *
 * Chosen to hit `HEADLINE_CAPABILITIES` — the datasets a general crypto API
 * does not have. "What's the price of BTC" proves the connection but sells
 * nothing; a question about incident records or per-coin developer activity
 * cannot be answered by the model alone, so a good answer is proof the tools
 * fired and proof the data is worth having, in one move.
 */
export const SAMPLE_PROMPTS = [
  "What's trending in crypto news right now, and what changed in the last 24 hours?",
  "Which DeFi pools are paying over 20% APY, and which of them carry real impermanent-loss risk?",
  "Summarise the three most recent on-chain exploits and what was taken.",
  "Compare GitHub developer activity for Solana and Sui over the last month.",
];

/**
 * A client-independent handshake against the live server.
 *
 * This exists to split one question into two. "It will not connect" is
 * ambiguous between "my config is wrong" and "the server is unreachable from
 * here", and those have nothing to do with each other. Running this first
 * settles which one you have before you start editing JSON — if it returns a
 * result, every remaining problem is on the client side, and the symptom table
 * is the right place to look.
 *
 * It is the real first message of the protocol rather than a liveness ping: a
 * server that answers `initialize` is a server a client can talk to.
 */
export const HANDSHAKE_CHECK = {
  code: `curl -s -X POST ${URL} \\\n  -H 'Content-Type: application/json' \\\n  -H 'Accept: application/json, text/event-stream' \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{\n        "protocolVersion":"2025-06-18","capabilities":{},\n        "clientInfo":{"name":"curl","version":"1"}}}'`,
  language: "bash",
  response: `{"jsonrpc":"2.0","id":1,"result":{\n  "protocolVersion":"2025-06-18",\n  "capabilities":{"tools":{"listChanged":false}, ...},\n  "serverInfo":{"name":"alphaday","version":"1.30.0"}\n}}`,
  note: 'The version number moves; `"name":"alphaday"` is the part to look for. The response also carries an `mcp-session-id` header, which is what a client reuses for every later call.',
};

/**
 * Symptoms that come from the endpoint rather than from any one client.
 *
 * Keyed so each guide can select the ones that can actually happen to it. The
 * SSE fallback is a real risk for clients with a `type` field to get wrong and
 * impossible for the ones without; listing every symptom on every page would
 * train the reader to skip the section, which is the opposite of the point.
 */
export const ENDPOINT_ISSUES = {
  "browser-400": {
    symptom: 'Opening the endpoint in a browser returns `{"detail": "Bad Request"}`.',
    cause:
      "A browser sends a GET. MCP is JSON-RPC over POST, so a 400 here is the server working correctly — there is no page to serve at an MCP endpoint.",
    fix: "Nothing. A 400 on a plain GET is the expected response, and it confirms the server is reachable.",
  },
  "sse-406": {
    symptom: "406, or `Could not satisfy the request Accept header`, in the client's logs.",
    cause:
      "The client is using the deprecated SSE transport — sending a GET with `Accept: text/event-stream` instead of a POST. This is what a wrong or missing `type` field produces, and it is the most common silent failure across MCP clients.",
    fix: "Set the transport to streamable HTTP using the spelling this client expects. It is not the same string in any two of them.",
  },
  "trailing-slash": {
    symptom: '404 `{"detail": "Not Found"}`.',
    cause:
      "The URL has a trailing slash, or a path appended. `/mcp/` and `/mcp/sse` are both distinct routes from `/mcp`, and neither exists.",
    fix: "Use the endpoint exactly as written, with no trailing slash and nothing after it.",
  },
  "no-session-400": {
    symptom: "A hand-rolled client gets 400 on `tools/list` after a successful `initialize`.",
    cause:
      "The session was not carried forward. `initialize` returns an `mcp-session-id` header, and later calls must send it back — plus the `notifications/initialized` message the protocol requires in between.",
    fix: "Send `notifications/initialized`, then include `mcp-session-id` on every subsequent request. Client libraries do this for you; scripts written from a curl example usually do not.",
  },
  "connected-but-unused": {
    symptom: "The server shows as connected, but the model never calls it.",
    cause:
      "Not a connection problem. Most clients only call tools in an agent mode, and several ship new tools unticked or capped.",
    fix: "Switch to the client's agent mode, confirm the Alphaday tools are enabled in its tool picker, and ask something that cannot be answered without live data.",
  },
  "json-invalid": {
    symptom: "The server does not appear anywhere, with no error at all.",
    cause:
      "An unparseable config. Most clients skip a file they cannot read rather than surfacing a parse error, and a trailing comma after the last field is the usual culprit.",
    fix: "Validate the file, then reload the window. Every block on this page is valid JSON as written; retyping it by hand is where commas get added.",
  },
};

/** Slug -> everything the per-client page renders beyond identity and install. */
export const CLIENT_GUIDES = {
  claude: {
    requirements: [
      "For Claude Code: the `claude` CLI on your PATH, and a terminal open anywhere — servers added without `--scope project` are available in every directory.",
      "For Claude Desktop: a Connectors section under Settings → Customize. Custom connectors are plan-gated, so if that section is missing, the plan is the reason rather than the config.",
      "Nothing for the server itself. Alphaday is remote: no package, no local process, no key to obtain.",
    ],
    verify: {
      kind: "Terminal",
      code: "claude mcp list",
      language: "bash",
      expect:
        "`alphaday` listed with a connected status. Inside a session, `/mcp` shows the same thing plus the tool count. In Desktop, the connector appears in the composer's tool menu once the app has been fully restarted.",
    },
    promptSurface: "any Claude Code session, or a new Desktop chat",
    gotchas: [
      "Claude Code's flag is `--transport http`, not `streamable-http` — `sse` is the deprecated transport and will fail here.",
      "Claude Desktop's `claude_desktop_config.json` is for local stdio servers. Adding a remote URL there does nothing.",
      "Desktop reaches the server from Anthropic's cloud, not your machine, so a server that only answers on localhost will fail even when `curl` works locally.",
      "Verify with `claude mcp list`, or `/mcp` inside a session.",
    ],
    issues: ["browser-400", "trailing-slash", "connected-but-unused"],
    troubleshooting: [
      {
        symptom: "`claude mcp add` succeeds but the server never appears in `/mcp`.",
        cause:
          "It was added at project scope from a different directory, so it is not in scope for the session you are testing in.",
        fix: "Run `claude mcp list` from the same directory, and re-add without `--scope project` if you want it everywhere.",
      },
      {
        symptom: "Desktop shows the connector but Claude never uses it, or says it has no tools.",
        cause: "Desktop caches connector state until the app is fully restarted.",
        fix: "Quit from the menu bar — closing the window is not enough on macOS — then reopen and start a new chat.",
      },
      {
        symptom: "You added the URL to `claude_desktop_config.json` and nothing happened.",
        cause:
          "That file configures local stdio servers only. A remote URL in it is ignored silently, with no error to find.",
        fix: "Remove it and use Settings → Customize → Connectors instead.",
      },
    ],
    sources: [
      "https://code.claude.com/docs/en/mcp",
      "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
    ],
  },

  cursor: {
    requirements: [
      "A project open in Cursor if you are using the project-scoped file; nothing in particular for the global one.",
      "Agent mode. Cursor's Ask mode does not call MCP tools, so a correctly connected server still looks inert there.",
    ],
    paths: ["`.cursor/mcp.json` (project)", "`~/.cursor/mcp.json` (global)"],
    verify: {
      kind: "Settings UI",
      steps: [
        "Settings → MCP, or Cursor Settings → Tools & Integrations depending on build",
        "`alphaday` should be listed with a green indicator",
        "Expand it — the tool list should populate rather than sitting empty",
      ],
      expect:
        "A green server with a populated tool list. An empty list beside a green dot usually means the handshake succeeded but the tool fetch did not; reload the window before changing the config.",
    },
    promptSurface: "an Agent-mode chat",
    gotchas: [
      "No `type` field. Cursor's docs list `type` as required for stdio servers only, and omit it from every remote example.",
      "If it does not connect, read Output → MCP Logs before adding a `type` override — transport negotiation is the usual cause, not the config.",
      "A project-scoped `.cursor/mcp.json` applies to that project only. Opening a different folder gives you a client with no Alphaday tools and no warning.",
    ],
    issues: ["browser-400", "trailing-slash", "connected-but-unused", "json-invalid"],
    troubleshooting: [
      {
        symptom: "The server does not appear in the MCP list at all.",
        cause:
          "The file is in the wrong place, or the JSON does not parse. Cursor skips an unreadable config rather than reporting it prominently.",
        fix: "Confirm the path is `.cursor/mcp.json` at the project root — not `.vscode/`, not `cursor.json` — then reload the window.",
      },
      {
        symptom: "It connects, then drops to a red state after a few minutes.",
        cause: "Usually the network path rather than the config — a proxy or VPN closing idle connections.",
        fix: "Run the handshake above from the same machine. If curl succeeds and Cursor does not, the difference is Cursor's network stack, and Output → MCP Logs will name it.",
      },
    ],
    sources: ["https://cursor.com/docs/mcp"],
  },

  vscode: {
    requirements: [
      "GitHub Copilot Chat installed and signed in. MCP servers are a Copilot agent feature, so no Copilot means no MCP.",
      "Copilot Chat set to **Agent** mode. Ask and Edit modes do not call tools.",
      "A workspace open, if you are using `.vscode/mcp.json` rather than the user-level configuration.",
    ],
    paths: [
      "`.vscode/mcp.json` (workspace)",
      "Command Palette → **MCP: Open User Configuration** (global)",
    ],
    verify: {
      kind: "Command Palette",
      steps: [
        "Command Palette → **MCP: List Servers**",
        "`alphaday` should show as Running",
        "Open Copilot Chat in Agent mode and click the tools icon — the Alphaday tools should be listed and tickable",
      ],
      expect:
        "Running in the server list, and tools present in the Agent-mode picker. VS Code also puts a Start / Stop / Restart codelens directly above the server block in `mcp.json`, which is the fastest way to retry after an edit.",
    },
    promptSurface: "Copilot Chat in Agent mode",
    gotchas: [
      "The top-level key is `servers`, not `mcpServers`. This is the single most common reason a pasted config silently fails here.",
      'The `type` must be `"http"` for streamable HTTP. `"sse"` is the legacy transport.',
      "Copilot Chat must be in **Agent** mode to call MCP tools.",
      "VS Code shows a trust prompt the first time a server starts. `MCP: Reset Trust` clears the decision.",
      "VS Code caps how many tools it offers the model at once. With a large server plus other extensions, some Alphaday tools may arrive unticked in the picker.",
    ],
    issues: ["browser-400", "sse-406", "trailing-slash", "connected-but-unused", "json-invalid"],
    troubleshooting: [
      {
        symptom: "The server never starts and no error is shown.",
        cause:
          "Almost always `mcpServers` instead of `servers`. VS Code does not read the key it does not recognise, so there is nothing for it to report.",
        fix: "Change the top-level key to `servers`, then use the Restart codelens above the block.",
      },
      {
        symptom: "406 in the MCP output, or the server flaps between starting and stopped.",
        cause: 'The `type` is `"sse"`, or missing, so VS Code is not using streamable HTTP.',
        fix: 'Set `"type": "http"` exactly.',
      },
      {
        symptom: "Tools exist in the picker but Copilot never calls them.",
        cause: "Ask mode, or the tools are unticked because the request hit the tool cap.",
        fix: "Switch to Agent mode, tick the Alphaday tools, and untick extensions you are not using.",
      },
      {
        symptom: "A dialog asks whether you trust the server, and nothing works until it is answered.",
        cause: "Expected on first start for any MCP server.",
        fix: "Accept it. `MCP: Reset Trust` clears the decision if you want to answer again.",
      },
    ],
    sources: [
      "https://code.visualstudio.com/docs/agent-customization/mcp-servers",
      "https://code.visualstudio.com/docs/agents/reference/mcp-configuration",
    ],
  },

  windsurf: {
    requirements: [
      "Windsurf — now shipping as Devin Desktop. Cognition renamed it in June 2026 and the docs moved to docs.devin.ai, but the config directory did not move.",
      "Cascade, Windsurf's agent panel. MCP tools belong to Cascade, not to the inline editor.",
    ],
    paths: ["`~/.codeium/windsurf/mcp_config.json`"],
    verify: {
      kind: "Cascade panel",
      steps: [
        "Open Cascade and click the plugins / MCP icon in the panel header",
        "Press Refresh after editing the config — Windsurf does not always reload it on save",
        "`alphaday` should appear with its tools listed",
      ],
      expect:
        "The server listed with its tools. If the panel is empty straight after a save, press Refresh before assuming the config is wrong — a stale read is the more common cause.",
    },
    promptSurface: "the Cascade panel",
    gotchas: [
      "Use `serverUrl`. The docs say `serverUrl` or `url` both work, but every official example uses the former.",
      'There is no `type` or `transport` field. Guides telling you to add `type: "streamable-http"` are wrong — it is not in the schema.',
      "The product is Devin Desktop now, but the config path still uses the legacy `~/.codeium/windsurf/` directory.",
      "That directory may not exist on a fresh install. Create it rather than hunting for where the file already is.",
    ],
    issues: ["browser-400", "trailing-slash", "connected-but-unused", "json-invalid"],
    troubleshooting: [
      {
        symptom: "Config saved, but Cascade shows no server.",
        cause: "Windsurf read the file before you saved it, or the path is wrong.",
        fix: "Press Refresh in the MCP panel first. Then confirm the file is at `~/.codeium/windsurf/mcp_config.json` — `.codeium` persists under the old name despite the Devin rename.",
      },
      {
        symptom: "You copied a working Cursor config and it does not connect.",
        cause:
          "Cursor's config uses `url`. Windsurf accepts it per the docs, but every vendor example uses `serverUrl`, and failures with `url` are widely reported.",
        fix: "Rename the field to `serverUrl`.",
      },
      {
        symptom: 'A guide told you to add `type: "streamable-http"` and it broke.',
        cause: "That field does not exist in Windsurf's schema. It is a third-party invention.",
        fix: "Remove it. A remote server here is a name and a `serverUrl`, nothing more.",
      },
    ],
    sources: ["https://docs.devin.ai/desktop/cascade/mcp"],
  },

  codex: {
    requirements: [
      "The `codex` CLI, on a current build — older ones gated remote servers behind an experimental flag.",
      "A trusted project, if you intend to use a project-level `.codex/config.toml`. Untrusted repos have theirs ignored outright.",
    ],
    paths: ["`~/.codex/config.toml` (user)", "`.codex/config.toml` (trusted projects only)"],
    verify: {
      kind: "Terminal",
      code: "codex mcp list",
      language: "bash",
      expect:
        "`alphaday` listed with its URL. The TOML table name becomes the server name, so `[mcp_servers.alphaday]` is what you should see here — if the name is wrong, the table header is why.",
    },
    promptSurface: "a `codex` session",
    gotchas: [
      "There is no `--transport` flag. Transport is inferred from whether you pass `--url` or a trailing stdio command. Guides showing `--transport streamable-http` are wrong.",
      "A project-level `.codex/config.toml` is ignored entirely in untrusted repos — check trust first if nothing appears.",
      "Older Codex builds gated remote servers behind `experimental_use_rmcp_client`. Current builds do not.",
      "The TOML table is `[mcp_servers.alphaday]` — underscore, plural. `[mcpServers.alphaday]` is JSON habit and will not be read.",
    ],
    issues: ["browser-400", "trailing-slash", "connected-but-unused"],
    troubleshooting: [
      {
        symptom: "`codex mcp add ... --transport streamable-http` fails with an unknown-argument error.",
        cause: "There is no such flag. Several published guides show one anyway.",
        fix: "Drop it. `--url` is what selects the remote transport.",
      },
      {
        symptom: "A project-level config has no effect.",
        cause: "Codex ignores `.codex/config.toml` in repos you have not marked trusted.",
        fix: "Trust the project, or move the server into `~/.codex/config.toml`, where trust does not apply.",
      },
      {
        symptom: "Remote servers are rejected outright on an older build.",
        cause: "They sat behind `experimental_use_rmcp_client` before the remote client shipped by default.",
        fix: "Update Codex. Enabling the flag on an old build is the fallback, not the fix.",
      },
    ],
    sources: [
      "https://github.com/openai/codex/blob/main/codex-rs/cli/src/mcp_cmd.rs",
      "https://learn.chatgpt.com/docs/extend/mcp",
    ],
  },

  chatgpt: {
    requirements: [
      "A Pro, Business, Enterprise or Edu plan. Custom MCP apps are not on the free or Plus tiers.",
      "ChatGPT on the web. The mobile apps do not support custom MCP apps at all.",
      "Developer mode switched on under Settings → Apps → Advanced Settings.",
    ],
    verify: {
      kind: "Composer",
      steps: [
        "Start a new chat",
        "Open the `+` menu in the composer",
        "`alphaday` should be listed among the available apps, and selectable",
      ],
      expect:
        "The app in the composer menu with its tools discovered. If Scan Tools returned nothing during setup, the app is created but inert — rescan rather than recreating it.",
    },
    promptSurface: "a new chat with the app enabled from the `+` menu",
    gotchas: [
      "Web only. MCP apps do not work in the ChatGPT mobile apps.",
      "Agent mode will not use custom apps at all.",
      "Available on Pro, Business, Enterprise and Edu; still labelled beta on the business plans. Read and fetch only on individual plans — fine here, since Alphaday exposes no write tools.",
      "ChatGPT warns that third-party servers are unverified during setup. Expected, not a failure.",
      "Search and fetch tools are no longer required, despite what older guides say.",
    ],
    issues: ["browser-400", "trailing-slash", "connected-but-unused"],
    troubleshooting: [
      {
        symptom: "There is no Create option under Settings → Apps.",
        cause: "Developer mode is off, or the plan does not include custom apps.",
        fix: "Turn on Developer mode in Advanced Settings first. If that toggle is absent, the plan is the blocker.",
      },
      {
        symptom: "Scan Tools finds nothing.",
        cause: "Usually a typo in the endpoint, or a trailing slash — `/mcp/` is a different path and returns 404.",
        fix: "Re-enter the URL with no trailing slash, then rescan.",
      },
      {
        symptom: "The app works in a normal chat but is ignored in agent mode.",
        cause: "Documented behaviour — agent mode does not use custom apps.",
        fix: "Use a standard chat. There is no setting that changes this.",
      },
      {
        symptom: "A warning says the server is unverified.",
        cause: "Shown for every third-party MCP server.",
        fix: "Expected. Continue.",
      },
    ],
    sources: [
      "https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt",
      "https://developers.openai.com/api/docs/mcp",
    ],
  },

  cline: {
    requirements: [
      "The Cline or Roo Code extension in VS Code. Both ship their own MCP panel rather than using VS Code's.",
      "Knowing which of the two you are configuring. They share an ancestor and diverge on exactly the fields below, so a config that works in one is a plausible-looking failure in the other.",
    ],
    paths: [
      "Cline: MCP Servers icon → Configure",
      "Roo: MCP panel → Edit Global MCP, or `.roo/mcp.json` in the project",
    ],
    verify: {
      kind: "MCP panel",
      steps: [
        "Open the MCP Servers panel in the extension sidebar",
        "`alphaday` should show a green indicator, not amber or red",
        "Expand the server — the tool list should be populated",
      ],
      expect:
        "Green, with tools listed. Amber generally means it is still retrying the handshake; red with a 406 in the output means `type` holds the wrong one of the two spellings.",
    },
    promptSurface: "the extension's chat panel",
    gotchas: [
      "The `type` casing is the whole trap: `streamableHttp` in Cline, `streamable-http` in Roo. Neither auto-detects.",
      "The approval field differs too — `autoApprove` in Cline, `alwaysAllow` in Roo.",
      "Cline's CLI reads `~/.cline/data/settings/cline_mcp_settings.json`, not the `~/.cline/mcp.json` its docs list. Known documentation bug.",
      "`disabled: false` is the enabling polarity here. Kilo, forked from the same lineage, uses `enabled: true` instead.",
    ],
    issues: ["browser-400", "sse-406", "trailing-slash", "connected-but-unused", "json-invalid"],
    troubleshooting: [
      {
        symptom: "406, or `Could not satisfy the request Accept header`, in the server output.",
        cause:
          "The client is on the legacy SSE transport, which means `type` is missing or spelled the other client's way.",
        fix: "`streamableHttp` in Cline. `streamable-http` in Roo. There is no value that works in both.",
      },
      {
        symptom: "Config edits do not take effect at all.",
        cause: "Cline's CLI reads a different file from the one its docs name — a known documentation bug.",
        fix: "Edit through the panel's Configure button, which always writes the file the client actually reads.",
      },
      {
        symptom: "Every tool call stops for an approval prompt.",
        cause: "The approval list is empty by default. That is the safe default rather than a fault.",
        fix: "Add the tool names to `autoApprove` (Cline) or `alwaysAllow` (Roo). The field names differ, and the wrong one is ignored.",
      },
    ],
    sources: [
      "https://docs.cline.bot/mcp/mcp-overview",
      "https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo",
    ],
  },

  kilo: {
    requirements: [
      "Kilo Code in any of its forms — the CLI, the VS Code extension or the JetBrains plugin. All three read the same file, so configure it once.",
      "A current version, if you want the `kilo.jsonc` path. Older installs used `.kilocode/mcp.json` with the Cline-style shape.",
    ],
    paths: [
      "`~/.config/kilo/kilo.jsonc` (global)",
      "`kilo.jsonc` or `.kilo/kilo.jsonc` (project)",
    ],
    verify: {
      kind: "MCP panel",
      steps: [
        "Open the MCP panel in whichever Kilo client you are using",
        "`alphaday` should be listed as enabled",
        "Expand it to confirm the tools were discovered",
      ],
      expect:
        "Enabled, with tools. Because all three Kilo clients read the same file, confirming it in one confirms it everywhere.",
    },
    promptSurface: "any Kilo client's chat",
    gotchas: [
      "The top-level key is `mcp`, not `mcpServers`.",
      "`enabled: true`, where Cline and Roo use `disabled: false`. Opposite polarity, easy to transpose.",
      'The `type` is `"remote"` — Kilo picks streamable HTTP or SSE itself.',
      "The CLI, VS Code and JetBrains clients all read the same file. Older versions used `.kilocode/mcp.json` with `mcpServers`; that still works, but it is the legacy path.",
      "The file is `.jsonc`, so comments are allowed — trailing commas still are not.",
    ],
    issues: ["browser-400", "trailing-slash", "connected-but-unused", "json-invalid"],
    troubleshooting: [
      {
        symptom: "A config copied from Cline or Roo does nothing.",
        cause:
          'Three things differ at once: the key is `mcp` not `mcpServers`, the flag is `enabled: true` not `disabled: false`, and `type` is `"remote"`.',
        fix: "Use the block above verbatim rather than editing the Cline one field by field.",
      },
      {
        symptom: "The server is listed but switched off.",
        cause: "`enabled` was transposed from Cline's `disabled`, so `enabled: false` reads as a deliberate off.",
        fix: 'Set `"enabled": true`.',
      },
      {
        symptom: "It works in the extension but not the CLI, or the other way round.",
        cause: "Two config files exist — a legacy `.kilocode/mcp.json` alongside the current `kilo.jsonc`.",
        fix: "Delete the legacy file. All Kilo clients read `kilo.jsonc`.",
      },
    ],
    sources: [
      "https://kilo.ai/docs/automate/mcp/using-in-kilo-code",
      "https://kilo.ai/docs/getting-started/settings",
    ],
  },
};

/** Lookup by slug, for the `/mcp/$client` route. */
export const guideFor = (slug) => CLIENT_GUIDES[slug];

/**
 * The endpoint-level symptoms that apply to a given guide, in a stable order.
 *
 * Order comes from `ENDPOINT_ISSUES` rather than from each guide's `issues`
 * array, so the table reads the same way on every page and a reader who has
 * seen one can scan the next.
 */
export const endpointIssuesFor = (guide) =>
  Object.entries(ENDPOINT_ISSUES)
    .filter(([id]) => guide.issues.includes(id))
    .map(([id, issue]) => ({ id, ...issue }));
