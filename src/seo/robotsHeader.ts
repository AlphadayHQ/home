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
