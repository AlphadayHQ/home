import { createFileRoute, redirect } from "@tanstack/react-router";
import CONFIG from "../config";

/**
 * The blog still lives on Substack. §5.2: this is a real server-side 301, not
 * `window.location.replace()` — a crawler that does not execute JavaScript sees
 * nothing at all from the SPA's version, so the redirect never happened for the
 * clients that matter most here.
 *
 * When the blog migrates onto `/blog` (Phase 2), this route becomes the index
 * and the 301s reverse direction — Substack to here.
 */
export const Route = createFileRoute("/blog/")({
  loader: () => {
    throw redirect({ href: CONFIG.blog, statusCode: 301 });
  },
});
