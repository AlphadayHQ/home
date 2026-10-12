import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import ErrorState from "./components/ErrorState";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    // §5.2: unmatched routes must return a real 404, not 200 with 404 content.
    // The status is asserted in the route tests.
    defaultPreload: "intent",
    scrollRestoration: true,
    // Every route, not just the project pages: a loader that throws gets the
    // branded body instead of TanStack's built-in "Hide Error" box.
    defaultErrorComponent: ErrorState,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
