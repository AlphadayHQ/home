import { describe, expect, it } from "vitest";
import { getRouter } from "../router";
import ErrorState from "../components/ErrorState";

/**
 * The branded error body is wired once, on the router, and no route overrides
 * it. Removing that one line would put TanStack's "Hide Error" box back on every
 * page whose loader throws — which nothing else would catch, since the status
 * code stays a 500 either way.
 */
describe("router", () => {
  const router = getRouter();

  it("renders ErrorState for any route whose loader throws", () => {
    expect(router.options.defaultErrorComponent).toBe(ErrorState);
  });

  it("is not overridden by any route", () => {
    const overriding = Object.values(router.routesById)
      .filter((route) => route.options.errorComponent)
      .map((route) => route.id);
    expect(overriding).toEqual([]);
  });
});
