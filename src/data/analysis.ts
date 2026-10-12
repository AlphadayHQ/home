/**
 * Published incident analysis, joined onto the exploit pages (content doc B2).
 *
 * WHAT THIS IS
 *
 * An agent reads each incident's sources and drafts an analysis; a person reviews
 * and publishes it to `/v1/posts/`. This module turns those posts into something
 * the exploit routes can render, and joins them to incidents.
 *
 * THE JOIN KEY IS INSIDE THE BODY
 *
 * `Post` has no metadata field, so the agent ends every body with a fenced
 * `alphaday-provenance` block carrying `incidentId` and what it read. That block
 * is the join key *and* the thing that must never reach a reader: it is currently
 * visible on the public API for all five published posts, which is the reason
 * `stripProvenance` runs before anything is rendered rather than after.
 *
 * WHY THE MARKDOWN IS RENDERED BY HAND
 *
 * This prose is assembled from pages written by strangers about active attacks —
 * the one category of input most likely to carry an injection attempt. Handing it
 * to a markdown library and `dangerouslySetInnerHTML` would make any HTML that
 * slipped through executable. Instead the four constructs the agent actually
 * writes are parsed into spans and rendered as React elements, so nothing can
 * become markup. Measured across all five published posts: `##` headings, inline
 * links, inline code, paragraphs. No bold, no lists, no block quotes, no HTML.
 * Anything else renders as the literal characters, which is the safe failure.
 */

/** The fenced block the agent appends; see `src/server/exploits.ts`. */
const PROVENANCE = /```alphaday-provenance\s*([\s\S]*?)```/;

export interface Provenance {
  incidentId: number;
  incidentDate: string | null;
  sourcesRead: string[];
}

export interface RawPost {
  slug?: unknown;
  title?: unknown;
  excerpt?: unknown;
  content?: unknown;
  status?: unknown;
  published_at?: unknown;
}

export type Span =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string }
  | { kind: "code"; text: string };

export interface Block {
  kind: "heading" | "paragraph";
  spans: Span[];
}

export interface Analysis {
  /** The post's own slug, for a canonical link back to the full piece. */
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  /** The exploit record this analysis is about. */
  incidentId: number;
  /**
   * The date the sources give for the incident, which is not the feed's `date`.
   * All five published posts corrected it — by 3 to 7 days.
   */
  incidentDate: string | null;
  /** Every URL the agent fetched, which is what makes the research checkable. */
  sourcesRead: string[];
  blocks: Block[];
}

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** The body with the provenance block removed, whether or not one was present. */
export function stripProvenance(content: string): string {
  return content.replace(PROVENANCE, "").trimEnd();
}

/**
 * The provenance block, or null when it is absent or unparseable.
 *
 * Null is a real answer rather than an error: a post written by a person through
 * the admin carries no block, and it should simply not join to an incident rather
 * than break the page.
 */
export function parseProvenance(content: string): Provenance | null {
  const match = PROVENANCE.exec(content);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Record<string, unknown>;
  const id = Number(record.incidentId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const date = asString(record.incidentDate);
  return {
    incidentId: id,
    incidentDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    sourcesRead: Array.isArray(record.sourcesRead)
      ? record.sourcesRead.filter(
          (url): url is string =>
            typeof url === "string" && !!safeHref(url) && !isOwnApi(url)
        )
      : [],
  };
}

/*
 * The agent lists every URL it fetched, and that includes our own feed: the
 * exploit record and its news searches. On Magic Eden that was 4 of 10. They
 * are working calls rather than sources a reader would follow, and printed on
 * a public page they read as internal plumbing, so they are dropped here and
 * the list shows only what the analysis was actually researched from.
 */
const OWN_API_HOST = "api.alphaday.com";

const isOwnApi = (url: string): boolean => {
  try {
    return new URL(url).hostname === OWN_API_HOST;
  } catch {
    return false;
  }
};

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

/** A published post with a usable provenance block, or null. */
export function shapeAnalysis(raw: RawPost): Analysis | null {
  if (asString(raw.status) !== "published") return null;

  const slug = asString(raw.slug);
  const title = asString(raw.title);
  const content = asString(raw.content);
  if (!slug || !title || !content) return null;

  const provenance = parseProvenance(content);
  if (!provenance) return null;

  const blocks = toBlocks(stripProvenance(content));
  if (blocks.length === 0) return null;

  return {
    slug,
    title,
    excerpt: asString(raw.excerpt),
    publishedAt: asString(raw.published_at),
    incidentId: provenance.incidentId,
    incidentDate: provenance.incidentDate,
    sourcesRead: provenance.sourcesRead,
    blocks,
  };
}

/**
 * Analyses by incident id, newest wins.
 *
 * A second post about one incident is possible — the agent compares its own work
 * by reading titles rather than matching ids — so the newest is shown and the
 * older one is simply not linked, instead of both appearing.
 */
export function byIncident(posts: RawPost[]): Map<number, Analysis> {
  const map = new Map<number, Analysis>();
  for (const raw of posts) {
    const analysis = shapeAnalysis(raw);
    if (!analysis) continue;
    const existing = map.get(analysis.incidentId);
    if (!existing || existing.publishedAt < analysis.publishedAt) {
      map.set(analysis.incidentId, analysis);
    }
  }
  return map;
}

const words = (text: string): string =>
  ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

/** The title with the fixed suffix the agent is told to use taken off. */
export const subjectOf = (title: string): string =>
  title.replace(/\s+exploit analysis\s*$/i, "").trim();

/**
 * Whether an analysis is plausibly about the incident its provenance names.
 *
 * `incidentId` is the join key, and nothing checks it: the agent writes it and
 * an admin edit can change it. A wrong one attaches an analysis to the wrong
 * incident and, because an analysis makes a page indexable on its own, puts
 * that page in the index. The title is the cross-check. The agent titles every
 * post "<subject> exploit analysis" with the subject as the sources name it,
 * and the incident's headline names the same subject: true of all five
 * published posts, and none of their subjects appears in any other reported
 * headline.
 *
 * Whole words, so "Meter" does not match "Metering". A mismatch drops the
 * analysis from the page rather than guessing. The page then stands on its
 * coverage, as it did before the analysis existed. That is the safe way to fail
 * here, and it is loud: the caller logs it.
 *
 * This stays a client-side stand-in until the backend carries `incidentId` in
 * a field of its own (backend ask #8) and can validate it on write.
 */
export function isAbout(analysis: { title: string }, headline: string): boolean {
  const subject = words(subjectOf(analysis.title));
  return subject.trim() !== "" && words(headline).includes(subject);
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
