import { describe, expect, it } from "vitest";
import {
  bodyHref,
  isDecline,
  isPublished,
  readingMinutes,
  safeHref,
  stripProvenance,
  toBlocks,
} from "../data/analysis";

/**
 * Rendering the analysis agent's posts (content doc B2).
 *
 * The prose is assembled by an agent from pages written by strangers about
 * active attacks, so the renderer is checked for what it refuses. Posts from
 * before 14 October end with a provenance block a reader must never see.
 */

const provenance = (overrides: Record<string, unknown> = {}) =>
  "```alphaday-provenance\n" +
  JSON.stringify({
    incidentId: 200,
    incidentDate: "2026-09-23",
    sourcesRead: ["https://web3isgoinggreat.com/single/meter-unauthorized-mint"],
    model: "Mavis",
    draftedAt: "2026-10-07T18:10:00Z",
    ...overrides,
  }) +
  "\n```";

const post = (overrides: Record<string, unknown> = {}) => ({
  slug: "meter-exploit-analysis",
  title: "Meter exploit analysis",
  excerpt: "An attacker exploited a block-validation flaw.",
  // Numeric since backend #2022: 0 archived, 1 published, 2 draft.
  status: 1,
  published_at: "2026-10-07T19:18:10Z",
  content: `## What happened\n\nThe bridge accepted mint instructions it should have rejected.\n\n${provenance()}`,
  ...overrides,
});

describe("the retired provenance block", () => {
  /*
   * Posts from before 14 October still end with it. It holds internal endpoints
   * and the agent's working, so it must never reach a rendered page.
   */
  it("never survives into the rendered body", () => {
    const body = stripProvenance(post().content as string);
    expect(body).not.toContain("alphaday-provenance");
    expect(body).not.toContain("incidentId");
    expect(body).toContain("The bridge accepted mint instructions");
    expect(toBlocks(body).map((b) => b.kind)).toEqual(["heading", "paragraph"]);
  });

  it("leaves a body without one untouched", () => {
    expect(stripProvenance("## Human\n\nWords.")).toBe("## Human\n\nWords.");
  });
});

describe("what the renderer refuses", () => {
  /*
   * These URLs were chosen by an agent reading attacker-adjacent pages, which
   * is the one input most likely to carry an injection attempt.
   */
  it("allows only http and https", () => {
    expect(safeHref("https://protos.com/x")).toBe("https://protos.com/x");
    expect(safeHref("http://example.com/")).toBe("http://example.com/");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>")).toBeNull();
    expect(safeHref("/relative")).toBeNull();
  });

  it("links a path on this site from a body, and no other site through it", () => {
    expect(bodyHref("/security/exploits/yam-finance-exploit-analysis")).toBe(
      "/security/exploits/yam-finance-exploit-analysis"
    );
    expect(bodyHref("https://protos.com/x")).toBe("https://protos.com/x");
    expect(bodyHref("//evil.example/x")).toBeNull();
    expect(bodyHref("/\\evil.example/x")).toBeNull();
    expect(bodyHref("/\t/evil.example/x")).toBeNull();
    expect(bodyHref("javascript:alert(1)")).toBeNull();

    const [block] = toBlocks(
      "Compare [Yam](/security/exploits/yam-finance-exploit-analysis)."
    );
    expect(block.spans).toContainEqual({
      kind: "link",
      text: "Yam",
      href: "/security/exploits/yam-finance-exploit-analysis",
    });
  });

  it("keeps the words when it drops a dangerous link", () => {
    const [block] = toBlocks("See [the report](javascript:alert(1)) for more.");
    expect(block.spans.every((span) => span.kind !== "link")).toBe(true);
    expect(block.spans.map((s) => s.text).join("")).toBe(
      "See the report for more."
    );
  });

  it("treats html as literal characters, never as markup", () => {
    const [block] = toBlocks('<script>alert(1)</script> was in the source.');
    expect(block.spans).toEqual([
      { kind: "text", text: "<script>alert(1)</script> was in the source." },
    ]);
  });
});

describe("the markdown the agent actually writes", () => {
  it("parses headings, links, inline code and paragraphs", () => {
    const blocks = toBlocks(
      "## How\n\nThe attacker called `swapV3` and " +
        "[Protos](https://protos.com/x) reported it.\n\nA second paragraph."
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
    ]);
    expect(blocks[0].spans).toEqual([{ kind: "text", text: "How" }]);
    expect(blocks[1].spans).toEqual([
      { kind: "text", text: "The attacker called " },
      { kind: "code", text: "swapV3" },
      { kind: "text", text: " and " },
      { kind: "link", text: "Protos", href: "https://protos.com/x" },
      { kind: "text", text: " reported it." },
    ]);
  });

  // One of the five published posts is plain paragraphs with no heading at all.
  it("handles a body with no headings", () => {
    expect(toBlocks("Just prose.\n\nAnd more.").map((b) => b.kind)).toEqual([
      "paragraph",
      "paragraph",
    ]);
  });

  /*
   * The body arrives CRLF — a Django admin textarea posts `\r\n` — and splitting
   * paragraphs on /\n{2,}/ matched nothing. The whole post became one chunk, and
   * because it opened with `## ` it rendered as a single display-sized heading
   * containing the entire article. Nothing errored; it just looked like a blob.
   */
  it("splits paragraphs when the body arrives with CRLF line endings", () => {
    const blocks = toBlocks(
      "## What happened\r\n\r\nFirst paragraph.\r\n\r\nSecond paragraph." +
        "\r\n\r\n## The figures\r\n\r\nThird paragraph."
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "heading",
      "paragraph",
    ]);
    expect(blocks[0].spans[0].text).toBe("What happened");
    expect(blocks[1].spans[0].text).toBe("First paragraph.");
  });

  it("never lets a heading swallow the prose beneath it", () => {
    const blocks = toBlocks("## Heading\nA line that followed it directly.");
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "paragraph"]);
    expect(blocks[0].spans[0].text).toBe("Heading");
    expect(blocks[1].spans[0].text).toBe("A line that followed it directly.");
  });

  it("joins a soft-wrapped paragraph into one", () => {
    const [block] = toBlocks("A sentence that was\nwrapped by the author.");
    expect(block.spans[0].text).toBe("A sentence that was wrapped by the author.");
  });

  /*
   * Lists were not parsed until 21 October: every "- " line was joined into the
   * paragraph above it with its marker left in, so a transaction sequence read as
   * one run-on sentence studded with dashes.
   */
  describe("lists", () => {
    const shape = (markdown: string) =>
      toBlocks(markdown).map((b) => (b.kind === "item" ? `${b.ordered ? "ol" : "ul"}:${b.spans.map((s) => s.text).join("")}` : b.kind));

    it("reads bulleted and numbered items, each with its own spans", () => {
      expect(shape("Then it runs:\n\n- `deal` four times\n- [flux](https://etherscan.io/x) out\n\n1. one\n2) two")).toEqual([
        "paragraph",
        "ul:deal four times",
        "ul:flux out",
        "ol:one",
        "ol:two",
      ]);
      const [, item] = toBlocks("Lead.\n\n- `deal` it");
      expect(item.spans[0]).toEqual({ kind: "code", text: "deal" });
    });

    it("splits a list from the paragraph or heading it follows without a blank line", () => {
      expect(shape("The sequence:\n- first\n- second")).toEqual(["paragraph", "ul:first", "ul:second"]);
      expect(shape("## Steps\n- first")).toEqual(["heading", "ul:first"]);
    });

    it("continues a wrapped item, and leaves prose that only looks like a list alone", () => {
      expect(shape("- a long item\nthat wrapped\n- next")).toEqual(["ul:a long item that wrapped", "ul:next"]);
      // No space after the marker, or a year: not list lines.
      expect(shape("-5% on the day.\n\n2026 was quiet.")).toEqual(["paragraph", "paragraph"]);
    });
  });
});

/*
 * The backend switched `status` from strings to numbers on 12 October. The
 * string comparison that was here matched none of them, so every analysis
 * vanished from the pages and the sitemap without an error. This pins both
 * shapes, and pins that nothing else counts as live.
 */
describe("what counts as published", () => {
  it("accepts the numeric status the API serves", () => {
    expect(isPublished(1)).toBe(true);
  });

  it("still accepts the string, so a backend rollback cannot hide everything", () => {
    expect(isPublished("published")).toBe(true);
  });

  it("refuses drafts, archived posts and anything unrecognised", () => {
    for (const status of [0, 2, "draft", "archived", "1", null, undefined]) {
      expect(isPublished(status)).toBe(false);
    }
  });
});

describe("what is a decline", () => {
  it("recognises the agent's one-line decline", () => {
    expect(isDecline("> DECLINED: Main Street USD lost its peg; no attacker.")).toBe(true);
  });

  it("does not mistake a quote inside an analysis for one", () => {
    expect(isDecline(`## What happened\n\n> DECLINED: quoted\n\nMore.`)).toBe(false);
  });
});

describe("reading time", () => {
  it("is never zero", () => {
    expect(readingMinutes(toBlocks("Short."))).toBe(1);
  });
});
