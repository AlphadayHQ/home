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
  /** "exploit-analysis" or "trending-narrative"; each kind reads its own. */
  type?: unknown;
  /** Free-form JSON the agent writes; each kind reads it defensively. */
  metadata?: unknown;
}

export type Span =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "code"; text: string };

/**
 * A list is one block per item, so every block is still a run of spans (reading
 * time and every reader of `spans` are unchanged); the renderer groups
 * consecutive items of one kind into a single list.
 */
export interface Block {
  kind: "heading" | "paragraph" | "item";
  spans: Span[];
  /** For an item: numbered ("1. ") rather than bulleted ("- "). */
  ordered?: boolean;
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

/** A non-blank string, trimmed, or null. Every reader of agent-written fields uses this one. */
export const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/**
 * The day of an ISO 8601 date an agent wrote, as `YYYY-MM-DD`, or null when it is
 * not one. Shared by every kind of post that carries dates in its metadata.
 */
export const isoDay = (value: unknown): string | null => {
  const text = str(value);
  return text && /^\d{4}-\d{2}-\d{2}/.test(text) && !Number.isNaN(Date.parse(text))
    ? text.slice(0, 10)
    : null;
};

/**
 * Post slugs are server-derived from titles by Django's `slugify`: lowercase
 * letters, digits, hyphens and underscores ("unverified_a152-exploit-analysis").
 */
export const isPostSlug = (slug: unknown): slug is string =>
  typeof slug === "string" && /^[a-z0-9_-]{3,250}$/.test(slug);

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

/**
 * Whether a list row's excerpt is a decline's. The list carries no body, so this
 * is how a decline published without `metadata.declined` is caught from the row.
 *
 * Two rules, because the two kinds of post risk opposite mistakes:
 *
 *  - An exploit analysis's excerpt says what was attacked; one that opens with
 *    the word "Declined" is a decline however it is punctuated ("Declined - not
 *    a security incident" as well as the prompt's "Declined: ..."). The word is
 *    enough, and missing a decline puts it on the hub and in the sitemap.
 *  - A narrative's excerpt says what is happening, and "Declined ETF
 *    applications pile up" is a real one. Only the prompt's exact "Declined:"
 *    opening counts, or that post would be hidden.
 *
 * Every decline on the backend opens "Declined: not ..." (checked 16 October).
 */
export const isDeclineExcerpt = (excerpt: unknown, kind: "exploit" | "narrative"): boolean =>
  (kind === "exploit" ? /^\s*declined\b/i : /^\s*declined:/i).test(str(excerpt) ?? "");

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

/**
 * An href for a link in a post body: anything `safeHref` allows, or a path on
 * this site. The agents link one post to another as `/security/exploits/{slug}`,
 * which `new URL` cannot parse without a base, so those links rendered as plain
 * text.
 *
 * `//host` and `/\host` are refused: browsers read both as another site. So is
 * any whitespace or control character, which a browser strips before reading
 * the URL, turning `/\t/host` into `//host`.
 */
export function bodyHref(url: string): string | null {
  return /^\/(?![/\\])[^\s\x00-\x1f]*$/.test(url) ? url : safeHref(url);
}

const OWN_API_HOST = "api.alphaday.com";

const isOwnApi = (url: string): boolean => {
  try {
    return new URL(url).hostname === OWN_API_HOST;
  } catch {
    return false;
  }
};

/**
 * `sourcesRead` as safe, outside links only. Shared by every kind of post: our
 * own API calls are how the agent reads, not research it read.
 */
export const cleanSources = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
        (url): url is string => typeof url === "string" && !!safeHref(url) && !isOwnApi(url)
      )
    : [];

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
      const href = bodyHref(match[2]);
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

/** A list line: "- ", "* " or "+ ", or "1. " / "1) ". The capture is the number, if any. */
const ITEM = /^(?:[-*+]|(\d{1,3})[.)])\s+(\S.*)$/;

/**
 * Lines of prose as blocks: a paragraph up to the first list line, then one item
 * per list line. A line that is not a list line continues the item above it, as a
 * wrapped item does in markdown.
 */
function proseBlocks(lines: string[]): Block[] {
  const first = lines.findIndex((line) => ITEM.test(line));
  const lead = (first === -1 ? lines : lines.slice(0, first)).join(" ").trim();
  const blocks: Block[] = lead ? [{ kind: "paragraph", spans: toSpans(lead) }] : [];
  if (first === -1) return blocks;

  const items: Array<{ ordered: boolean; text: string }> = [];
  for (const line of lines.slice(first)) {
    const match = ITEM.exec(line);
    if (match) items.push({ ordered: match[1] !== undefined, text: match[2] });
    else items[items.length - 1].text += ` ${line}`;
  }
  for (const { ordered, text } of items) {
    blocks.push({ kind: "item", ordered, spans: toSpans(text.trim()) });
  }
  return blocks;
}

/**
 * Markdown to blocks. Headings are `## `, list lines are items, and everything
 * else is a paragraph.
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

    const lines = trimmed.split("\n").map((line) => line.trim());
    const heading = /^#{2,6}\s+(.+)$/.exec(lines[0]);

    if (heading) {
      blocks.push({ kind: "heading", spans: toSpans(heading[1].trim()) });
      // Prose that began on the heading's own line still gets rendered.
      blocks.push(...proseBlocks(lines.slice(1)));
      continue;
    }

    // A soft-wrapped paragraph is one paragraph, as in markdown.
    blocks.push(...proseBlocks(lines));
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
