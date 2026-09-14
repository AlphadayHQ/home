/**
 * build-llms.js
 *
 * Generates /llms.txt and /llms-full.txt (docs/seo-strategy.md §6.2).
 *
 * Audience one — agent builders — finds tools by asking a model, and no model
 * crawler executes JavaScript. These two files are the site's readable surface
 * for them, so every fact in them is derived rather than authored:
 *
 *   - the REST surface comes from src/api/docs-spec.generated.js, the same
 *     module that renders /api/docs, so the two cannot disagree;
 *   - the tool list comes from a live tools/list call against the MCP endpoint.
 *
 * The prose below is authored, but it is limited to claims that were verified
 * against the live API. Nothing here is copied from src/data/apiSurface.js,
 * which carries approved marketing copy whose commands do not match the spec.
 *
 * Runs after build-api-docs (see package.json). If MCP is unreachable the tool
 * list falls back to the committed cache at src/api/mcp-tools.generated.json,
 * and if that is missing too the build fails — an llms.txt with no MCP section
 * is worse than no build, because it silently publishes an incomplete answer
 * to the one question this file exists to answer.
 */
const { resolve } = require("path");
const { existsSync, readFileSync, writeFileSync } = require("fs");
const fetch = require("node-fetch");
const { ageInDays, assertNotStale, describeAge } = require("./staleness");

const SPEC_JSON = resolve(__dirname, "../src/api/docs-spec.generated.json");
// Last known-good tool list. Committed, so a fresh CI checkout has something to
// fall back to — a cache that only exists on the machine that wrote it is not a
// fallback, it is a local convenience.
const MCP_CACHE = resolve(__dirname, "../src/api/mcp-tools.generated.json");
const OUT_INDEX = resolve(__dirname, "../public/llms.txt");
const OUT_FULL = resolve(__dirname, "../public/llms-full.txt");

const SITE = "https://alphaday.com";
const API_BASE = "https://api.alphaday.com";
const MCP_URL = process.env.ALPHADAY_MCP_URL || `${API_BASE}/mcp`;
// The server negotiates 2025-06-18; this was pinned two revisions behind. It
// still worked, because the handshake downgrades rather than refusing — which
// is exactly why a stale pin here is easy to miss. Kept explicit rather than
// omitted: the version we ask for should be a decision, not a default.
const MCP_PROTOCOL = "2025-06-18";

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function readApiDocs() {
  if (!existsSync(SPEC_JSON)) {
    throw new Error(
      `build-llms: ${SPEC_JSON} does not exist. Run build-api-docs first.`
    );
  }
  return JSON.parse(readFileSync(SPEC_JSON, "utf8"));
}

// Streamable-HTTP MCP handshake: initialize, carry the session id, then list.
async function fetchMcpTools() {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  const init = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: MCP_PROTOCOL,
        capabilities: {},
        clientInfo: { name: "alphaday-build", version: "1" },
      },
    }),
  });
  if (!init.ok) throw new Error(`MCP initialize returned HTTP ${init.status}`);

  const initBody = parseJsonRpc(await init.text());
  const serverInfo = initBody.result?.serverInfo || {};
  const sessionId = init.headers.get("mcp-session-id");
  const sessionHeaders = sessionId
    ? { ...headers, "mcp-session-id": sessionId }
    : headers;

  if (sessionId) {
    await fetch(MCP_URL, {
      method: "POST",
      headers: sessionHeaders,
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
  }

  const listed = await fetch(MCP_URL, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  });
  if (!listed.ok) throw new Error(`MCP tools/list returned HTTP ${listed.status}`);

  const tools = parseJsonRpc(await listed.text()).result?.tools || [];
  if (!tools.length) throw new Error("MCP tools/list returned no tools");

  return { serverInfo, tools };
}

// A streamable-HTTP server may answer with SSE framing instead of bare JSON.
function parseJsonRpc(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const data = trimmed
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");
  if (!data) throw new Error("MCP response was neither JSON nor SSE");
  return JSON.parse(data);
}

function readCachedMcp() {
  if (!existsSync(MCP_CACHE)) return null;
  try {
    const cached = JSON.parse(readFileSync(MCP_CACHE, "utf8"));
    return cached.tools?.length ? cached : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

// MCP tool descriptions use the same "Heading\n\nBody" shape as the OpenAPI
// operation descriptions. Split on the blank line *before* flattening
// whitespace — flattening first welds the heading onto the first body sentence
// ("Coin prices & market data Continuously-updated snapshots...").
function summarise(text, max = 150) {
  const raw = (text || "").trim();
  if (!raw) return { heading: "", body: "" };

  const [first, ...rest] = raw.split(/\n\s*\n/);
  const unwrap = (value) => value.replace(/\s*\n\s*/g, " ").trim();

  const heading = unwrap(first);
  const body = unwrap(rest.join(" "));

  // No blank line means it is a single sentence already — keep it whole.
  if (!body) return { heading: "", body: truncate(heading, max) };
  return { heading, body: truncate(body, max) };
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// One line per tool: bold heading where the server gives one, then the body.
function toolLine(tool) {
  const { heading, body } = summarise(tool.description);
  if (heading && body) return `- \`${tool.name}\` — **${heading}.** ${body}`;
  return `- \`${tool.name}\` — ${body || heading}`;
}

const HEADER = (generatedAt) => `# Alphaday

> A crypto data layer. One REST API and one MCP server over market data,
> on-chain metrics, news, governance, research, podcasts, video, events and
> security incidents — aggregated, normalised and queryable from a single
> surface. Public reads need no account, no API key and no signup.

Alphaday aggregates crypto's fragmented sources into typed, queryable
collections. The same data powers the dashboards at ${SITE} and the
programmatic surfaces below; the product is the shop window, the layer is
the thing.

This file is generated at build time from the live API spec and a live MCP
tools/list call. Generated: ${generatedAt}
`;

function accessSection(docs, mcp) {
  const toolCount = mcp.tools.length;
  const version = mcp.serverInfo?.version ? ` (v${mcp.serverInfo.version})` : "";
  return `
## Start here

- [OpenAPI spec](${SITE}/openapi.json): OpenAPI ${docs.openapiVersion} description of all ${docs.totalEndpoints} REST endpoints. Also served at ${API_BASE}/openapi.json
- [MCP endpoint](${MCP_URL}): streamable HTTP, protocol ${MCP_PROTOCOL}${version}${`, ${toolCount} tools`}. No credentials required
- [API overview](${SITE}/api): what the layer covers and how to reach it
- [Endpoint reference](${SITE}/api/docs): browsable reference for every endpoint

## Authentication

Public reads are open — no account, no key, no signup. Verified against the
live API: \`curl ${API_BASE}/items/news/\` returns 200 with no headers set.

The OpenAPI document declares \`tokenAuth\` and \`cookieAuth\` on every
operation. That reflects the optional per-user layer, not a requirement:
personalised endpoints (\`/items/*/bookmarks/\`) return 401 anonymously, while
every public collection returns 200. Per-user fields such as
\`is_bookmarked\` and \`is_liked\` are the reason the schemes are declared.

## Connecting an agent

\`\`\`bash
# REST — no auth
curl ${API_BASE}/items/news/

# Filter and paginate
curl "${API_BASE}/items/news/?limit=10&page=1"
\`\`\`

MCP client configuration:

\`\`\`json
{
  "mcpServers": {
    "alphaday": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}
\`\`\`
`;
}

function categorySection(docs, heading, detail) {
  const lines = docs.categories.map((c) => {
    const sample = c.endpoints[0];
    return `- **${c.name}** (${c.count} endpoint${c.count === 1 ? "" : "s"}) — \`${sample.path}\``;
  });
  return `
## ${heading}

${docs.totalEndpoints} endpoints across ${docs.categoryCount} collections, all
under \`${API_BASE}\`.

${lines.join("\n")}
${detail ? "" : `\nFull parameter and response detail: ${SITE}/llms-full.txt`}
`;
}

// `mcp` is always populated by the time this runs — main() either fetches it,
// falls back to the committed cache, or throws.
function toolsSection(mcp) {
  const lines = mcp.tools.map(toolLine);
  return `
## MCP tools

${mcp.tools.length} tools on \`${mcp.serverInfo?.name || "alphaday"}\`${
    mcp.serverInfo?.version ? ` v${mcp.serverInfo.version}` : ""
  }. Call \`get_server_instructions\` first — the server says so in its own
initialize response.

${lines.join("\n")}
`;
}

function endpointDetail(docs) {
  const blocks = docs.categories.map((cat) => {
    const endpoints = cat.endpoints
      .map((e) => {
        const params = e.parameters.length
          ? e.parameters
              .map((p) => `${p.name} (${p.type}${p.required ? ", required" : ""})`)
              .join(", ")
          : "none";
        const fields =
          e.returns?.itemFields?.length
            ? e.returns.itemFields.join(", ")
            : e.returns?.topLevel?.length
              ? e.returns.topLevel.join(", ")
              : "unspecified";
        return [
          `### ${e.method} ${e.path}`,
          "",
          e.summary ? `**${e.summary}**` : null,
          e.description || null,
          "",
          `- Parameters: ${params}`,
          `- Returns: ${e.returns?.kind || "unspecified"}${
            e.returns?.model ? ` of \`${e.returns.model}\`` : ""
          }`,
          `- Fields: ${fields}`,
          `- \`${e.curl}\``,
        ]
          .filter((line) => line !== null)
          .join("\n");
      })
      .join("\n\n");
    return `## ${cat.name}\n\n${endpoints}`;
  });
  return blocks.join("\n\n");
}

const FOOTER = `
## Notes

- Rate limits are not published. The API is open; use it considerately.
- \`${SITE}/sitemap.xml\` lists the indexable pages on the marketing site.
- The dashboards at ${SITE} and app.alphaday.com are built on this same layer.
`;

// ---------------------------------------------------------------------------

async function main() {
  const docs = readApiDocs();
  // The generated module records the spec's own version; fall back for older ones.
  docs.openapiVersion = docs.openapiVersion || "3.0.3";

  let mcp = null;
  try {
    mcp = await fetchMcpTools();
    writeFileSync(
      MCP_CACHE,
      `${JSON.stringify({ fetchedAt: new Date().toISOString(), ...mcp }, null, 2)}\n`,
      "utf8"
    );
  } catch (err) {
    // The tool list is the most valuable section of the file written for the
    // audience this whole phase exists to serve. Dropping it on a transient
    // blip — silently, with exit 0 — is the failure this phase was about.
    const cached = readCachedMcp();
    if (cached) {
      const ageDays = ageInDays(cached.fetchedAt);
      console.warn(
        `build-llms: MCP unreachable at ${MCP_URL} (${err.message}). ` +
          `Using the cached tool list from ${cached.fetchedAt || "an unknown date"} ` +
          `(${describeAge(ageDays)}).`
      );
      // Same ceiling as the API spec, and for the same reason: a cache is a
      // bridge over a blip, not a substitute for a source. Without this the
      // fallback published a frozen tool list forever, exiting 0 behind a
      // warning nobody reads in CI.
      assertNotStale({
        ageDays,
        artifact: "build-llms: the cached MCP tool list",
        remedy:
          `Check ${MCP_URL}, or set ALPHADAY_MCP_URL if the endpoint moved.`,
      });
      mcp = cached;
    } else {
      throw new Error(
        `build-llms: MCP unreachable at ${MCP_URL} (${err.message}) and no ` +
          `cached tool list exists at ${MCP_CACHE}. Refusing to publish an ` +
          "llms.txt whose MCP section is missing — that file's whole purpose " +
          "is to tell an agent which tools exist."
      );
    }
  }

  // Date, not a full timestamp: this file is committed, and sub-second
  // provenance would churn the diff on every single build for no reader's
  // benefit.
  const generatedAt = new Date().toISOString().slice(0, 10);

  const index = [
    HEADER(generatedAt),
    accessSection(docs, mcp),
    categorySection(docs, "Data collections", false),
    toolsSection(mcp),
    FOOTER,
  ].join("");

  const full = [
    HEADER(generatedAt),
    accessSection(docs, mcp),
    categorySection(docs, "Data collections", true),
    toolsSection(mcp),
    "\n---\n\n# Endpoint reference\n\n",
    endpointDetail(docs),
    "\n",
    FOOTER,
  ].join("");

  writeFileSync(OUT_INDEX, index, "utf8");
  writeFileSync(OUT_FULL, full, "utf8");

  console.log(
    `build-llms: wrote llms.txt (${(index.length / 1024).toFixed(1)} KB) and ` +
      `llms-full.txt (${(full.length / 1024).toFixed(1)} KB) — ` +
      `${docs.totalEndpoints} endpoints, ${mcp.tools.length} MCP tools`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
