import { ArrowUpRight } from "lucide-react";
import { Section, Div } from "../../shared";

/**
 * The complete project index (§5.8).
 *
 * `BoardLinks` renders `CONFIG.featuredBoards` — a hand-maintained list of
 * seven. The other 59 landing pages were reachable from nothing, which is how
 * they became orphans. This renders every published page from the same server
 * loader that the sitemap reads, so a new landing page is linked the moment it
 * exists and a withdrawn one disappears from both at once.
 *
 * It must stay server-rendered. A client-side fetch here would leave the links
 * invisible to GPTBot, ClaudeBot, PerplexityBot and CCBot, none of which
 * execute JavaScript — which is the failure this whole section exists to undo.
 */
function AllBoards({ boards }) {
  if (!boards?.length) return null;

  return (
    <Section className="bg-eerie border-white/5">
      <Div>
        <h2 className="text-platinum text-xl md:text-2xl font-medium mb-2 text-center">
          Every Alphaday dashboard
        </h2>
        <p className="text-aluminium text-sm md:text-base mb-8 text-center">
          {boards.length} ecosystems, each with its own workspace.
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {boards.map((board) => (
            <li key={board.slug}>
              <a
                href={`/projects/${board.slug}`}
                className="group inline-flex items-center gap-1.5 bg-black/40 border border-white/5 text-platinum hover:border-california/40 hover:text-california transition-colors duration-200 rounded-full px-3.5 py-1.5 text-sm"
              >
                <span>{board.name}</span>
                <ArrowUpRight className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              </a>
            </li>
          ))}
        </ul>
      </Div>
    </Section>
  );
}

export default AllBoards;
