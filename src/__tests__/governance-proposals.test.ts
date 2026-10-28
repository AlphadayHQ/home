import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import {
  byNewest,
  proposalPath,
  readMeta,
  snapshotId,
  toProposalPost,
  toProposalRow,
} from "../data/governanceProposals";
import { postPagePath, postPages } from "../data/postPages";
import { belongsInSitemap, indexStateFor } from "../seo/indexState";
import { proposalArticleHead } from "../seo/governanceProposalHead";

/**
 * Governance proposal pages, read as posts. Only the transport is mocked: the
 * metadata reading, the filtering and the held list run for real, because those
 * are the parts that can be wrong without throwing, a vote shown with a made-up
 * zero, a draft on the site, or the report's route swallowing every page under it.
 */

vi.mock("../server/apiFetch", () => ({
  API_BASE: "https://api.test",
  fetchJsonSoft: vi.fn(),
  fetchWithRetry: vi.fn(),
}));

// The shape the agent writes, from the first pages (28 October 2026).
const meta = (over: Record<string, unknown> = {}) => ({
  schema: 1,
  kind: "page",
  proposalKey: "balancer:bip-936",
  dao: "Balancer",
  stage: "snapshot-closed",
  asOf: "2026-10-28",
  forumUrl: "https://forum.balancer.fi/t/bip-936-onchain-wind-down-of-protocol-specs/7144",
  snapshotUrl:
    "https://snapshot.org/#/s:balancer.eth/proposal/0x47126e7bd8e02a63ee7022e32c01ec2884a4443c770b9533621391b001663563",
  vote: {
    state: "closed",
    start: "2026-10-23",
    end: "2026-10-27",
    choices: { "Yes, let's do it": 6306478.97, "No, this is not the way": 0.005, Abstain: 0 },
    votes: 30,
  },
  sourcesRead: [
    "https://forum.balancer.fi/t/bip-936-onchain-wind-down-of-protocol-specs/7144",
    "https://api.alphaday.com/v1/items/dao/",
  ],
  ...over,
});

const raw = (over: Record<string, unknown> = {}) => ({
  slug: "balancer-bip-936-the-onchain-specs-for-winding-down-the-protocol",
  title: "Balancer BIP-936: the onchain specs for winding down the protocol",
  excerpt: "maxyz.xyz posted BIP-936 to the Balancer forum on 20 October 2026.",
  content: "The opening.\n\n## What it changes\n\n- One step\n- Another\n\n## Where it stands\n\nClosed.",
  status: 1,
  type: "governance-proposal",
  published_at: "2026-10-29T09:00:00Z",
  modified: "2026-10-29T09:00:00Z",
  metadata: meta(),
  ...over,
});

describe("reading metadata", () => {
  it("reads the agent's fields, with the stage in words", () => {
    const read = readMeta(meta());
    expect(read.proposalKey).toBe("balancer:bip-936");
    expect(read.dao).toBe("Balancer");
    expect(read.stageLabel).toBe("Snapshot vote closed");
    expect(read.asOf).toBe("2026-10-28");
    expect(read.vote?.start).toBe("2026-10-23");
    expect(read.vote?.votes).toBe(30);
  });

  it("keeps the vote's choices in order, including a real zero", () => {
    expect(readMeta(meta()).vote?.choices.map((choice) => choice.label)).toEqual([
      "Yes, let's do it",
      "No, this is not the way",
      "Abstain",
    ]);
  });

  it("drops a choice whose power is not a number rather than showing it as zero", () => {
    const read = readMeta(meta({ vote: { start: "2026-10-23", choices: { For: "lots", Against: -1, Abstain: 4 } } }));
    expect(read.vote?.choices).toEqual([{ label: "Abstain", power: 4 }]);
  });

  it("shows no vote when there is nothing to show, and no stage it does not know", () => {
    const read = readMeta(meta({ vote: { state: "pending", choices: {} }, stage: "vibes" }));
    expect(read.vote).toBeNull();
    expect(read.stage).toBe("vibes");
    expect(read.stageLabel).toBeNull();
  });

  it("refuses unsafe links and our own API as a source", () => {
    const read = readMeta(meta({ forumUrl: "javascript:alert(1)" }));
    expect(read.forumUrl).toBeNull();
    expect(read.sourcesRead).toEqual([
      "https://forum.balancer.fi/t/bip-936-onchain-wind-down-of-protocol-specs/7144",
    ]);
  });

  it("survives metadata that is missing or the wrong shape", () => {
    for (const bad of [null, undefined, "x", 3, []]) {
      const read = readMeta(bad);
      expect(read.dao).toBeNull();
      expect(read.vote).toBeNull();
      expect(read.sourcesRead).toEqual([]);
    }
  });
});

describe("which posts are shown", () => {
  it("shows a published proposal page", () => {
    expect(toProposalRow(raw())?.slug).toBe(raw().slug);
  });

  it("never shows a draft, an archived post, another type, or a bad slug", () => {
    expect(toProposalRow(raw({ status: 2 }))).toBeNull();
    expect(toProposalRow(raw({ status: 0 }))).toBeNull();
    expect(toProposalRow(raw({ type: "exploit-analysis" }))).toBeNull();
    expect(toProposalRow(raw({ slug: "Not A Slug" }))).toBeNull();
  });

  it("gives an update no page of its own, and treats a missing, blank or recased kind as a page", () => {
    expect(toProposalRow(raw({ metadata: meta({ kind: "update" }) }))).toBeNull();
    const { kind: _kind, ...noKind } = meta();
    expect(toProposalRow(raw({ metadata: noKind }))).not.toBeNull();
    for (const kind of [null, "", " ", "Page", " PAGE "]) {
      expect(toProposalRow(raw({ metadata: meta({ kind }) }))).not.toBeNull();
    }
  });

  it("never shows a decline, by flag, by excerpt or by body", () => {
    expect(toProposalRow(raw({ metadata: meta({ declined: true }) }))).toBeNull();
    expect(toProposalRow(raw({ excerpt: "Declined: not a proposal." }))).toBeNull();
    expect(toProposalPost(raw({ content: "> DECLINED: a call summary, not a proposal" }))).toBeNull();
    // A proposal can honestly open with the word.
    expect(toProposalRow(raw({ excerpt: "Declined grant requests are piling up at ZCG." }))).not.toBeNull();
  });

  it("strips a provenance block rather than rendering it", () => {
    const post = toProposalPost(
      raw({ content: "The opening.\n\n```alphaday-provenance\n{\"x\": 1}\n```" })
    );
    expect(JSON.stringify(post?.blocks)).not.toContain("alphaday-provenance");
  });

  it("has no page for an empty body", () => {
    expect(toProposalPost(raw({ content: "   " }))).toBeNull();
    expect(toProposalPost(raw())?.blocks.length).toBeGreaterThan(0);
  });

  it("orders newest first, stably", () => {
    const rows = [
      toProposalRow(raw({ slug: "older-one", published_at: "2026-10-01T00:00:00Z" }))!,
      toProposalRow(raw({ slug: "b-newer", published_at: "2026-10-29T00:00:00Z" }))!,
      toProposalRow(raw({ slug: "a-newer", published_at: "2026-10-29T00:00:00Z" }))!,
    ];
    expect(rows.sort(byNewest).map((row) => row.slug)).toEqual(["a-newer", "b-newer", "older-one"]);
  });
});

describe("matching a Snapshot vote to its page", () => {
  it("reads the proposal id from any Snapshot link, in one case", () => {
    const id = "0x47126e7bd8e02a63ee7022e32c01ec2884a4443c770b9533621391b001663563";
    expect(snapshotId(`https://snapshot.org/#/s:balancer.eth/proposal/${id}`)).toBe(id);
    expect(snapshotId(`https://snapshot.box/#/balancer.eth/proposal/${id.toUpperCase().replace("0X", "0x")}`)).toBe(id);
    expect(snapshotId("https://forum.balancer.fi/t/bip-936/7144")).toBeNull();
    expect(snapshotId(null)).toBeNull();
  });
});

describe("where a proposal page is read", () => {
  it("is under the governance report, which promotes it", () => {
    expect(postPagePath(raw())).toBe(proposalPath(raw().slug));
    expect(proposalPath("x-y")).toBe("/research/governance/x-y");
    expect(belongsInSitemap(indexStateFor("/research/governance"))).toBe(true);
  });

  it("is in the sitemap once published, and not as a draft", () => {
    const { pages, unplaced } = postPages([raw(), raw({ slug: "a-draft-one", status: 2 })]);
    expect(pages).toEqual([
      { path: proposalPath(raw().slug), lastmod: "2026-10-29T09:00:00.000Z" },
    ]);
    expect(unplaced).toBe(0);
  });

  it("counts a published update as unplaced rather than inventing a page for it", () => {
    const { pages, unplaced } = postPages([raw({ metadata: meta({ kind: "update" }) })]);
    expect(pages).toEqual([]);
    expect(unplaced).toBe(1);
  });
});

describe("routes", () => {
  const router = createRouter({ routeTree });
  const idFor = (pathname: string) => {
    const matches = router.matchRoutes({ pathname, search: {} } as never);
    return matches[matches.length - 1]?.routeId;
  };

  it("keeps the report at its URL and gives each proposal its own route", () => {
    // The report is an index route. Named `research.governance.tsx` it would be
    // the parent layout of every proposal page and render in place of each.
    expect(idFor("/research/governance")).toBe("/research/governance/");
    expect(idFor("/research/governance/balancer-bip-936")).toBe("/research/governance/$slug");
  });
});

describe("the head", () => {
  it("is the post's title and excerpt, with an Article that cites its sources", () => {
    const post = toProposalPost(raw())!;
    const head = proposalArticleHead({ article: { post, others: [] }, indexable: true });
    const text = JSON.stringify(head);
    expect(text).toContain("Balancer BIP-936: the onchain specs for winding down the protocol | Alphaday");
    expect(text).toContain("https://alphaday.com/research/governance/balancer-bip-936");
    const ld = JSON.parse(head.scripts?.[0]?.children ?? "{}");
    expect(ld["@type"]).toBe("Article");
    expect(ld.isBasedOn).toContain("forum.balancer.fi");
    expect(ld.about).toEqual({ "@type": "Organization", name: "Balancer" });
  });

  it("is noindex with no canonical when the section is not promoted", () => {
    const post = toProposalPost(raw())!;
    const text = JSON.stringify(proposalArticleHead({ article: { post, others: [] }, indexable: false }));
    expect(text).toContain("noindex");
    expect(text).not.toContain("canonical");
  });
});

describe("reading the posts", () => {
  let list: Array<Record<string, unknown>>;
  let failing: boolean;
  let seen: string[];

  beforeEach(async () => {
    list = [
      raw(),
      raw({
        slug: "arbitrum-an-l1-recovery-path",
        title: "Arbitrum: an L1 recovery path",
        metadata: meta({ dao: "Arbitrum", proposalKey: "arbitrum:l1-voting-recovery-system" }),
      }),
      raw({
        slug: "balancer-bip-934-burn",
        title: "Balancer BIP-934: burn",
        published_at: "2026-10-01T00:00:00Z",
        metadata: meta({ proposalKey: "balancer:bip-934" }),
      }),
      raw({ slug: "a-draft-one", status: 2 }),
    ];
    failing = false;
    seen = [];
    const { fetchJsonSoft, fetchWithRetry } = await import("../server/apiFetch");
    vi.mocked(fetchJsonSoft).mockImplementation(async (url: string) => {
      seen.push(url);
      return (failing ? null : { results: list, links: { next: null } }) as never;
    });
    vi.mocked(fetchWithRetry).mockImplementation(async (url: string) => {
      seen.push(url);
      if (failing) throw new Error("upstream down");
      const slug = url.split("/posts/")[1].replace(/\/$/, "");
      const found = list.find((row) => row.slug === slug);
      return (found ? { json: async () => found } : null) as never;
    });
    const { resetProposalList } = await import("../server/governanceProposals");
    resetProposalList();
  });

  afterEach(() => vi.useRealTimers());

  it("asks only for governance proposals", async () => {
    const { readProposalList } = await import("../server/governanceProposals");
    await readProposalList();
    expect(seen).toEqual(["https://api.test/posts/?type=governance-proposal&limit=100&page=1"]);
  });

  it("links a page to the same DAO's proposals first, never to itself or a draft", async () => {
    const { buildProposalArticle } = await import("../server/governanceProposals");
    const article = await buildProposalArticle(raw().slug);
    expect(article?.others.map((row) => row.slug)).toEqual([
      "balancer-bip-934-burn",
      "arbitrum-an-l1-recovery-path",
    ]);
  });

  it("is a 404 for a draft or a missing post, and a 5xx when the API fails", async () => {
    const { buildProposalArticle } = await import("../server/governanceProposals");
    expect(await buildProposalArticle("a-draft-one")).toBeNull();
    expect(await buildProposalArticle("no-such-post")).toBeNull();
    failing = true;
    await expect(buildProposalArticle(raw().slug)).rejects.toThrow();
  });

  it("gives the report's first page no list, rather than an error, when the read fails", async () => {
    failing = true;
    const { buildExplainedPage, NO_EXPLAINED } = await import("../server/governanceProposals");
    expect(await buildExplainedPage(1)).toEqual(NO_EXPLAINED);
  });

  it("fails a later page when the read fails, rather than calling it empty", async () => {
    failing = true;
    const { buildExplainedPage } = await import("../server/governanceProposals");
    await expect(buildExplainedPage(2)).rejects.toThrow(/read short/);
  });

  it("pages the list newest first, maps every Snapshot vote it explains, and ends", async () => {
    const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;
    list = Array.from({ length: 14 }, (_, n) =>
      raw({
        slug: `proposal-${String(n).padStart(2, "0")}`,
        published_at: `2026-10-${String(n + 1).padStart(2, "0")}T00:00:00Z`,
        metadata: meta({ snapshotUrl: `https://snapshot.org/#/s:x.eth/proposal/${id(n)}` }),
      })
    );
    const { buildExplainedPage, EXPLAINED_PAGE_SIZE } = await import("../server/governanceProposals");
    const first = await buildExplainedPage(1);
    expect(first?.rows).toHaveLength(EXPLAINED_PAGE_SIZE);
    expect(first?.rows[0].slug).toBe("proposal-13");
    expect(first).toMatchObject({ page: 1, pages: 2, total: 14, complete: true });
    // The map covers every page, so a vote on the report matches a page listed later.
    expect(first?.explained[id(0)]).toBe("proposal-00");
    expect((await buildExplainedPage(2))?.rows.map((row) => row.slug)).toEqual([
      "proposal-01",
      "proposal-00",
    ]);
    expect(await buildExplainedPage(3)).toBeNull();
  });
});
