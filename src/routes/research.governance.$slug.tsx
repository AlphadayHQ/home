import { createFileRoute, notFound } from "@tanstack/react-router";
import GovernanceProposalPage from "../pages/governanceProposal";
import { getProposalArticle } from "../server/governanceProposals";
import { GOVERNANCE_SECTION, isPostSlug } from "../data/governanceProposals";
import { proposalArticleHead } from "../seo/governanceProposalHead";
import { indexStateFor, isIndexable, robotsHeader } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";

/**
 * `/research/governance/{post slug}`: one DAO proposal, explained. The rules are
 * in `data/governanceProposals.ts`.
 *
 * Every page here is a reviewed, published post, so every one inherits the
 * report's index state; a post that is not one to show is a 404.
 */
export const Route = createFileRoute("/research/governance/$slug")({
  loader: async ({ params }) => {
    // A malformed segment is a wrong URL, not a server error: answer 404 here
    // rather than letting the server function's validator throw a 500.
    if (!isPostSlug(params.slug)) throw notFound();

    const article = await getProposalArticle({ data: params.slug });
    if (!article) throw notFound();

    const state = indexStateFor(GOVERNANCE_SECTION);
    setRobotsHeader(robotsHeader(state));
    return { article, indexable: isIndexable(state) };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "DAO governance proposal | Alphaday" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    }
    return proposalArticleHead(loaderData);
  },

  component: GovernanceProposal,
});

function GovernanceProposal() {
  const { article } = Route.useLoaderData();
  return <GovernanceProposalPage article={article} />;
}
