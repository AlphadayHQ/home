import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { CookieProvider } from "../utils/CookieContext";
import CookieDisclaimer from "../components/CookieDisclaimer";
import NotFound from "../components/NotFound";
import { buildSiteJsonLd } from "../utils/siteJsonLd";
import { indexStateFor, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";
import appCss from "../assets/css/alphaday.css?url";
// Imported, not a bare "/favicon.svg": the file lives in src/, so only Vite
// can tell us the emitted, content-hashed URL. Hard-coding the path 404s.
import faviconUrl from "../favicon.svg?url";

export const Route = createRootRoute({
  /*
   * §4.2 asks for `X-Robots-Tag` as well as the meta tag, on every response —
   * it is the only directive that reaches a client which never parses the body.
   * Setting it here covers every route from one place, keyed off the same
   * index-state registry the sitemap reads. Routes whose state depends on data
   * rather than path (the project pages) overwrite it from their loader, which
   * runs after this.
   */
  beforeLoad: ({ location }) => {
    setRobotsHeader(robotsHeader(indexStateFor(location.pathname)));
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      /*
       * §4.2: default to `noindex`; promotion is an action, not an absence.
       * Every indexable route overrides this through `seoHead({ index: true })`
       * — deeper matches win on the same meta name — so anything that reaches a
       * client without having declared itself indexable, the 404 included, is
       * excluded by default rather than by remembering to exclude it.
       */
      { name: "robots", content: "noindex, follow" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: faviconUrl },
    ],
    scripts: [
      {
        type: "application/ld+json",
        // buildSiteJsonLd already prepends Organization and WebSite; passing
        // them again emitted each node twice.
        children: JSON.stringify(buildSiteJsonLd()),
      },
    ],
  }),
  // §5.2: a real 404 body, served with a real 404 status by the SSR handler.
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/*
          CookieProvider is SSR-safe now: it reads localStorage only after
          mount. The server renders the unconsented state — it cannot know a
          choice — and the client corrects it after hydration.
        */}
        <CookieProvider>
          {children}
          <CookieDisclaimer />
        </CookieProvider>
        <Scripts />
      </body>
    </html>
  );
}
