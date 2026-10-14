/**
 * Rendering the posts the analysis agent writes (content doc B2).
 *
 * Exploit analyses are read as posts — see `exploitPosts.ts` for how they are
 * shaped and where they live. This module is the part shared by every kind of
 * post: what counts as published, what is a decline, and the markdown renderer.
 *
 * WHY THE MARKDOWN IS RENDERED BY HAND
 *
 * This prose is assembled from pages written by strangers about active attacks —
 * the one category of input most likely to carry an injection attempt. Handing it
 * to a markdown library and `dangerouslySetInnerHTML` would make any HTML that
 * slipped through executable. Instead the four constructs the agent actually
 * writes are parsed into spans and rendered as React elements, so nothing can
 * become markup: `##` headings, inline links, inline code, paragraphs. Anything
 * else renders as the literal characters, which is the safe failure.
 */

/**
 * The fenced block posts ended with before 14 October, when their facts moved to
 * `metadata`. Those posts keep it in their bodies, so it is still stripped.
 */
const PROVENANCE = /```alphaday-provenance\s*([\s\S]*?)```/;

export interface RawPost {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  content?: unknown;
  status?: unknown;
  published_at?: unknown;
  /** Last saved. Moves when a published post is edited; `published_at` does not. */
  modified?: unknown;
}

export type Span =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "code"; text: string };

export interface Block {
  kind: "heading" | "paragraph";
  spans: Span[];
}

/**
 * Whether a post is live.
 *
 * `status` became a number on 12 October (backend #2022): 0 archived, 1
 * published, 2 draft. This compared against the string `"published"` until
 * then, and against the numbers it matched nothing, so every analysis dropped
 * off every page and out of the sitemap with no error anywhere. The string is
 * still accepted, so a rollback of the backend cannot cause the same silence.
 */
export const isPublished = (status: unknown): boolean =>
  status === 1 || status === "published";

/**
 * Whether a post is the agent's decline: a one-line "not a security incident"
 * note, not an analysis.
 *
 * A decline carries an analysis's title and type so the agent can tell next run
 * that the incident is handled, so everything else would accept one. Published by
 * mistake (four were, on 14 October), it would be a page reading "DECLINED: ..."
 * in the sitemap. Declines are meant to stay archived and now carry
 * `metadata.declined`; this catches one written before that flag existed.
 */
export const isDecline = (content: string): boolean =>
  /^\s*>\s*DECLINED:/.test(content);

/** The body with the provenance block removed, whether or not one was present. */
export function stripProvenance(content: string): string {
  return content.replace(PROVENANCE, "").trimEnd();
}

/**
 * An href we are willing to put in the document, or null.
 *
 * Only `http:` and `https:`. These URLs were chosen by an agent reading attacker
 * -adjacent pages, so `javascript:` and `data:` are exactly what a successful
 * injection would try to leave behind.
 */
export function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

/*
 * The URL allows one level of balanced parentheses, because they occur in both
 * the benign case (a Wikipedia-style `Foo_(bar)`) and the adversarial one
 * (`javascript:alert(1)`). Stopping at the first `)` left the closing bracket
 * stranded in the prose, which a test caught on the injection example.
 */
const LINK = /\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/;
const CODE = /`([^`]+)`/;

/** One line of markdown as spans. Unrecognised syntax stays literal. */
function toSpans(line: string): Span[] {
  const spans: Span[] = [];
  let rest = line;

  while (rest) {
    const link = LINK.exec(rest);
    const code = CODE.exec(rest);
    // Whichever comes first; neither means the remainder is plain text.
    const next =
      link && code
        ? link.index <= code.index
          ? "link"
          : "code"
        : link
          ? "link"
          : code
            ? "code"
            : null;

    if (next === null) {
      spans.push({ kind: "text", text: rest });
      break;
    }

    const match = (next === "link" ? link : code) as RegExpExecArray;
    if (match.index > 0) {
      spans.push({ kind: "text", text: rest.slice(0, match.index) });
    }

    if (next === "link") {
      const href = safeHref(match[2]);
      // A rejected scheme keeps the words and drops the link, rather than
      // silently deleting a sentence.
      spans.push(
        href
          ? { kind: "link", text: match[1], href }
          : { kind: "text", text: match[1] }
      );
    } else {
      spans.push({ kind: "code", text: match[1] });
    }

    rest = rest.slice(match.index + match[0].length);
  }

  return spans.filter((span) => span.kind !== "text" || span.text !== "");
}

/**
 * Markdown to blocks. Headings are `## `; everything else is a paragraph.
 *
 * Line endings are normalised first. Content that has been through Django's
 * admin arrives CRLF — a textarea posts `\r\n` — so splitting paragraphs on
 * `/\n{2,}/` matched nothing, the whole post became one chunk, and because the
 * chunk opened with `## ` it rendered as a single display-sized heading
 * containing the entire article.
 *
 * Headings are also matched against the first line only, rather than with the
 * `s` flag, so one can never swallow the prose beneath it again.
 */
export function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];

  for (const chunk of markdown.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const [first, ...rest] = trimmed.split("\n");
    const heading = /^#{2,6}\s+(.+)$/.exec(first.trim());

    if (heading) {
      blocks.push({ kind: "heading", spans: toSpans(heading[1].trim()) });
      // A paragraph that began on the heading's own line still gets rendered.
      const remainder = rest.join(" ").trim();
      if (remainder) {
        blocks.push({ kind: "paragraph", spans: toSpans(remainder) });
      }
      continue;
    }

    // A soft-wrapped paragraph is one paragraph, as in markdown.
    blocks.push({
      kind: "paragraph",
      spans: toSpans(trimmed.replace(/\s*\n\s*/g, " ")),
    });
  }

  return blocks.filter((block) => block.spans.length > 0);
}

/** Reading time, rounded to the nearest minute and never zero. */
export const readingMinutes = (blocks: Block[]): number => {
  const words = blocks
    .flatMap((block) => block.spans.map((span) => span.text))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
};
