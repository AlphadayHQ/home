import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({
  code,
  language = "bash",
  className = "",
  annotated = false,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const textToCopy =
        language === "bash" ? code.replace(/^curl\s+/gm, "") : code;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // no-op
    }
  };

  const getHighlightedContent = () => {
    if (language === "bash") {
      return code.split("\n").map((line, i) => {
        const parts = line.split(/(curl|https:\/\/[^\s"'<]+)/g);
        return (
          <div key={i} className="leading-relaxed">
            {line.startsWith("$") && (
              <span className="text-text-muted mr-3 select-none">$</span>
            )}
            {parts.map((part, j) => {
              if (part === "curl")
                return (
                  <span key={j} className="text-primary font-semibold">
                    {part}
                  </span>
                );
              if (part.startsWith("https://"))
                return (
                  <span key={j} className="text-success">
                    {part}
                  </span>
                );
              return <span key={j}>{part.replace(/^\$ /, "")}</span>;
            })}
          </div>
        );
      });
    }

    if (language === "json") {
      const formatted = code
        .replace(/"([^"]+)":/g, '<span class="text-primary">"$1"</span>:')
        .replace(/: ("[^"]+")/g, ': <span class="text-success">$1</span>')
        .replace(/(true|false|null)/g, '<span class="text-danger">$1</span>')
        .replace(/: ([0-9]+)/g, ': <span class="text-blue-400">$1</span>');

      return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
    }

    return <div>{code}</div>;
  };

  return (
    <div
      className={`relative group rounded-2xl overflow-hidden bg-surface-light border border-surface-border text-[13px] font-mono shadow-xl ${className}`}
    >
      <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center p-2 rounded-lg bg-surface border border-surface-border text-text-muted hover:text-text hover:bg-surface-light transition-all"
          title="Copy code"
        >
          {copied ? (
            <Check size={16} className="text-success" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      </div>

      <div
        className={`p-5 overflow-x-auto hide-scrollbar ${annotated ? "mt-2" : ""}`}
      >
        <pre className="text-text/90 whitespace-pre-wrap">
          {getHighlightedContent()}
        </pre>
      </div>

      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-light to-transparent pointer-events-none md:hidden" />
    </div>
  );
}
