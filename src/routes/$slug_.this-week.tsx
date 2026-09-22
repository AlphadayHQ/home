import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { digestEntityFor } from "../data/digestEntities";

/**
 * `/{slug}/this-week` → `/projects/{slug}/this-week`, 301.
 *
 * WHY THIS ROUTE EXISTS
 *
 * The two planning documents disagree about this URL, and the disagreement is
 * old rather than careless. The content document's C3 specifies
 * `/{entity}/this-week` throughout, and its §13 says "ship `/bitcoin/this-week`"
 * — both written while project pages still lived at `alphaday.com/{slug}`. The
 * technical document then moved every content type behind a path prefix (§3.1)
 * and mapped this one to `/projects/{slug}/this-week` (§3.2). That document is
 * the authority on how a URL is served, so the prefixed form is canonical and
 * the digest lives there.
 *
 * But `/bitcoin` 301s to `/projects/bitcoin` ([$slug.tsx](./$slug.tsx)), so
 * `/bitcoin/this-week` dead-ending at a 404 while its own parent redirects is
 * just a hole. The short form is what the strategy document tells a reader to
 * visit, it is the form anyone who knows the old URL scheme will guess, and any
 * link built from either loses its equity at a 404. One redirect closes all
 * three.
 *
 * WHY THE FILENAME CARRIES A TRAILING UNDERSCORE
 *
 * `$slug_.this-week.tsx`, not `$slug.this-week.tsx`. Without the underscore the
 * flat-route convention nests this under the existing `$slug.tsx`, which turns
 * that file from a leaf into a **parent layout** whose loader runs on the way
 * here. It then redirects `/bitcoin/this-week` to `/projects/bitcoin` — dropping
 * the `this-week` segment — and its async redirect beats this route's
 * synchronous `notFound()`, so an unknown slug 301'd to a landing page instead of
 * 404ing. The underscore opts out of the nesting, which is what makes this a
 * sibling rather than a child.
 *
 * WHY IT 404s INSTEAD OF REDIRECTING FOR UNKNOWN SLUGS
 *
 * A 301 to a URL that answers 404 is worse than a 404: it spends crawl budget to
 * arrive nowhere and reads as a broken redirect rather than an absent page. So
 * this only redirects where a digest actually exists — the same condition
 * `$slug.tsx` applies before redirecting a landing page, for the same reason.
 * Every other slug gets the real 404 that §4.1 asks for.
 */
export const Route = createFileRoute("/$slug_/this-week")({
  loader: ({ params }) => {
    if (!digestEntityFor(params.slug)) throw notFound();

    throw redirect({
      to: "/projects/$slug/this-week",
      params: { slug: params.slug },
      statusCode: 301,
    });
  },
});
