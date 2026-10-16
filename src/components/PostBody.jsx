import React from "react";

/**
 * A reviewed post's facts, body and sources, shared by the exploit and
 * narrative pages so the one safe renderer is the only one.
 *
 * The body is rendered from spans rather than from HTML. `data/analysis.ts`
 * parses the markdown; nothing here touches `dangerouslySetInnerHTML`, because
 * this prose is assembled from pages written by strangers.
 */

export const LINK =
  "underline decoration-surface-border underline-offset-4 transition-colors hover:decoration-text";

/**
 * A labelled fact, shown only by callers that have the value: a row reading
 * "Chain: —" states nothing. `mono` sets a number in the tabular face, for
 * counts and shares that sit side by side.
 */
export const Fact = ({ label, mono = false, children }) => (
  <div>
    <dt className="text-[12px] font-medium uppercase tracking-[0.1em] text-text-muted">
      {label}
    </dt>
    <dd
      className={`mt-1 text-[17px] font-medium text-text ${mono ? "font-mono tabular-nums" : ""}`}
    >
      {children}
    </dd>
  </div>
);

const Spans = ({ spans }) =>
  spans.map((span, index) => {
    if (span.kind === "link") {
      return (
        <a key={index} href={span.href} target="_blank" rel="noreferrer" className={LINK}>
          {span.text}
        </a>
      );
    }
    if (span.kind === "code") {
      return (
        <code key={index} className="break-all font-mono text-[0.9em] text-text-muted">
          {span.text}
        </code>
      );
    }
    return <React.Fragment key={index}>{span.text}</React.Fragment>;
  });

export const PostBlocks = ({ blocks }) => (
  <div className="mt-4 max-w-160">
    {blocks.map((block, index) =>
      block.kind === "heading" ? (
        <h3
          key={index}
          className="mt-8 font-display text-[21px] font-medium tracking-tight text-text"
        >
          <Spans spans={block.spans} />
        </h3>
      ) : (
        <p key={index} className="mt-4 text-[18px] leading-relaxed text-text">
          <Spans spans={block.spans} />
        </p>
      )
    )}
  </div>
);

/**
 * The sources are the claim. A reader checking a figure should not have to take
 * the prose on trust, and listing every outside page that was read is also what
 * stops the piece being a rewrite of one article.
 */
export const SourcesRead = ({ urls }) =>
  urls.length > 0 && (
    <details className="mt-8 max-w-160">
      <summary className="cursor-pointer text-[13px] font-medium uppercase tracking-[0.1em] text-text-muted transition-colors hover:text-text">
        Sources read ({urls.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-1.5">
        {urls.map((url) => (
          <li key={url} className="text-[13px]">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-text-muted underline decoration-surface-border underline-offset-4 transition-colors hover:text-text"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
