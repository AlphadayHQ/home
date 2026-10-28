import type { Block, RawPost } from "./analysis.ts";
import {
  cleanSources,
  isDecline,
  isDeclineExcerpt,
  isPostSlug,
  isPublished,
  isoDay,
  safeHref,
  str,
  stripProvenance,
  toBlocks,
} from "./analysis.ts";

/**
 * Governance proposal pages, read as posts: one DAO proposal per page, written
 * by an agent from the forum thread and the vote, and reviewed before it is
 * published.
 *
 * WHY THEY LIVE UNDER THE GOVERNANCE REPORT
 *
 * `/research/governance` measures proposals in aggregate; these explain them one
 * at a time. A reader of either wants the other, and the report's index state
 * is theirs: each page is a reviewed, published post, so it inherits the
 * report's promotion the way an exploit analysis inherits its hub's.
 *
 * WHY THE PAGE SHOWS ITS VOTE AS OF A DATE
 *
 * A proposal moves after its page is written: a Snapshot vote closes, an onchain
 * vote opens. The post is not edited when that happens, so the tally and the
 * stage are what the agent read on `metadata.asOf`, and the page says so beside
 * them. The title never states an outcome for the same reason, and the agent's
 * gate refuses one; the slug is made from the title and cannot change.
 *
 * `metadata` is free-form JSON written by an agent and editable in the admin, so
 * everything here reads it defensively: a missing or mistyped value is absent,
 * never a crash and never a wrong figure.
 */

export const GOVERNANCE_TYPE = "governance-proposal";

/** The report, whose index state these pages inherit. */
export const GOVERNANCE_SECTION = "/research/governance";

export const proposalPath = (slug: string): string => `${GOVERNANCE_SECTION}/${slug}`;

export { isPostSlug };

/** The stages the agent records, in the DAOs' own terms. Anything else shows no stage. */
const STAGES: ReadonlyMap<string, string> = new Map([
  ["forum-discussion", "Forum discussion"],
  ["arfc", "ARFC, in forum discussion"],
  ["temp-check", "Temperature check"],
  ["snapshot-vote", "Snapshot vote"],
  ["snapshot-closed", "Snapshot vote closed"],
  ["onchain-vote", "Onchain vote"],
  ["executed", "Executed"],
  ["withdrawn", "Withdrawn"],
]);

export interface VoteChoice {
  label: string;
  /** Voting power, in the DAO's token. Not a count of people. */
  power: number;
}

export interface ProposalVote {
  state: string | null;
  start: string | null;
  end: string | null;
  choices: VoteChoice[];
  /** How many votes were cast, where the vote reports it. */
  votes: number | null;
}

/** `metadata` for a governance proposal page, schema 1, as the agent's spec defines it. */
export interface ProposalMeta {
  /** `<dao>:<the proposal's own id>`: how a later run knows the proposal has a page. */
  proposalKey: string | null;
  dao: string | null;
  stage: string | null;
  /** The stage in words, or null for a value this does not know. */
  stageLabel: string | null;
  /** The day the stage and the vote were read. */
  asOf: string | null;
  forumUrl: string | null;
  snapshotUrl: string | null;
  vote: ProposalVote | null;
  /** The amount the proposal moves, as the agent wrote it, unit included. */
  treasuryAsk: string | null;
  sourcesRead: string[];
}

const safeUrl = (value: unknown): string | null => {
  const text = str(value);
  return text && safeHref(text) ? text : null;
};

const count = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;

/**
 * The vote, or null when there is nothing to show. Choices keep the order the
 * agent wrote them in, which is the vote's own; a choice whose power is not a
 * finite, non-negative number is dropped rather than shown as zero.
 */
function readVote(raw: unknown): ProposalVote | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const vote = raw as Record<string, unknown>;
  const choices: VoteChoice[] = [];
  const rawChoices = vote.choices;
  if (rawChoices && typeof rawChoices === "object" && !Array.isArray(rawChoices)) {
    for (const [label, power] of Object.entries(rawChoices as Record<string, unknown>)) {
      if (str(label) && typeof power === "number" && Number.isFinite(power) && power >= 0) {
        choices.push({ label: label.trim(), power });
      }
    }
  }
  const read: ProposalVote = {
    state: str(vote.state),
    start: isoDay(vote.start),
    end: isoDay(vote.end),
    choices,
    votes: count(vote.votes),
  };
  return read.start || read.end || choices.length > 0 ? read : null;
}

export function readMeta(raw: unknown): ProposalMeta {
  const meta = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const stage = str(meta.stage);
  return {
    proposalKey: str(meta.proposalKey),
    dao: str(meta.dao),
    stage,
    stageLabel: stage ? (STAGES.get(stage) ?? null) : null,
    asOf: isoDay(meta.asOf),
    forumUrl: safeUrl(meta.forumUrl),
    snapshotUrl: safeUrl(meta.snapshotUrl),
    vote: readVote(meta.vote),
    treasuryAsk: str(meta.treasuryAsk),
    sourcesRead: cleanSources(meta.sourcesRead),
  };
}

/** One proposal page as the report's list, the sitemap and "other proposals" see it. */
export interface ProposalRow {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  /** Last saved; moves when a published post is edited. */
  modified: string;
  meta: ProposalMeta;
}

/**
 * A row the site may show, or null: published, typed as a governance proposal,
 * a page, and not a decline.
 *
 * `kind` is read so that updates, when the agent starts writing them, are not
 * each given a URL of their own by a site that does not yet know where they
 * belong. A post with no `kind`, a blank one, or "Page" from an admin edit is a
 * page, as every one so far is: dropping it would take a published page off the
 * site with nothing but an "unplaced" count to show for it.
 *
 * Declines are caught the way the other post types catch them: the flag, and,
 * since the list carries no body, the excerpt. The excerpt rule is the strict
 * one ("Declined:" exactly), because a proposal's excerpt can honestly open with
 * the word, as in "Declined grant requests ...".
 */
export function toProposalRow(raw: RawPost): ProposalRow | null {
  if (!isPublished(raw.status) || raw.type !== GOVERNANCE_TYPE) return null;
  const slug = str(raw.slug);
  const title = str(raw.title);
  if (!slug || !isPostSlug(slug) || !title) return null;
  const metadata =
    raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, unknown>) : {};
  const kind = str(metadata.kind)?.toLowerCase() ?? null;
  if (kind !== null && kind !== "page") return null;
  if (metadata.declined === true || isDeclineExcerpt(raw.excerpt, "narrative")) return null;
  const publishedAt = str(raw.published_at) ?? "";
  return {
    slug,
    title,
    excerpt: str(raw.excerpt) ?? "",
    publishedAt,
    modified: str(raw.modified) ?? publishedAt,
    meta: readMeta(raw.metadata),
  };
}

/** Newest first, by when the page was published; ties broken by slug so the order is stable. */
export const byNewest = (a: ProposalRow, b: ProposalRow): number =>
  b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug);

export interface ProposalPost extends ProposalRow {
  blocks: Block[];
}

/**
 * The full page, or null when there is none to show. The body is checked as
 * well as the row: a decline is recognised by its opening line, a provenance
 * block is stripped before anything renders, and an empty body is not a page.
 */
export function toProposalPost(raw: RawPost): ProposalPost | null {
  const row = toProposalRow(raw);
  const content = typeof raw.content === "string" ? raw.content : "";
  if (!row || isDecline(content)) return null;
  const blocks = toBlocks(stripProvenance(content));
  return blocks.length > 0 ? { ...row, blocks } : null;
}

/**
 * The Snapshot proposal id in a URL, lowercased, or null. Snapshot links carry
 * it as `/proposal/0x…` whatever the host or the space prefix, and it is the one
 * key the report's vote list and these pages share.
 */
export function snapshotId(url: unknown): string | null {
  const match = /\/proposal\/(0x[0-9a-f]{64})\b/i.exec(str(url) ?? "");
  return match ? match[1].toLowerCase() : null;
}
