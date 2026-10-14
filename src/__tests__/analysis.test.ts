import { describe, expect, it } from "vitest";
import {
  byIncident,
  isAbout,
  isPublished,
  parseProvenance,
  readingMinutes,
  safeHref,
  shapeAnalysis,
  stripProvenance,
  toBlocks,
} from "../data/analysis";

/**
 * The published analysis join (content doc B2).
 *
 * Two things are being defended here. The provenance block is the only link
 * between a post and an incident, and it is also the one part of the body a
 * reader must never see — so the tests check that it joins and that it is gone.
 * And the prose is assembled by an agent from pages written by strangers about
 * active attacks, so the renderer is checked for what it refuses.
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

describe("the provenance block", () => {
  it("carries the incident id, which is the only link to a record", () => {
    expect(parseProvenance(provenance())?.incidentId).toBe(200);
  });

  /*
   * It is visible on the public API for every post published so far, so the
   * strip is the page's only defence. A body that still contains it would put
   * internal endpoints and the agent's working on a public page.
   */
  it("never survives into the rendered body", () => {
    const body = stripProvenance(post().content as string);
    expect(body).not.toContain("alphaday-provenance");
    expect(body).not.toContain("incidentId");
    expect(body).toContain("The bridge accepted mint instructions");
    expect(toBlocks(body).map((b) => b.kind)).toEqual(["heading", "paragraph"]);
  });

  it("is absent rather than fatal on a post written by a person", () => {
    expect(parseProvenance("## A post with no block\n\nWords.")).toBeNull();
    expect(shapeAnalysis(post({ content: "## Human\n\nWords." }))).toBeNull();
  });

  it("refuses a malformed block instead of guessing", () => {
    expect(parseProvenance("```alphaday-provenance\n{not json}\n```")).toBeNull();
    expect(parseProvenance(provenance({ incidentId: "not-a-number" }))).toBeNull();
    expect(parseProvenance(provenance({ incidentId: 0 }))).toBeNull();
  });

  it("keeps a bad incident date out rather than printing it", () => {
    expect(parseProvenance(provenance({ incidentDate: "soon" }))?.incidentDate)
      .toBeNull();
    expect(parseProvenance(provenance())?.incidentDate).toBe("2026-09-23");
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
});

describe("joining posts to incidents", () => {
  it("keys on the incident id and ignores unpublished work", () => {
    const map = byIncident([
      post(),
      post({ slug: "draft-one", status: 2 }),
      post({ slug: "archived-one", status: 0 }),
    ]);
    expect([...map.keys()]).toEqual([200]);
    expect(map.get(200)?.slug).toBe("meter-exploit-analysis");
  });

  /*
   * The agent compares its own work by reading titles rather than matching ids,
   * so a second post about one incident is possible. Showing the newest is a
   * better answer than showing both.
   */
  it("keeps the newest when one incident has two posts", () => {
    const map = byIncident([
      post({ slug: "older", published_at: "2026-10-01T00:00:00Z" }),
      post({ slug: "newer", published_at: "2026-10-07T00:00:00Z" }),
    ]);
    expect(map.get(200)?.slug).toBe("newer");
  });

  it("drops the sources it would not be willing to link", () => {
    const shaped = shapeAnalysis(
      post({
        content: `Words.\n\n${provenance({
          sourcesRead: ["https://protos.com/x", "javascript:alert(1)"],
        })}`,
      })
    );
    expect(shaped?.sourcesRead).toEqual(["https://protos.com/x"]);
  });

  /*
   * The agent lists every URL it fetched, our own API included: 4 of the 10
   * on Magic Eden were the exploit record and news searches. Printed on a
   * public page they are plumbing, not sources.
   */
  it("does not list our own API calls as sources", () => {
    const shaped = shapeAnalysis(
      post({
        content: `Words.\n\n${provenance({
          sourcesRead: [
            "https://protos.com/x",
            "https://api.alphaday.com/v1/security/exploits/203/",
            "https://api.alphaday.com/v1/items/news/?search=Magic%20Eden",
            "https://alphaday.com/security/exploits",
          ],
        })}`,
      })
    );
    expect(shaped?.sourcesRead).toEqual([
      "https://protos.com/x",
      "https://alphaday.com/security/exploits",
    ]);
  });

  it("reports a reading time of at least a minute", () => {
    expect(readingMinutes(toBlocks("One short line."))).toBe(1);
    expect(
      readingMinutes(toBlocks(Array(700).fill("word").join(" ")))
    ).toBe(3);
  });
});

/*
 * `incidentId` is written by the agent and editable in the admin, and a wrong
 * one would attach an analysis to the wrong incident and make that page
 * indexable. The title is the cross-check. These are the five live pairings,
 * all of which must pass.
 */
describe("the title cross-check on the join", () => {
  const live: Array<[string, string]> = [
    [
      "Artificial Superintelligence Alliance exploit analysis",
      'Single attacker steals $2.25 million from three crypto projects in the "Artificial Superintelligence Alliance"',
    ],
    ["Magic Eden exploit analysis", "Magic Eden users lose NFTs and  $1.8 million in wETH to legacy approvals exploit"],
    ["Meter exploit analysis", "Meter token prices crash after unauthorized mint"],
    ["Duelbits exploit analysis", "Duelbits crypto casino goes offline after $7 million theft"],
    ["Neutron exploit analysis", "Projects on the defunct Neutron chain lose $1.8 million to governance attack, Cosmos Hub halts chain"],
  ];

  it.each(live)("accepts %s", (title, headline) => {
    expect(isAbout({ title }, headline)).toBe(true);
  });

  it("refuses an analysis keyed to the wrong incident", () => {
    expect(
      isAbout(
        { title: "Magic Eden exploit analysis" },
        "Duelbits crypto casino goes offline after $7 million theft"
      )
    ).toBe(false);
  });

  it("matches whole words only", () => {
    expect(isAbout({ title: "Meter exploit analysis" }, "Metering protocol drained")).toBe(false);
  });

  it("ignores case and punctuation", () => {
    expect(isAbout({ title: "KiiChain exploit analysis" }, "KiiChain, TAC, and other Cosmos-based blockchains exploited")).toBe(true);
  });

  it("refuses a title with no subject", () => {
    expect(isAbout({ title: "exploit analysis" }, "Anything at all")).toBe(false);
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
    expect(shapeAnalysis(post({ status: 1 }))).not.toBeNull();
  });

  it("still accepts the string, so a backend rollback cannot hide everything", () => {
    expect(isPublished("published")).toBe(true);
  });

  it("refuses drafts, archived posts and anything unrecognised", () => {
    for (const status of [0, 2, "draft", "archived", "1", null, undefined]) {
      expect(isPublished(status)).toBe(false);
    }
    expect(shapeAnalysis(post({ status: 2 }))).toBeNull();
  });
});
