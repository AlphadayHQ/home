import { describe, expect, it } from "vitest";
import { createHtmlCache, htmlUrl } from "../../scripts/htmlCache.ts";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cacheControl = "public, max-age=0, s-maxage=300, stale-if-error=600";
const request = (path = "/projects/bitcoin", headers: HeadersInit = {}) =>
  new Request(`https://alphaday.com${path}`, { headers });
const html = (body: string, headers: HeadersInit = {}) => new Response(body, {
  headers: { "content-type": "text/html; charset=utf-8", ...headers },
});

describe("shared rendered HTML", () => {
  it("shares one pending render across tracking URLs and keeps other pages independent", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    const read = createHtmlCache(async (req) => {
      calls += 1;
      if (new URL(req.url).pathname === "/projects/bitcoin") await gate;
      return html(req.url);
    }, { cacheControl });
    const one = read(request("/projects/bitcoin?utm_source=email"));
    const two = read(request("/projects/bitcoin/?utm_source=social"));
    expect(await (await read(request("/projects/ethereum"))).text()).toContain("ethereum");
    expect(calls).toBe(2);
    release();
    expect(await (await one).text()).toBe(await (await two).text());
    await read(request());
    expect(calls).toBe(2);
  });

  it("keeps pagination distinct and preserves invalid and repeated page arguments", () => {
    expect(htmlUrl(request("/research/trending?page=1&utm_source=email"))?.href)
      .toBe("https://alphaday.com/research/trending");
    expect(htmlUrl(request("/research/trending?page=2"))?.search).toBe("?page=2");
    expect(htmlUrl(request("/research/trending?page=01"))?.search).toBe("?page=01");
    expect(htmlUrl(request("/research/trending?page=1&page=2"))?.search).toBe("?page=1&page=2");
  });

  it("shares HEAD and GET renders without sending an HTML body for HEAD", async () => {
    let calls = 0;
    const read = createHtmlCache(async () => html(String(++calls)), { cacheControl });
    const head = await read(new Request(request(), { method: "HEAD" }));
    expect(await head.text()).toBe("");
    expect(await (await read(request())).text()).toBe("1");
    expect(calls).toBe(1);
  });

  it("expires on the route's shorter freshness and carries age to the edge", async () => {
    let time = 0;
    let calls = 0;
    const read = createHtmlCache(async () => html(String(++calls), {
      "cache-control": "public, s-maxage=60, stale-if-error=600",
    }), { cacheControl, now: () => time });
    await read(request());
    time = 59_000;
    const warm = await read(request());
    expect(await warm.text()).toBe("1");
    expect(warm.headers.get("Age")).toBe("59");
    time = 60_000;
    expect(await (await read(request())).text()).toBe("2");
  });

  it("preserves the last good HTML on errors, backs off, and stops at stale expiry", async () => {
    let time = 0;
    let calls = 0;
    const read = createHtmlCache(async () => ++calls === 1 ? html("good") : new Response("failed", { status: 500 }),
      { cacheControl, now: () => time });
    await read(request());
    time = 300_000;
    const stale = await read(request());
    expect(await stale.text()).toBe("good");
    expect(stale.headers.get("Age")).toBe("300");
    await read(request());
    expect(calls).toBe(2);
    time = 900_000;
    expect((await read(request())).status).toBe(500);
  });

  it("does not share RPC, personalized requests, private responses, or non-HTML responses", async () => {
    let calls = 0;
    const read = createHtmlCache(async () => html(String(++calls)), { cacheControl });
    for (const req of [request("/_serverFn/read?payload=one"), request("/_serverFn/read?payload=two"),
      request("/projects/bitcoin", { cookie: "session=example" }),
      request("/projects/bitcoin", { authorization: "Bearer example" }),
      new Request("https://alphaday.com/projects/bitcoin", { method: "POST", body: "data" })]) {
      await read(req);
      await read(req);
    }
    expect(calls).toBe(10);
    for (const response of [html("private", { "cache-control": "private, no-store" }),
      html("cookie", { "set-cookie": "session=example" }),
      html("variant", { vary: "accept-language" }), Response.json({ value: "json" }),
      new Response("missing", { status: 404 })]) {
      let renders = 0;
      const uncached = createHtmlCache(async () => { renders += 1; return response.clone(); }, { cacheControl });
      await uncached(request());
      await uncached(request());
      expect(renders).toBe(2);
    }
  });

  it("bounds entries and streams oversized pages without truncating their bodies", async () => {
    let calls = 0;
    const read = createHtmlCache(async (req) => {
      calls += 1;
      return html(new URL(req.url).pathname);
    }, { cacheControl, maxEntries: 1 });
    await read(request());
    await read(request("/projects/ethereum"));
    await read(request());
    expect(calls).toBe(3);
    let largeCalls = 0;
    const large = createHtmlCache(async () => { largeCalls += 1; return html("0123456789"); },
      { cacheControl, maxPageBytes: 5 });
    expect(await (await large(request())).text()).toBe("0123456789");
    expect(await (await large(request())).text()).toBe("0123456789");
    expect(largeCalls).toBe(2);
  });

  it("releases concurrent callers after a failed render and can recover", async () => {
    let calls = 0;
    const read = createHtmlCache(async () => {
      if (++calls === 1) throw new Error("failed render");
      return html("recovered");
    }, { cacheControl });
    const first = read(request());
    const second = read(request());
    await expect(first).rejects.toThrow("failed render");
    expect(await (await second).text()).toBe("recovered");
    expect(await (await read(request())).text()).toBe("recovered");
  });

  it("serves shared HTML and uncached RPC through the production Node adapter", async () => {
    const dir = await mkdtemp(join(tmpdir(), "home-html-cache-"));
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const address = reservation.address();
    if (!address || typeof address === "string") throw new Error("No loopback port");
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    await mkdir(join(dir, "dist/server"), { recursive: true });
    await mkdir(join(dir, "dist/client"), { recursive: true });
    await mkdir(join(dir, "scripts"));
    await copyFile("server.mjs", join(dir, "server.mjs"));
    await copyFile("scripts/htmlCache.ts", join(dir, "scripts/htmlCache.ts"));
    await writeFile(join(dir, "dist/server/server.mjs"), `
let renders = 0;
export default { async fetch(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/_serverFn/')) {
    return Response.json({ payload: url.searchParams.get('payload'), marker: request.headers.get('x-tsr-serverFn') });
  }
  renders += 1;
  const number = renders;
  await new Promise(resolve => setTimeout(resolve, 20));
  return new Response('<html>' + number + ':' + url.pathname + url.search + '</html>', {
    headers: { 'content-type': 'text/html' }
  });
} };
`);
    const child = spawn(process.execPath, ["server.mjs"], { cwd: dir,
      env: { PATH: process.env.PATH, PORT: String(address.port), HOST: "127.0.0.1" },
      stdio: ["ignore", "pipe", "pipe"] });
    const stopped = once(child, "exit");
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.on("data", (data) => { if (String(data).includes("alphaday listening")) resolve(); });
        child.once("error", reject);
        child.once("exit", (code) => reject(new Error(`Adapter exited: ${code}`)));
      });
      const get = (path: string) => fetch(`http://127.0.0.1:${address.port}${path}`,
        { headers: { connection: "close" } });
      const pages = await Promise.all([get("/projects/bitcoin?utm_source=mail"), get("/projects/bitcoin/")]);
      expect(await pages[0].text()).toBe(await pages[1].text());
      expect(pages[0].headers.get("cache-control")).toContain("s-maxage=300");
      expect((await get("/projects/bitcoin")).headers.get("age")).toBe("0");
      const one = await get("/research/trending?page=2");
      const two = await get("/research/trending?page=3");
      expect(await one.text()).toContain("?page=2");
      expect(await two.text()).toContain("?page=3");
      for (const payload of ["one", "two"]) {
        const rpc = await get(`/_serverFn/read?payload=${payload}`);
        expect(await rpc.json()).toEqual({ payload, marker: null });
        expect(rpc.headers.get("cache-control")).toBe("private, no-store");
      }
    } finally {
      child.kill("SIGTERM");
      await stopped;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
