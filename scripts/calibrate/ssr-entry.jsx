/**
 * SSR entry for the Phase 2 render calibration (§1.4).
 *
 * Renders the real project-landing tree — the same components the TanStack
 * Start migration will carry over — to a string, with no fetch and no browser.
 * Built by Vite in SSR mode so the measurement runs against production-shaped
 * output (minified, no dev transform) rather than the dev server.
 */
import { renderToString } from "react-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { ProjectLandingPage } from "../../src/containers/ProjectLandingContainer";

/**
 * No CookieProvider: it reads `localStorage` on every render and would throw
 * under SSR. Omitting it falls back to the context default (`allowTracking:
 * false`), which is also the correct server-rendered state — the server cannot
 * know a consent choice, so it must render the unconsented page and let the
 * client correct it after hydration.
 */
export function renderPage(data) {
  const helmetContext = {};
  const body = renderToString(
    <HelmetProvider context={helmetContext}>
      <ProjectLandingPage data={data} />
    </HelmetProvider>
  );
  // Reading the helmet output is part of the real per-render cost — a server
  // has to interpolate these into the document shell.
  const { helmet } = helmetContext;
  const head = helmet
    ? [
        helmet.title.toString(),
        helmet.meta.toString(),
        helmet.link.toString(),
        helmet.script.toString(),
      ].join("")
    : "";
  return { head, body };
}
