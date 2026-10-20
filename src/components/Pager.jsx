import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Newer and older links for a paged list, with where the reader is. Plain
 * links, so a crawler follows them like a reader; nothing renders on a list
 * that fits one page.
 */

const PAGER_LINK =
  "inline-flex items-center gap-2 text-[15px] font-medium text-text underline decoration-surface-border underline-offset-4 transition-colors hover:decoration-text";

const Pager = ({ page, pages, hrefFor, newer = "Newer", older = "Older" }) =>
  pages > 1 && (
    <nav
      aria-label="Pages"
      className="mt-10 flex max-w-160 items-center justify-between gap-6 border-t border-surface-border pt-6"
    >
      {page > 1 ? (
        <a href={hrefFor(page - 1)} rel="prev" className={PAGER_LINK}>
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {newer}
        </a>
      ) : (
        <span />
      )}
      <span className="font-mono text-[13px] tabular-nums text-text-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <a href={hrefFor(page + 1)} rel="next" className={PAGER_LINK}>
          {older}
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </a>
      ) : (
        <span />
      )}
    </nav>
  );

/** `path`, or `path?page=n` past the first page, so page 1 has one URL. */
export const pagedHref = (path, page) => (page > 1 ? `${path}?page=${page}` : path);

export default Pager;
