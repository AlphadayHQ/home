/**
 * build-api-docs.js
 *
 * Build-time generator for the /api/docs reference page.
 *
 * Fetches the live OpenAPI (Swagger 2.0) spec, flattens it into a compact
 * data module the React page renders directly, and writes it to
 * src/api/docs-spec.generated.js.
 *
 * Runs before `vite build` (see package.json). If the fetch fails but a
 * previously generated module already exists, we keep the stale copy and
 * exit 0 so a transient network blip can't break the whole build.
 */
const { resolve } = require("path");
const { existsSync, writeFileSync } = require("fs");
const fetch = require("node-fetch");

const SPEC_URL =
  process.env.ALPHADAY_OPENAPI_URL ||
  "https://api.alphaday.com/docs/?format=openapi";
const API_BASE_URL = "https://api.alphaday.com";
const OUTPUT_PATH = resolve(__dirname, "../src/api/docs-spec.generated.js");

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

function modelFields(defs, name) {
  const d = defs[name];
  if (!d || !d.properties) return [];
  return Object.keys(d.properties);
}

// Reduce a Swagger response schema to { kind, model, topLevel, itemFields }.
// kinds: "paginated" (total/links/results wrapper), "object" (bare $ref),
// "array" (array of $ref), or null when there is nothing useful to show.
function buildReturns(defs, schema) {
  if (!schema) return null;

  if (schema.$ref) {
    const model = refName(schema.$ref);
    return {
      kind: "object",
      model,
      topLevel: modelFields(defs, model),
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
      itemFields: model ? modelFields(defs, model) : null,
    };
  }

  if (schema.type === "object" && schema.properties) {
    const props = schema.properties;
    if (props.results) {
      const items = (props.results && props.results.items) || {};
      const model = items.$ref ? refName(items.$ref) : null;
      return {
        kind: "paginated",
        model,
        topLevel: Object.keys(props),
        itemFields: model ? modelFields(defs, model) : null,
      };
    }
    return {
      kind: "object",
      model: null,
      topLevel: Object.keys(props),
      itemFields: null,
    };
  }

  return null;
}

function successSchema(responses) {
  if (!responses) return null;
  const res = responses["200"] || responses["201"] || responses.default;
  return res ? res.schema || null : null;
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
  return `curl -H "Authorization: Bearer $ALPHADAY_API_KEY" ${url}`;
}

function transform(spec) {
  const defs = spec.definitions || {};
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

        const parameters = (op.parameters || []).map((p) => ({
          name: p.name,
          type: p.type || (p.schema && p.schema.type) || "string",
          in: p.in,
          required: !!p.required,
          description: p.description || "",
        }));

        const endpoint = {
          method: method.toUpperCase(),
          path,
          description: (op.summary || op.description || "").trim(),
          parameters,
          returns: buildReturns(defs, successSchema(op.responses)),
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

async function main() {
  let spec;
  try {
    const res = await fetch(SPEC_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${SPEC_URL}`);
    spec = await res.json();
  } catch (err) {
    if (existsSync(OUTPUT_PATH)) {
      console.warn(
        `build-api-docs: fetch failed (${err.message}). ` +
          "Keeping existing generated module."
      );
      return;
    }
    throw new Error(
      `build-api-docs: could not fetch OpenAPI spec and no cached module ` +
        `exists at ${OUTPUT_PATH}. ${err.message}`
    );
  }

  const data = transform(spec);
  writeFileSync(OUTPUT_PATH, serialize(data), "utf8");
  console.log(
    `build-api-docs: wrote ${data.totalEndpoints} endpoints across ` +
      `${data.categoryCount} categories -> ${OUTPUT_PATH}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
