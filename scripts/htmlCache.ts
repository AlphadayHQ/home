const HTML_PATH = /^(\/|\/api(?:\/docs|\/data\/[a-z0-9-]+)?|\/mobile|\/privacy|\/dashboards?|\/events(?:\/[a-z0-9-]+)?|\/projects\/[a-z0-9-]+(?:\/[a-z0-9-]+)?|\/research\/(?:governance|podcasts|trending)(?:\/[a-z0-9-]+)?|\/security\/exploits(?:\/[a-z0-9-]+)?|\/authors\/[a-z0-9-]+|\/mcp(?:\/[a-z0-9-]+)?|\/cookbook(?:\/[a-z0-9-]+)?)$/;

export function htmlUrl(request: Request): URL | null {
  const accept = request.headers.get("accept") ?? "*/*";
  if (request.method !== "GET" || request.headers.has("authorization") || request.headers.has("cookie")
    || request.headers.has("x-tsr-serverFn") || request.headers.has("range")
    || request.headers.has("if-none-match") || request.headers.has("if-modified-since")
    || (!accept.includes("text/html") && !accept.includes("*/*"))) return null;
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (!HTML_PATH.test(url.pathname)) return null;
  const paginated = /^\/research\/(?:governance|podcasts|trending)$/.test(url.pathname)
    || /^\/research\/trending\/[a-z0-9-]+$/.test(url.pathname);
  const pages = paginated ? url.searchParams.getAll("page") : [];
  url.search = "";
  if (pages.length !== 1 || pages[0] !== "1") {
    for (const page of pages) url.searchParams.append("page", page);
  }
  return url;
}

interface Entry {
  body: Uint8Array;
  headers: Headers;
  at: number;
  freshUntil: number;
  staleUntil: number;
  retryAt: number;
  bytes: number;
}

interface Options {
  cacheControl: string;
  maxBytes?: number;
  maxEntries?: number;
  maxPageBytes?: number;
  now?: () => number;
}

export function createHtmlCache(
  render: (request: Request) => Promise<Response>,
  { cacheControl, maxBytes = 64 * 1024 * 1024, maxEntries = 2048,
    maxPageBytes = 1024 * 1024, now = Date.now }: Options
): (request: Request) => Promise<Response> {
  const entries = new Map<string, Entry>();
  const pending = new Map<string, Promise<Entry | null>>();
  let bytes = 0;
  const remove = (key: string) => {
    const entry = entries.get(key);
    if (entry) bytes -= entry.bytes;
    entries.delete(key);
  };
  const answer = (entry: Entry) => {
    const headers = new Headers(entry.headers);
    headers.set("Age", String(Math.floor(Math.max(0, now() - entry.at) / 1000)));
    return new Response(entry.body.slice(), { headers });
  };
  const seconds = (control: string, name: string) =>
    Number(control.match(new RegExp(`(?:^|,)\\s*${name}\\s*=\\s*"?([0-9]+)"?`, "i"))?.[1] ?? 0);

  const read = async (request: Request): Promise<Response> => {
    const url = htmlUrl(request);
    if (!url) return render(request);
    const key = url.href;
    const normalized = new Request(url, request);
    let held = entries.get(key);
    if (held && now() >= held.staleUntil) {
      remove(key);
      held = undefined;
    }
    if (held) {
      entries.delete(key);
      entries.set(key, held);
      if (now() < held.freshUntil || now() < held.retryAt) return answer(held);
    }
    const waiting = pending.get(key);
    if (waiting) {
      const shared = await waiting;
      return shared ? answer(shared) : render(normalized);
    }

    let complete!: (entry: Entry | null) => void;
    pending.set(key, new Promise((resolve) => { complete = resolve; }));
    const fallback = () => {
      if (!held || now() >= held.staleUntil) return null;
      held.retryAt = now() + 30_000;
      complete(held);
      return answer(held);
    };
    try {
      const response = await render(normalized);
      if (response.status >= 500 || response.status === 429) {
        const stale = fallback();
        if (stale) {
          await response.body?.cancel();
          return stale;
        }
      }
      const headers = new Headers(response.headers);
      const control = headers.get("cache-control") ?? cacheControl;
      const freshSeconds = Math.min(300, seconds(control, "s-maxage"));
      const vary = (headers.get("vary") ?? "").toLowerCase().split(",").map((name) => name.trim());
      const cacheable = response.status === 200 && freshSeconds > 0
        && headers.get("content-type")?.toLowerCase().startsWith("text/html")
        && !headers.has("set-cookie") && !headers.has("content-encoding")
        && !/(?:^|,)\s*(?:no-store|no-cache|private)\b/i.test(control)
        && vary.every((name) => !name || name === "accept-encoding");
      if (!cacheable || !response.body) {
        if (response.status < 500 && response.status !== 429) remove(key);
        return response;
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.byteLength;
        if (size > maxPageBytes || size > maxBytes) {
          remove(key);
          return new Response(new ReadableStream({
            start(controller) {
              for (const chunk of chunks) controller.enqueue(chunk);
            },
            async pull(controller) {
              const next = await reader.read();
              if (next.done) controller.close();
              else controller.enqueue(next.value);
            },
            cancel(reason) { return reader.cancel(reason); },
          }), { status: response.status, headers });
        }
      }
      headers.set("Cache-Control", control.replace(/s-maxage\s*=\s*"?\d+"?/i, `s-maxage=${freshSeconds}`));
      headers.delete("age");
      const at = now();
      headers.set("Date", new Date(at).toUTCString());
      const body = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const entry: Entry = {
        body, headers, at,
        freshUntil: at + freshSeconds * 1000,
        staleUntil: at + (freshSeconds + seconds(control, "stale-if-error")) * 1000,
        retryAt: 0,
        bytes: size + new TextEncoder().encode([...headers].flat().join("\n")).byteLength,
      };
      remove(key);
      while (entries.size && (entries.size >= maxEntries || bytes + entry.bytes > maxBytes)) {
        remove(entries.keys().next().value!);
      }
      if (entry.bytes <= maxBytes && maxEntries > 0) {
        entries.set(key, entry);
        bytes += entry.bytes;
      }
      complete(entry);
      return answer(entry);
    } catch (error) {
      const stale = fallback();
      if (stale) return stale;
      throw error;
    } finally {
      complete(null);
      pending.delete(key);
    }
  };
  return async (request) => {
    if (request.method !== "HEAD") return read(request);
    const get = new Request(request, { method: "GET" });
    if (!htmlUrl(get)) return render(request);
    const response = await read(get);
    await response.body?.cancel();
    return new Response(null, { status: response.status, headers: response.headers });
  };
}
