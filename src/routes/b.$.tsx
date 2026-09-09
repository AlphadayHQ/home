import { createFileRoute, redirect } from "@tanstack/react-router";
import CONFIG from "../config";

/**
 * `/b/{board}` belongs to the app, not the marketing site. A real 301 so the
 * link equity transfers and a crawler follows it without running JavaScript.
 */
export const Route = createFileRoute("/b/$")({
  loader: ({ params }) => {
    throw redirect({
      href: `${CONFIG.alphadayApp.replace(/\/$/, "")}/b/${params._splat ?? ""}`,
      statusCode: 301,
    });
  },
});
