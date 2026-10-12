import { useRouter } from "@tanstack/react-router";

/**
 * The body for a route whose loader threw — the router's `defaultErrorComponent`.
 *
 * Without it every route but the project pages fell through to TanStack's
 * built-in "Something went wrong! / Hide Error" box, which is what a failed feed
 * on `/security/exploits` showed. The copy is page-neutral for that reason: it
 * used to say "this dashboard" because it only ever served `/projects/$slug`.
 *
 * This replaces the body only. The status stays a 5xx with no `Cache-Control`,
 * which is what lets the edge keep the last good copy over a failed render.
 *
 * "Try again" re-runs the loaders rather than calling `reset`: `reset` only
 * clears the boundary, so on a loader error it would re-render the same failure.
 *
 * The thrown message is printed in dev only, which keeps it off the visible
 * page — not out of the response. TanStack's SSR serialiser writes every route
 * error's `message` into `$_TSR` in production too, and `apiFetch` puts the
 * upstream URL in that message. The hosts are public, so this is accepted; if
 * that changes, the fix is in the thrown messages, not here.
 */
export default function ErrorState({ error }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-text text-2xl mb-3">Something went wrong</h1>
      <p className="text-text-muted mb-6">
        We couldn't load this page right now.
      </p>
      {import.meta.env.DEV && error?.message && (
        <pre className="text-text-muted text-xs mb-6 max-w-full whitespace-pre-wrap">
          {error.message}
        </pre>
      )}
      <div className="flex flex-wrap justify-center gap-3.5">
        <button
          type="button"
          className="btn-primary rounded-[10px] px-7 py-3.5 text-base"
          onClick={() => router.invalidate()}
        >
          Try again
        </button>
        <a
          href="/"
          className="border border-surface-border text-text rounded-[10px] px-7 py-3.5 text-base font-medium hover:border-primary/50 transition-colors"
        >
          Back to Alphaday
        </a>
      </div>
    </div>
  );
}
