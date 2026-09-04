#!/usr/bin/env node
/**
 * Phase 2, item 1 — calibrate the §1.4 render cost.
 *
 * The instance sizing in §2.1 and the cost model in Appendix A both rest on an
 * asserted "~100 ms CPU per render". The doc flags it as unmeasured and says
 * to validate it before provisioning. This does that: it builds the real
 * project-landing tree as an SSR bundle, renders it in a loop, and reports CPU
 * time and wall-clock separately — the two the doc asks for, because they
 * answer different questions (CPU sets the instance size, wall-clock sets the
 * concurrency ceiling).
 *
 *   node scripts/calibrate-render.js [--renders 300] [--warmup 50] [--slug avalanche]
 *
 * With VITE_API_BASE_URL / VITE_X_APP_ID / VITE_X_APP_SECRET set it calibrates
 * against a live payload; otherwise it uses the committed mock, which matches
 * the same contract. The payload shape matters — it is what the render walks —
 * so the report states which one it used and how large the output was.
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import zlib from "node:zlib";

const OUT_DIR = "node_modules/.cache/alphaday-calibrate";
const ENTRY = path.join(OUT_DIR, "ssr-entry.mjs");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const RENDERS = Number(arg("renders", 300));
const WARMUP = Number(arg("warmup", 50));
const PAYLOADS = Number(arg("payloads", 30));
const COMPRESS_RUNS = 50;

const fmt = (n, digits = 2) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function build() {
  process.stdout.write("Building SSR bundle… ");
  execFileSync(
    "npx",
    ["vite", "build", "--config", "scripts/calibrate/vite.ssr.config.js"],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
  if (!fs.existsSync(ENTRY)) {
    throw new Error(`SSR build produced no ${ENTRY}`);
  }
  console.log("done");
}

/**
 * Rendering one payload 300 times measures a best case that production never
 * sees: V8 tiers up against a single object shape and every inline cache stays
 * monomorphic. Real traffic walks 66 different payloads, so the harness
 * rotates across as many as it can get.
 */
async function loadPayloads() {
  // Default to production, not VITE_API_BASE_URL. `.env.local` points at
  // staging, which carries a single landing page — calibrating against it
  // would measure one payload and call it a distribution. The corpus this has
  // to render lives on the production API.
  const root = arg("api", "https://api.alphaday.com").replace(/\/$/, "");
  const id = process.env.VITE_X_APP_ID;
  const secret = process.env.VITE_X_APP_SECRET;

  if (id && secret) {
    const headers = { "x-app-id": id, "x-app-secret": secret };
    try {
      // The list is paginated ten at a time; one page is not a sample.
      const slugs = [];
      let next = `${root}/ui/landing-pages/`;
      while (next && slugs.length < PAYLOADS) {
        const listRes = await fetch(next, { headers });
        if (!listRes.ok) break;
        const list = await listRes.json();
        for (const record of list.results || []) {
          if (record.slug && record.is_published !== false) slugs.push(record.slug);
        }
        next = list.links?.next;
      }

      const pages = await Promise.all(
        slugs.slice(0, PAYLOADS).map(async (slug) => {
          const res = await fetch(
            `${root}/ui/landing-pages/${encodeURIComponent(slug)}/`,
            { headers }
          );
          return res.ok ? res.json() : null;
        })
      );
      const data = pages.filter(Boolean);
      if (data.length) {
        return { data, source: `${root} — ${data.length} distinct pages` };
      }
    } catch (err) {
      console.warn(`  live fetch failed (${err.message}); falling back to mocks`);
    }
  }

  const { LANDING_MOCKS } = await import(
    pathToFileURL(path.resolve("src/api/mocks/landing.js")).href
  );
  const data = Object.values(LANDING_MOCKS);
  return { data, source: `committed mocks — ${data.length} distinct pages` };
}

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

async function main() {
  build();

  const { data, source } = await loadPayloads();
  const { renderPage } = await import(pathToFileURL(path.resolve(ENTRY)).href);

  // Warm up: V8 needs to tier up the render path, and the first render also
  // pays one-off module-init costs that no steady-state request pays.
  for (let i = 0; i < WARMUP; i += 1) renderPage(data[i % data.length]);

  const wall = [];
  let perRenderCpu = 0;
  let bytes = 0;

  // Two CPU measurements, deliberately. Summing per-render deltas misses every
  // millisecond of GC that lands *between* two renders — and a render that
  // allocates a 57 KB string per call generates exactly that kind of deferred
  // garbage. The batch measurement brackets the whole loop, so nothing escapes
  // it. The gap between the two numbers is the deferred cost, and it is the
  // honest one to size an instance against.
  const batchCpuBefore = process.cpuUsage();
  const batchT0 = process.hrtime.bigint();

  for (let i = 0; i < RENDERS; i += 1) {
    const cpuBefore = process.cpuUsage();
    const t0 = process.hrtime.bigint();
    const out = renderPage(data[i % data.length]);
    const t1 = process.hrtime.bigint();
    const cpuAfter = process.cpuUsage(cpuBefore);

    wall.push(Number(t1 - t0) / 1e6);
    perRenderCpu += (cpuAfter.user + cpuAfter.system) / 1000;
    bytes += out.head.length + out.body.length;
  }

  const batchT1 = process.hrtime.bigint();
  const batchCpu = process.cpuUsage(batchCpuBefore);

  wall.sort((a, b) => a - b);
  const meanWall = wall.reduce((a, b) => a + b, 0) / wall.length;
  const meanPerRenderCpu = perRenderCpu / RENDERS;
  const meanCpu = (batchCpu.user + batchCpu.system) / 1000 / RENDERS;
  const batchWall = Number(batchT1 - batchT0) / 1e6;
  const throughput = RENDERS / (batchWall / 1000);
  bytes /= RENDERS;

  const heap = process.memoryUsage().heapUsed / 1024 / 1024;

  // Producing the HTML is not the whole per-request CPU cost. A 59 KB response
  // still has to be compressed, and on a text payload that size the compressor
  // can easily cost more than the render did. Worth knowing which one actually
  // sizes the box before concluding anything about the instance.
  const sample = renderPage(data[0]);
  const html = sample.head + sample.body;
  const compress = (label, fn) => {
    const t0 = process.hrtime.bigint();
    const cpu0 = process.cpuUsage();
    let out;
    for (let i = 0; i < COMPRESS_RUNS; i += 1) out = fn(html);
    const cpu = process.cpuUsage(cpu0);
    return {
      label,
      ms: (cpu.user + cpu.system) / 1000 / COMPRESS_RUNS,
      wall: Number(process.hrtime.bigint() - t0) / 1e6 / COMPRESS_RUNS,
      size: out.length,
    };
  };
  const compression = [
    compress("gzip (level 6, default)", (h) => zlib.gzipSync(h)),
    compress("brotli (quality 4)", (h) =>
      zlib.brotliCompressSync(h, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 },
      })
    ),
    compress("brotli (quality 11, max)", (h) =>
      zlib.brotliCompressSync(h, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
      })
    ),
  ];

  console.log(`
Render calibration — §1.4
─────────────────────────────────────────────────────────
Payload        ${source}
Renders        ${RENDERS} measured, ${WARMUP} warm-up
HTML out       ${fmt(bytes / 1024, 1)} KB per render (mean)
Node           ${process.version} on ${process.platform}/${process.arch}
Heap after     ${fmt(heap, 1)} MB

CPU per render (this is what sizes the instance)
  batch mean   ${fmt(meanCpu)} ms   ← use this one; includes deferred GC
  in-render    ${fmt(meanPerRenderCpu)} ms   (undercounts by ${fmt(
    ((meanCpu - meanPerRenderCpu) / meanCpu) * 100,
    1
  )}%)
  throughput   ${fmt(throughput, 0)} renders/sec on one core

Wall-clock per render (this is what sets the concurrency ceiling)
  median       ${fmt(percentile(wall, 50))} ms
  p95          ${fmt(percentile(wall, 95))} ms
  p99          ${fmt(percentile(wall, 99))} ms
  mean         ${fmt(meanWall)} ms

Compressing that same response, for comparison
${compression
  .map(
    (c) =>
      `  ${c.label.padEnd(26)} ${fmt(c.ms).padStart(7)} ms CPU   →  ${fmt(
        c.size / 1024,
        1
      )} KB (${fmt((c.ms / meanCpu) * 100, 0)}% of a render)`
  )
  .join("\n")}
`);

  // §1.4's table is stated in sustained vCPU against a 0.2 vCPU t4g.micro
  // baseline. Recompute those rows from the measured number so the comparison
  // is like for like.
  const SECONDS_PER_MONTH = 30 * 24 * 3600;
  const rows = [
    ["100k PV", 180_000],
    ["1M PV", 650_000],
    ["5M PV", 1_500_000],
  ];
  console.log("Implied sustained vCPU, recomputed from the measurement:");
  console.log("  Traffic    Renders/mo   Sustained vCPU   % of 0.2 baseline");
  for (const [label, renders] of rows) {
    const vcpu = (renders * meanCpu) / 1000 / SECONDS_PER_MONTH;
    console.log(
      `  ${label.padEnd(10)} ${String(renders).padStart(10)}   ${fmt(vcpu, 4).padStart(14)}   ${fmt(
        (vcpu / 0.2) * 100,
        1
      ).padStart(6)}%`
    );
  }
  console.log(`
Caveat: measured on ${process.arch}, not the Graviton2 of a t4g.micro, and with
no upstream API call in the loop. Treat the CPU figure as the render's own cost
on comparable-generation ARM; add the upstream wait to wall-clock separately.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
