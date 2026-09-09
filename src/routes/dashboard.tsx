import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * `/dashboard` and `/dashboards` are the same page. One canonical string, one
 * URL — the singular form 301s rather than serving a duplicate.
 */
export const Route = createFileRoute("/dashboard")({
  loader: () => {
    throw redirect({ to: "/dashboards", statusCode: 301 });
  },
});
