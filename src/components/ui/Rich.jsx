import React from "react";

/**
 * Renders `backticked` spans as real code and `**bold**` as bold.
 *
 * Extracted from `mcp-client.jsx` when the cookbook needed the same thing. The
 * version before that stripped both markers with a regex, which is how "the
 * top-level key is `servers`, not `mcpServers`" — a sentence whose entire
 * content is the difference between two identifiers — reached the reader as
 * undifferentiated prose. The markers are in the source because the distinction
 * matters; rendering them is cheaper than removing them.
 */
export const Rich = ({ children }) => {
  const parts = String(children).split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={i}
              className="font-mono text-[0.92em] text-primary/90 bg-surface-light border border-surface-border rounded px-1 py-px"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="text-text font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
};

export default Rich;
