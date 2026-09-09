#!/usr/bin/env node
/**
 * Production server: a Node adapter around the fetch handler the Start build
 * emits, plus the static tier and the cache policy from §2.3.
 *
 * This is also the only place `Cache-Control` is set for HTML, and it is the
 * one caching configuration in the system (§2.3) — CloudFront honours it and
 * that is what provides the ISR equivalent. There is deliberately no origin
 * cache: the edge already does stale-while-revalidate, and a second cache layer
 * would add a second place for stale content to hide.
 */
import { createServer } from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { Readable } from "node:stream";

const root = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(root, "dist/client");
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

const { default: handler } = await import("./dist/server/server.mjs");

/**
 * §2.3. `max-age=0` so a browser never holds a stale page; `s-maxage` is how
 * long the edge treats it as fresh; `stale-while-revalidate` lets the edge
 * serve instantly and refresh behind it, which is what keeps render volume low
 * and TTFB flat; `stale-if-error` is what makes a deploy or an instance
 * replacement invisible — a week of stale beats an error page.
 *
 * Tune `s-maxage` per tier as content types are added: minutes for digests and
 * trending pages, hours for entity hubs, days for editorial and tool pages.
 */
const HTML_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800";

// Content-hashed filenames are immutable and should never reach the origin
// twice (§2.5).
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
};

function staticFileFor(pathname) {
  // normalize collapses `..`; the prefix check then makes traversal out of
  // dist/client impossible regardless of what the client sent.
  const candidate = normalize(join(CLIENT_DIR, decodeURIComponent(pathname)));
  if (!candidate.startsWith(CLIENT_DIR)) return null;
  if (!existsSync(candidate)) return null;
  const stat = statSync(candidate);
  return stat.isFile() ? { path: candidate, size: stat.size } : null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    const file = staticFileFor(url.pathname);
    if (file) {
      const ext = extname(file.path);
      res.writeHead(200, {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": file.size,
        "Cache-Control": url.pathname.startsWith("/assets/")
          ? IMMUTABLE_CACHE_CONTROL
          : "public, max-age=300, s-maxage=3600",
      });
      createReadStream(file.path).pipe(res);
      return;
    }

    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : Readable.toWeb(req),
      duplex: "half",
    });

    const response = await handler.fetch(request);

    const headers = new Headers(response.headers);
    // Don't cache a redirect or an error the way a page is cached, and never
    // let the edge hold a 404 for an hour on a URL that is about to exist.
    if (!headers.has("Cache-Control") && response.status === 200) {
      headers.set("Cache-Control", HTML_CACHE_CONTROL);
    }
    /*
     * §4.2 wants X-Robots-Tag on every response. Routes set it from the
     * index-state registry, but the not-found path builds its response without
     * the headers accumulated during matching, so an error would otherwise go
     * out with no directive at all. Default-deny at the boundary: any 4xx/5xx
     * that has not declared itself is noindex.
     */
    if (response.status >= 400 && !headers.has("X-Robots-Tag")) {
      headers.set("X-Robots-Tag", "noindex, follow");
    }

    res.writeHead(response.status, Object.fromEntries(headers));
    if (response.body) {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`alphaday listening on http://${HOST}:${PORT}`);
});

const shutdown = () => server.close((error) => process.exit(error ? 1 : 0));

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
