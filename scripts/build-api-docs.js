/**
 * build-api-docs.js
 *
 * Build-time generator for the /api/docs reference page and /openapi.json.
 *
 * Fetches the live OpenAPI 3 spec, flattens it into a compact data module the
 * React page renders directly (src/api/docs-spec.generated.js), and writes the
 * spec itself to public/openapi.json for machine consumers (§6.3).
 *
 * Runs before `vite build` (see package.json). If the fetch fails but a
 * previously generated module already exists, we keep the stale copy and
 * exit 0 so a transient network blip can't break the whole build — but see
 * MAX_STALE_DAYS: past that point it is not a blip, it is a broken source, and
 * silence is how the previous spec URL stayed dead without anyone noticing.
 */
const { resolve } = require("path");
const { existsSync, readFileSync, writeFileSync } = require("fs");
const fetch = require("node-fetch");
const {
  MAX_STALE_DAYS,
  ageInDays,
  assertNotStale,
  describeAge,
} = require("./staleness");

// The API previously served Swagger 2.0 at /docs/?format=openapi. That URL now
// returns 404 and the spec moved to /openapi.json in OpenAPI 3.0.3 form.
const SPEC_URL =
  process.env.ALPHADAY_OPENAPI_URL || "https://api.alphaday.com/openapi.json";
const API_BASE_URL = "https://api.alphaday.com";
const OUTPUT_PATH = resolve(__dirname, "../src/api/docs-spec.generated.js");
// Same payload as the JS module, for build scripts. Reading this beats
// regex-parsing the module and coupling two scripts to its exact serialisation.
const OUTPUT_JSON_PATH = resolve(__dirname, "../src/api/docs-spec.generated.json");
// public/ is copied verbatim into dist/ by Vite, so this lands at /openapi.json.
const SPEC_OUTPUT_PATH = resolve(__dirname, "../public/openapi.json");

// Category display order + labels + lucide icon names. Keys are either an
// OpenAPI tag, or — for the catch-all "items" tag — the resource segment of
// the path (/items/<segment>/), which is how the mockup's 15 categories split.
const CATEGORY_META = {
  news: { name: "News", icon: "Newspaper" },
  events: { name: "Events", icon: "Calendar" },
  videos: { name: "Videos", icon: "Video" },
  market: { name: "Market", icon: "LineChart" },
  tvl: { name: "TVL Suite", icon: "Layers" },
  podcasts: { name: "Podcasts", icon: "Mic" },
  blogs: { name: "Blogs", icon: "FileText" },
  dao: { name: "DAO", icon: "Landmark" },
  forum: { name: "Forum", icon: "MessagesSquare" },
  coins: { name: "Coins & Categories", icon: "Coins" },
  exchanges: { name: "Exchanges", icon: "Building2" },
  "onchain-dexes": { name: "On-chain DEXes", icon: "ArrowLeftRight" },
  security: { name: "Security & Exploits", icon: "ShieldAlert" },
  keywords: { name: "Trending Keywords", icon: "Flame" },
  kasandra: { name: "Kasandra AI", icon: "Bot" },
  tags: { name: "Tags & Projects", icon: "Tags" },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

function categoryKey(op, path) {
  const tag = (op.tags && op.tags[0]) || "other";
  if (tag === "items") {
    // "/items/news/" -> ["", "items", "news", ""] -> "news"
    return path.split("/")[2] || tag;
  }
  return tag;
}

function refName(ref) {
  return ref.split("/").pop();
}

function modelFields(schemas, name) {
  const d = schemas[name];
  if (!d || !d.properties) return [];
  return Object.keys(d.properties);
}

// Reduce a response schema to { kind, model, topLevel, itemFields }.
// kinds: "paginated" (links/total/results wrapper), "object" (bare $ref),
// "array" (array of $ref), or null when there is nothing useful to show.
//
// In OpenAPI 3 the pagination wrapper is a *named* schema reached through a
// $ref (PaginatedNewsReadOnlyList), where Swagger 2 inlined it. Detecting it
// therefore means resolving the ref first — without that every list endpoint
// degrades to a bare object with no item fields, which still looks like a
// successful build.
function deref(schemas, schema) {
  if (!schema || !schema.$ref) return schema;
  return schemas[refName(schema.$ref)] || null;
}

function isPaginated(schema) {
  return !!(
    schema &&
    schema.properties &&
    schema.properties.results &&
    schema.properties.results.type === "array"
  );
}

function buildReturns(schemas, schema) {
  if (!schema) return null;

  if (schema.$ref) {
    const model = refName(schema.$ref);
    const resolved = deref(schemas, schema);

    if (isPaginated(resolved)) {
      const itemRef = resolved.properties.results.items || {};
      const itemModel = itemRef.$ref ? refName(itemRef.$ref) : null;
      return {
        kind: "paginated",
        model: itemModel || model,
        topLevel: Object.keys(resolved.properties),
        itemFields: itemModel ? modelFields(schemas, itemModel) : null,
      };
    }

    return {
      kind: "object",
      model,
      topLevel: modelFields(schemas, model),
      itemFields: null,
    };
  }

  if (schema.type === "array") {
    const items = schema.items || {};
    const model = items.$ref ? refName(items.$ref) : null;
    return {
      kind: "array",
      model,
      topLevel: null,
      itemFields: model ? modelFields(schemas, model) : null,
    };
  }

  if (schema.type === "object" && schema.properties) {
    if (isPaginated(schema)) {
      const items = schema.properties.results.items || {};
      const model = items.$ref ? refName(items.$ref) : null;
      return {
        kind: "paginated",
        model,
        topLevel: Object.keys(schema.properties),
        itemFields: model ? modelFields(schemas, model) : null,
      };
    }
    return {
      kind: "object",
      model: null,
      topLevel: Object.keys(schema.properties),
      itemFields: null,
    };
  }

  return null;
}

// OpenAPI 3 nests the schema under content[mediaType].schema, where Swagger 2
// had it directly on the response. Reading the old shape against a v3 spec
// yields `null` for every endpoint — silently, which is why the version guard
// in main() exists rather than a best-effort fallback.
function successSchema(responses) {
  if (!responses) return null;
  const res = responses["200"] || responses["201"] || responses.default;
  if (!res || !res.content) return null;
  const media =
    res.content["application/json"] ||
    res.content[Object.keys(res.content)[0]];
  return (media && media.schema) || null;
}

function sampleForPathParam(name) {
  if (name === "coin") return "bitcoin";
  if (name === "id") return "123";
  return "123";
}

function buildCurl(path) {
  const url =
    API_BASE_URL +
    path.replace(/\{(\w+)\}/g, (_, name) => sampleForPathParam(name));
  // The API is currently open — no auth header required.
  return `curl ${url}`;
}

// First paragraph -> heading, remainder -> supporting text. Newlines inside a
// paragraph are wrapping artifacts of the Python docstring, not intent.
function splitDescription(op) {
  const explicit = (op.summary || "").trim();
  const full = (op.description || "").trim();
  if (!full) return { summary: explicit || null, description: "" };

  const [first, ...rest] = full.split(/\n\s*\n/);
  const unwrap = (text) => text.replace(/\s*\n\s*/g, " ").trim();

  if (explicit) return { summary: explicit, description: unwrap(full) };
  return { summary: unwrap(first) || null, description: unwrap(rest.join("\n\n")) };
}

function transform(spec) {
  const schemas = (spec.components && spec.components.schemas) || {};
  const buckets = {}; // key -> endpoint[]

  Object.keys(spec.paths || {})
    .sort()
    .forEach((path) => {
      const item = spec.paths[path];
      Object.keys(item).forEach((method) => {
        if (!["get", "post", "put", "patch", "delete"].includes(method))
          return;
        const op = item[method];
        const key = categoryKey(op, path);

        // OpenAPI 3 moves the type onto `schema`; Swagger 2 had it inline.
        const parameters = (op.parameters || []).map((p) => ({
          name: p.name,
          type: (p.schema && p.schema.type) || p.type || "string",
          in: p.in,
          required: !!p.required,
          description: p.description || "",
        }));

        // Two-tier text: a bold heading plus a supporting sentence. drf-spectacular
        // concatenates operation_summary and operation_description into a single
        // `description`, separated by a blank line, and emits no `summary` at
        // all — so split the first paragraph back out. Falls back to the
        // `summary` field for any spec that still populates it.
        const { summary, description } = splitDescription(op);

        const endpoint = {
          method: method.toUpperCase(),
          path,
          // Kept for backwards-compat / search; heading falls back to it when no summary.
          summary: summary || null,
          description,
          parameters,
          returns: buildReturns(schemas, successSchema(op.responses)),
          curl: buildCurl(path),
        };

        (buckets[key] = buckets[key] || []).push(endpoint);
      });
    });

  const knownKeys = CATEGORY_ORDER.filter((k) => buckets[k]);
  const extraKeys = Object.keys(buckets)
    .filter((k) => !CATEGORY_META[k])
    .sort();
  const orderedKeys = [...knownKeys, ...extraKeys];

  const categories = orderedKeys.map((key) => {
    const meta = CATEGORY_META[key] || { name: key, icon: "Blocks" };
    return {
      key,
      name: meta.name,
      icon: meta.icon,
      count: buckets[key].length,
      endpoints: buckets[key],
    };
  });

  const totalEndpoints = categories.reduce((n, c) => n + c.count, 0);

  return {
    source: SPEC_URL,
    generatedAt: new Date().toISOString(),
    baseUrl: API_BASE_URL,
    // Recorded so downstream generators state the real version rather than
    // carrying their own copy of it.
    openapiVersion: spec.openapi || null,
    title: (spec.info && spec.info.title) || "Alphaday API",
    version: (spec.info && spec.info.version) || "",
    totalEndpoints,
    categoryCount: categories.length,
    categories,
  };
}

function serialize(data) {
  return (
    "// AUTO-GENERATED by scripts/build-api-docs.js — do not edit by hand.\n" +
    `// Source: ${data.source}\n` +
    `// Regenerated on each build. Last run: ${data.generatedAt}\n\n` +
    `export const API_DOCS = ${JSON.stringify(data, null, 2)};\n\n` +
    "export default API_DOCS;\n"
  );
}

// Age of the cached module, read from the timestamp its own header carries.
function cachedGeneratedAt() {
  if (!existsSync(OUTPUT_PATH)) return null;
  const match = readFileSync(OUTPUT_PATH, "utf8").match(
    /"generatedAt":\s*"([^"]+)"/
  );
  if (!match) return null;
  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? null : date;
}

function reportStaleFallback(err) {
  const generatedAt = cachedGeneratedAt();
  const ageDays = ageInDays(generatedAt ? generatedAt.toISOString() : null);

  const banner = "=".repeat(72);
  console.warn(
    `\n${banner}\n` +
      `build-api-docs: COULD NOT FETCH THE API SPEC\n` +
      `  url:    ${SPEC_URL}\n` +
      `  error:  ${err.message}\n` +
      `  cached: ${generatedAt ? generatedAt.toISOString() : "unknown date"}` +
      ` (${describeAge(ageDays)})\n` +
      `  Falling back to the committed copies of the generated module and\n` +
      `  public/openapi.json. If the URL above is wrong, every consumer of\n` +
      `  /api/docs and /openapi.json is being served a stale API surface.\n${banner}\n`
  );

  // Past the threshold this is not a transient blip. Fail, so a dead spec URL
  // cannot sit unnoticed behind a green build the way the last one did.
  assertNotStale({
    ageDays,
    artifact: "build-api-docs: the cached API spec",
    remedy: `Fix ${SPEC_URL} or set ALPHADAY_OPENAPI_URL.`,
  });
}

async function main() {
  let spec;
  try {
    const res = await fetch(SPEC_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${SPEC_URL}`);
    spec = await res.json();
  } catch (err) {
    // Both artifacts must already exist for the fallback to be survivable.
    // Returning on the module alone used to leave public/openapi.json unwritten
    // — so a single fetch blip shipped a site where /openapi.json 404s while
    // llms.txt still advertises it as the first thing to fetch.
    if (existsSync(OUTPUT_PATH) && existsSync(SPEC_OUTPUT_PATH)) {
      reportStaleFallback(err);
      return;
    }
    throw new Error(
      "build-api-docs: could not fetch the OpenAPI spec, and there is no " +
        "complete cached copy to fall back to " +
        `(module: ${existsSync(OUTPUT_PATH) ? "present" : "MISSING"}, ` +
        `spec: ${existsSync(SPEC_OUTPUT_PATH) ? "present" : "MISSING"}). ` +
        `Both are committed to the repo, so a missing one means something ` +
        `deleted it. ${err.message}`
    );
  }

  // Fail loudly on a Swagger 2.0 document rather than transforming it into 53
  // endpoints with an empty `returns` on every one. The old shape produced
  // exactly that, and it looks like success.
  if (!spec.openapi || !String(spec.openapi).startsWith("3.")) {
    throw new Error(
      "build-api-docs: expected an OpenAPI 3 document at " +
        `${SPEC_URL}, got ${spec.openapi ? `openapi ${spec.openapi}` : `swagger ${spec.swagger || "?"}`}. ` +
        "The transform reads components.schemas and responses[].content[].schema; " +
        "a Swagger 2.0 spec would yield empty response models throughout."
    );
  }

  const data = transform(spec);
  writeFileSync(OUTPUT_PATH, serialize(data), "utf8");
  writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  // §6.3: serve the spec statically so agents consume the API surface directly
  // instead of parsing marketing copy about it. Upstream omits `servers`, which
  // leaves every path relative and the base URL a guess — supply it, since an
  // agent cannot call an endpoint it cannot address.
  const publicSpec = { ...spec };
  if (!Array.isArray(publicSpec.servers) || !publicSpec.servers.length) {
    publicSpec.servers = [{ url: API_BASE_URL, description: "Production" }];
  }
  writeFileSync(SPEC_OUTPUT_PATH, `${JSON.stringify(publicSpec, null, 2)}\n`, "utf8");

  console.log(
    `build-api-docs: wrote ${data.totalEndpoints} endpoints across ` +
      `${data.categoryCount} categories -> ${OUTPUT_PATH}`
  );
  console.log(
    `build-api-docs: wrote OpenAPI ${spec.openapi} spec -> ${SPEC_OUTPUT_PATH}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
