/**
 * Builds schema.org FAQPage structured data from an FAQ data array.
 *
 * Answers are authored as JSX (so they can carry links and emphasis), but
 * JSON-LD needs plain text — walk the element tree and collect the strings.
 */
const toPlainText = (node) => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toPlainText).join(" ");
  return toPlainText(node?.props?.children);
};

export const buildFaqJsonLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: (faqs || []).map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: toPlainText(answer).replace(/\s+/g, " ").trim(),
    },
  })),
});
