import { createServerFn } from "@tanstack/react-start";
import { API_BASE, fetchJsonSoft, fetchWithRetry } from "./apiFetch";
import { hold, withinMs } from "./hold";
import type { RawPost } from "../data/analysis";
import type { ProposalPost, ProposalRow } from "../data/governanceProposals";
import {
  GOVERNANCE_TYPE,
  byNewest,
  isPostSlug,
  snapshotId,
  toProposalPost,
  toProposalRow,
} from "../data/governanceProposals";
import { pageCount, pageOf } from "../data/trending";

/**
 * Governance proposal pages, read from posts. The rules are in
 * `data/governanceProposals.ts`.
 *
 * Two reads, as for exploit analyses: the list of published proposal posts,
 * held in memory and shared by the report's "proposals explained" and every
 * page's "other proposals"; and one post by slug for a page.
 */

const PAGE_SIZE = 100;

/** 2,000 posts. Reaching it reports a short read rather than truncating quietly. */
const MAX_PAGES = 20;

/** How long one read serves every render before a refresh is started. */
export const FRESH_MS = 60_000;

/** How many other proposals a page links to. */
export const OTHERS = 6;

/**
 * How long a proposal page waits for the list behind "other proposals". It
 * renders without them, so a cold list leaves them out rather than holding it.
 */
export const LIST_WAIT_MS = 800;

/**
 * How long the report's first page waits for the list. Longer than a proposal
 * page, because the report's "proposals explained" is the site's way into these
 * pages, and a copy served without it is cached at the edge with no links for a
 * crawler to follow. The report's own read runs alongside and takes seconds
 * when cold, so waiting for this one rarely holds the page at all.
 */
export const REPORT_WAIT_MS = 5_000;

/** Proposal pages per page of the report's list. */
export const EXPLAINED_PAGE_SIZE = 12;

interface RawListPage {
  results?: RawPost[];
  links?: { next?: string | null };
}

export interface ProposalList {
  rows: ProposalRow[];
  /** Every page answered; when false the rows are a floor. */
  ok: boolean;
}

async function loadList(): Promise<ProposalList> {
  const raw: RawPost[] = [];
  let ok = true;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJsonSoft<RawListPage>(
      `${API_BASE}/posts/?type=${GOVERNANCE_TYPE}&limit=${PAGE_SIZE}&page=${page}`
    );
    if (body === null) {
      ok = false;
      break;
    }
    const rows = body.results ?? [];
    raw.push(...rows);
    if (rows.length < PAGE_SIZE || !body.links?.next) break;
    if (page === MAX_PAGES) ok = false;
  }
  const rows = raw
    .map(toProposalRow)
    .filter((row): row is ProposalRow => row !== null)
    .sort(byNewest);
  return { rows, ok };
}

// Only a whole read is held; see `server/exploits.ts`.
const list = hold(loadList, FRESH_MS, { keep: (value) => value.ok });

export const readProposalList = (): Promise<ProposalList> => list.read();

/** For tests: forget the held list. */
export const resetProposalList = (): void => list.reset();

export interface ExplainedPage {
  /** This page of proposal pages, newest first. */
  rows: ProposalRow[];
  page: number;
  pages: number;
  total: number;
  /** Snapshot proposal id → the slug of the page explaining it, across every page. */
  explained: Record<string, string>;
  /** The list was read in full. When false the report renders without it, briefly cached. */
  complete: boolean;
}

/** What the report shows when the list could not be read: no section, nothing matched. */
export const NO_EXPLAINED: ExplainedPage = {
  rows: [],
  page: 1,
  pages: 1,
  total: 0,
  explained: {},
  complete: false,
};

/**
 * One page of the report's "proposals explained", or null past the last page.
 *
 * The first page is the report itself, so it never fails for want of the list:
 * a cold or failing read gives `NO_EXPLAINED`. A later page is nothing but the
 * list, so it needs a whole read; anything less throws, a 5xx the edge does not
 * cache, rather than a 404 for a page that exists.
 */
export async function buildExplainedPage(page: number): Promise<ExplainedPage | null> {
  const read = page === 1 ? await withinMs(readProposalList(), REPORT_WAIT_MS) : await readProposalList();
  if (!read || !read.ok) {
    if (page === 1) return NO_EXPLAINED;
    throw new Error("governance proposals: the list read short, so this page cannot be built");
  }
  const rows = pageOf(read.rows, page, EXPLAINED_PAGE_SIZE);
  if (rows === null) return null;
  const explained: Record<string, string> = {};
  for (const row of read.rows) {
    const id = snapshotId(row.meta.snapshotUrl);
    if (id && !(id in explained)) explained[id] = row.slug;
  }
  return {
    rows,
    page,
    pages: pageCount(read.rows.length, EXPLAINED_PAGE_SIZE),
    total: read.rows.length,
    explained,
    complete: true,
  };
}

export const getExplainedPage = createServerFn({ method: "GET" })
  .validator((page: number) => {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`getExplainedPage: ${String(page)} is not a page number`);
    }
    return page;
  })
  .handler(async ({ data: page }) => buildExplainedPage(page));

export interface ProposalArticle {
  post: ProposalPost;
  /** Other proposal pages: the same DAO's first, then the newest. */
  others: ProposalRow[];
}

/**
 * One proposal page, or null when there is none to show at that slug.
 *
 * Only a 404 means "no such post". Any other failure throws, so it is served as
 * a 5xx the edge does not cache, rather than as a 404 it does.
 */
export async function buildProposalArticle(slug: string): Promise<ProposalArticle | null> {
  const [res, read] = await Promise.all([
    fetchWithRetry(`${API_BASE}/posts/${encodeURIComponent(slug)}/`),
    withinMs(readProposalList(), LIST_WAIT_MS),
  ]);
  const raw = res ? ((await res.json()) as RawPost) : null;
  const post = raw ? toProposalPost(raw) : null;
  if (!post) return null;

  const rows = (read?.rows ?? []).filter((row) => row.slug !== slug);
  const dao = post.meta.dao?.toLowerCase();
  const sameDao = dao ? rows.filter((row) => row.meta.dao?.toLowerCase() === dao) : [];
  const others = [...sameDao, ...rows.filter((row) => !sameDao.includes(row))].slice(0, OTHERS);
  return { post, others };
}

/** The validator is a boundary: the slug is interpolated into an upstream URL. */
export const getProposalArticle = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    if (!isPostSlug(slug)) {
      throw new Error(`getProposalArticle: ${String(slug)} is not a post slug`);
    }
    return slug;
  })
  .handler(async ({ data: slug }) => buildProposalArticle(slug));
