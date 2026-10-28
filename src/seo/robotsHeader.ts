import { createIsomorphicFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

/**
 * Emit `X-Robots-Tag` (§4.2).
 *
 * The header matters independently of the meta tag: it is the only directive
 * that reaches a client which never parses the body, and the only one that
 * works on non-HTML responses.
 *
 * `createIsomorphicFn` rather than a bare import, because a route module is
 * bundled for the browser too and `@tanstack/react-start/server` must never
 * reach it. The plugin strips the `.server()` branch — and the server-only
 * import with it — out of the client build, leaving the no-op below.
 */
export const setRobotsHeader = createIsomorphicFn()
  .server((value: string) => {
    setResponseHeader("X-Robots-Tag", value);
  })
  // On a client-side navigation there is no response to set a header on. The
  // meta tag the route already renders is what applies there.
  .client(() => {});

/**
 * Emit `Cache-Control` for a page that is right but incomplete, so the edge
 * holds it briefly. `server.mjs` sets the long policy only on a 200 that carries
 * none, so a route setting this keeps it.
 *
 * Used where a page renders without part of itself rather than failing: the
 * report without its "proposals explained" after a cold start. Without it that
 * copy is held as long as a whole one, and `stale-while-revalidate` keeps
 * serving it while the edge refreshes. No `stale-while-revalidate` here, so the
 * first request after a minute gets a fresh render.
 */
export const BRIEF_CACHE_CONTROL = "public, max-age=0, s-maxage=60, stale-if-error=604800";

export const setCacheControl = createIsomorphicFn()
  .server((value: string) => {
    setResponseHeader("Cache-Control", value);
  })
  // A client-side navigation has no response, and nothing caches it.
  .client(() => {});
