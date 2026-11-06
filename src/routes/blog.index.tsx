import { createFileRoute, redirect } from "@tanstack/react-router";
import CONFIG from "../config";

/**
 * The blog still lives on Substack. §5.2: this is a real server-side 301, not
 * `window.location.replace()` — a crawler that does not execute JavaScript sees
 * nothing at all from the SPA's version, so the redirect never happened for the
 * clients that matter most here.
 *
 * The migration onto `/blog` was dropped (content doc §7, 6 Nov 2026): the
 * posts stay on Substack, so this redirect is permanent.
 */
export const Route = createFileRoute("/blog/")({
  loader: () => {
    throw redirect({ href: CONFIG.blog, statusCode: 301 });
  },
});
