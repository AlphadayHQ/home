#!/usr/bin/env node
/**
 * Appendix B regression guard.
 *
 * Every check here corresponds to a numbered, verified failure of the live SPA.
 * The point is not "does the site build" — it is "is each specific thing that
 * was broken now provably not broken", asserted against real HTTP responses
 * from a running server rather than against source code.
 *
 *   node scripts/verify-ssr.mjs [--base http://localhost:3000]
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");

const results = [];
const check = (finding, name, pass, detail = "") =>
  results.push({ finding, name, pass, detail });

const get = async (path, redirect = "manual") => {
  const res = await fetch(`${BASE}${path}`, { redirect });
  const body = await res.text();
  return { res, body, status: res.status };
};

const countMatches = (html, re) => (html.match(re) ?? []).length;
const canonicalOf = (html) =>
  html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1] ?? null;
const titleOf = (html) => html.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] ?? null;
const robotsOf = (html) =>
  html.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/)?.[1] ?? null;

async function main() {
  const home = await get("/");
  const api = await get("/api");
  const apiDocs = await get("/api/docs");
  const mobile = await get("/mobile");
  const privacy = await get("/privacy");
  const dashboards = await get("/dashboards");
  const missing = await get("/nonexistent-page-xyz-999");

  // 1, 5, 6 — canonical is per-route and never the home page by default.
  const homeCanonical = canonicalOf(home.body);
  for (const [path, page] of [
    ["/api", api],
    ["/api/docs", apiDocs],
    ["/mobile", mobile],
    ["/privacy", privacy],
    ["/dashboards", dashboards],
  ]) {
    const canonical = canonicalOf(page.body);
    check(
      "1,5,6",
      `${path} has its own canonical`,
      Boolean(canonical) && canonical !== homeCanonical && canonical.endsWith(path),
      canonical ?? "none"
    );
    check(
      "5",
      `${path} emits exactly one canonical`,
      countMatches(page.body, /rel="canonical"/g) === 1,
      `${countMatches(page.body, /rel="canonical"/g)} found`
    );
  }

  // 2 — server-rendered content, for the crawlers that do not execute JS.
  check(
    "2",
    "/dashboards server-renders its content",
    dashboards.body.includes("<h1") || dashboards.body.length > 20000,
    `${dashboards.body.length} bytes`
  );

  // 3 — a real 404 status, not 200 with 404 content.
  check("3", "unknown URL returns HTTP 404", missing.status === 404, `got ${missing.status}`);

  // 4 — noindex is expressible at all.
  check(
    "4",
    "404 page is noindex",
    (robotsOf(missing.body) ?? "").includes("noindex"),
    robotsOf(missing.body) ?? "none"
  );
  check(
    "4",
    "noindex page emits no canonical (no conflicting signal)",
    canonicalOf(missing.body) === null,
    canonicalOf(missing.body) ?? "none"
  );
  check(
    "4",
    "indexable page is index,follow",
    (robotsOf(home.body) ?? "").startsWith("index"),
    robotsOf(home.body) ?? "none"
  );

  // 6 — unique titles, no site-wide default inherited.
  const titles = [home, api, apiDocs, mobile, privacy, dashboards].map((p) =>
    titleOf(p.body)
  );
  check(
    "6",
    "every route has a unique title",
    new Set(titles).size === titles.length && titles.every(Boolean),
    titles.join(" | ")
  );

  // Appendix C: every indexable route needs a unique description too, not just
  // a unique title. The SPA inherited a site-wide default for both.
  const descriptions = [home, api, apiDocs, mobile, privacy, dashboards].map(
    (p) => p.body.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/)?.[1]
  );
  check(
    "6",
    "every route has a unique description",
    new Set(descriptions).size === descriptions.length && descriptions.every(Boolean),
    `${new Set(descriptions).size} unique of ${descriptions.length}`
  );

  // 7 — one h1 per page. The plan asked for this to be enforced by lint; there
  // is no linter in this repo, and asserting it on the rendered HTML is the
  // stronger check anyway — it catches a second h1 arriving from a component
  // the route did not obviously include, which a source rule would miss.
  const project = await get("/projects/ethereum");
  for (const [path, page] of [
    ["/", home],
    ["/api", api],
    ["/api/docs", apiDocs],
    ["/mobile", mobile],
    ["/privacy", privacy],
    ["/dashboards", dashboards],
    ["/projects/ethereum", project],
  ]) {
    const n = countMatches(page.body, /<h1[\s>]/g);
    check("7", `${path} has exactly one <h1>`, n === 1, `${n} found`);
  }

  // 15 — real server-side 301s, not window.location.replace().
  const blog = await get("/blog");
  check("15", "/blog is a real 301", blog.status === 301, `got ${blog.status}`);
  const board = await get("/b/ethereum");
  check("15", "/b/{slug} is a real 301", board.status === 301, `got ${board.status}`);

  // §3.1 — old root-level project URLs 301 to /projects/{slug}.
  const legacy = await get("/ethereum");
  check(
    "3.1",
    "/ethereum 301s to /projects/ethereum",
    legacy.status === 301 &&
      (legacy.res.headers.get("location") ?? "").endsWith("/projects/ethereum"),
    `${legacy.status} → ${legacy.res.headers.get("location")}`
  );

  // 16 — every project page reachable from a server-rendered hub link.
  const linked = new Set(
    [...dashboards.body.matchAll(/href="\/projects\/([a-z0-9-]+)"/g)].map((m) => m[1])
  );
  check(
    "16",
    "/dashboards links every project page",
    linked.size >= 60,
    `${linked.size} project links server-rendered`
  );

  // 18 — Organization + WebSite on the home page, FAQPage where an FAQ renders.
  for (const type of ["Organization", "WebSite", "FAQPage"]) {
    check("18", `home page emits ${type} schema`, home.body.includes(`"${type}"`));
  }

  // 11 — the discovery root must not link to anything broken, and 16's fix
  // must not have introduced a redirect hop: an internal link that 301s wastes
  // crawl budget on exactly the pages this is trying to get crawled.
  const internal = [
    ...new Set(
      [...home.body.matchAll(/href="(\/projects\/[a-z0-9-]+)"/g)].map((m) => m[1])
    ),
  ].slice(0, 8);
  const statuses = await Promise.all(
    internal.map(async (href) => [href, (await get(href)).status])
  );
  check(
    "11,16",
    "internal project links resolve 200 with no redirect hop",
    statuses.every(([, code]) => code === 200),
    statuses.map(([h, c]) => `${h}:${c}`).join(" ") || "none found"
  );

  // 18 — the structured data has to actually parse. A bare array with no
  // `@context` renders, validates as HTML, and is silently ignored by every
  // consumer — the failure mode is invisible without a check like this.
  for (const [path, page] of [
    ["/", home],
    ["/dashboards", dashboards],
  ]) {
    const blocks = [
      ...page.body.matchAll(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
      ),
    ].map((m) => m[1]);

    check("18", `${path} emits at least one JSON-LD block`, blocks.length > 0);

    let parsed = [];
    let ok = true;
    for (const block of blocks) {
      try {
        parsed.push(JSON.parse(block));
      } catch {
        ok = false;
      }
    }
    check("18", `${path} JSON-LD parses`, ok, `${blocks.length} blocks`);
    check(
      "18",
      `${path} every JSON-LD block declares @context`,
      parsed.every((doc) => Boolean(doc["@context"])),
      parsed.map((d) => (d["@context"] ? "ok" : "MISSING")).join(",")
    );

    // Duplicate @ids mean the same entity was emitted twice, which is what
    // happens when a shared graph builder is handed the nodes it already adds.
    const ids = parsed
      .flatMap((doc) => doc["@graph"] ?? [doc])
      .map((node) => node["@id"])
      .filter(Boolean);
    check(
      "18",
      `${path} has no duplicate JSON-LD @id`,
      new Set(ids).size === ids.length,
      `${ids.length} ids, ${new Set(ids).size} unique`
    );
  }

  // The favicon is declared in the shell and emitted by the bundler; a
  // hard-coded path silently 404s and nothing else in this suite would notice.
  const faviconHref = home.body.match(
    /<link[^>]+rel="icon"[^>]+href="([^"]+)"/
  )?.[1];
  const favicon = faviconHref ? await fetch(`${BASE}${faviconHref}`) : null;
  check(
    "shell",
    "declared favicon actually resolves",
    favicon?.status === 200,
    faviconHref ? `${faviconHref} → ${favicon?.status}` : "no icon declared"
  );

  // 19 — no dead links on the discovery root.
  check(
    "19",
    'home page has no href="#" dead links',
    !/href="#"/.test(home.body),
    countMatches(home.body, /href="#"/g) + " found"
  );

  // 20 — the app secret must not reach any client asset.
  //
  // Checking for the *name* is not enough and would have given false comfort:
  // Vite inlines `import.meta.env.VITE_*` as a string literal, so a leak is the
  // secret's VALUE appearing with no variable name anywhere near it. When the
  // credential is in the environment this greps for the literal; the name check
  // stays as a backstop for when it is not.
  const clientDir = join(process.cwd(), "dist/client");
  const secrets = [
    process.env.API_APP_SECRET,
    process.env.VITE_X_APP_SECRET,
    process.env.API_APP_ID,
    process.env.VITE_X_APP_ID,
  ].filter((value) => value && value.length >= 8);

  const walkFiles = (dir) =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const full = join(dir, entry.name);
          return entry.isDirectory() ? walkFiles(full) : [full];
        })
      : [];

  const leaked = [];
  // Every emitted file, not just .js — a sourcemap, a JSON chunk or the HTML
  // shell would carry it just as far.
  for (const file of walkFiles(clientDir)) {
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue; // binary asset
    }
    if (/x-app-secret|X_APP_SECRET/i.test(text)) leaked.push(`${file} (name)`);
    if (secrets.some((value) => text.includes(value))) {
      leaked.push(`${file} (VALUE)`);
    }
  }
  check(
    "20",
    "app credentials absent from every client asset",
    leaked.length === 0,
    leaked.join(", ") ||
      (secrets.length
        ? `clean — ${secrets.length} credential(s) checked by value across the client build`
        : "clean by name only — no credentials in env to check by value")
  );

  // 8, 9, 10, 12, 13 — the sitemap.
  const sitemapPath = join(process.cwd(), "dist/client/sitemap.xml");
  if (existsSync(sitemapPath)) {
    const index = readFileSync(sitemapPath, "utf8");
    check("12", "sitemap.xml is a valid sitemap index", index.includes("<sitemapindex"));
    check("12", "sitemap.xml has no stray elements", !/<script/.test(index));

    const pages = readFileSync(join(process.cwd(), "dist/client/sitemaps/pages.xml"), "utf8");
    check("8", "/api is in the sitemap", pages.includes("/api<") || pages.includes("/api</loc>"));
    check("8", "/api/docs is in the sitemap", pages.includes("/api/docs</loc>"));

    const projects = readFileSync(
      join(process.cwd(), "dist/client/sitemaps/projects.xml"),
      "utf8"
    );
    const locs = [...projects.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    check("9,10", "every sitemap project URL is /projects/{slug}", locs.every((l) => l.includes("/projects/")), `${locs.length} URLs`);
    check(
      "13",
      "sitemap lastmod is not the build time",
      !projects.includes(new Date().toISOString().slice(0, 10) + "T0"),
      "no build-time stamps"
    );
  } else {
    check("8,9,12,13", "sitemap present", false, "dist/client/sitemap.xml missing — run build-sitemap");
  }

  // §4.2's central invariant, asserted end to end rather than by reading the
  // code: fetch every URL the sitemap publishes and confirm the page itself
  // agrees it is indexable. If the gate ever lets a substrate page through,
  // this is what catches it — the two sides are supposed to be incapable of
  // disagreeing, and this is the check that the shared module actually works.
  const projectsXml = join(process.cwd(), "dist/client/sitemaps/projects.xml");
  if (existsSync(projectsXml)) {
    const locs = [
      ...readFileSync(projectsXml, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g),
    ].map((m) => new URL(m[1]).pathname);

    // A sample, not all 66 — enough to catch a systematic gate failure without
    // making the guard take a minute to run.
    const sample = locs.slice(0, 6);
    const states = await Promise.all(
      sample.map(async (path) => {
        const page = await get(path);
        const robots = page.body.match(
          /<meta[^>]+name="robots"[^>]+content="([^"]+)"/
        )?.[1];
        return [path, page.status, robots];
      })
    );
    check(
      "4.2",
      "every sampled sitemap URL is 200 and indexable",
      states.every(([, status, robots]) => status === 200 && robots?.startsWith("index")),
      states
        .filter(([, s2, r]) => s2 !== 200 || !r?.startsWith("index"))
        .map(([p2, s2]) => `${p2}:${s2}`)
        .join(" ") || `${sample.length} sampled of ${locs.length}`
    );
  }

  const failed = results.filter((r) => !r.pass);
  for (const r of results) {
    console.log(
      `${r.pass ? "PASS" : "FAIL"}  [B${r.finding.padEnd(6)}] ${r.name}${
        r.detail ? `  — ${r.detail}` : ""
      }`
    );
  }
  console.log(
    `\n${results.length - failed.length}/${results.length} passed` +
      (failed.length ? `, ${failed.length} FAILED` : "")
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
