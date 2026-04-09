import { useEffect, useState } from "react";
import {
  ArrowRight,
  Terminal,
  Copy,
  Check,
  Blocks,
  Search,
  Bot,
} from "lucide-react";
import alphaday from "../images/logo-notext.png";
import { CodeBlock } from "../components/ui/CodeBlock";
import Seo from "../components/seo";

const heroCurl = "curl https://api.alphaday.com/search?project=arbitrum";
const trendingCurl = "curl https://api.alphaday.com/news/trending?limit=3";
const trendingJson = `{
  "trending": [
    {
      "title": "Arbitrum DAO Passes $120M Incentive Proposal",
      "source": "The Block",
      "published_at": "2026-04-07T06:42:00Z",
      "url": "https://..."
    },
    {
      "title": "Ethereum Pectra Upgrade Goes Live on Testnet",
      "source": "CoinDesk",
      "published_at": "2026-04-07T05:18:00Z",
      "url": "https://..."
    },
    {
      "title": "Uniswap v4 Hooks Launch on Mainnet",
      "source": "Decrypt",
      "published_at": "2026-04-07T04:55:00Z",
      "url": "https://..."
    }
  ]
}`;
const mcpConfig = `{
  "mcpServers": {
    "alphaday": {
      "url": "https://api.alphaday.com/mcp"
    }
  }
}`;
const restCurl = "curl https://api.alphaday.com/news?tags=arbitrum";
const finalCurl = "curl https://api.alphaday.com/news/summary";
const docsUrl = "https://api.alphaday.com/docs";
const githubUrl = "https://github.com/AlphadayHQ/";

const tools = [
  { name: "get_news", desc: "Real-time news from 49 crypto outlets" },
  { name: "get_trending_news", desc: "What the crypto media is buzzing about" },
  { name: "get_news_summary", desc: "AI-generated daily crypto briefing" },
  { name: "get_blogs", desc: "133 project blogs, one feed" },
  { name: "get_podcasts", desc: "118 podcast feeds, latest episodes" },
  { name: "get_videos", desc: "121 YouTube channels, timestamped" },
  { name: "get_events", desc: "Conferences, meetups, side events" },
  { name: "get_dao_proposals", desc: "Live Snapshot votes across 51 DAOs" },
  { name: "get_forum_posts", desc: "59 governance forums, one endpoint" },
  {
    name: "get_trending_keywords",
    desc: "What crypto is talking about, right now",
  },
  { name: "search_projects", desc: "Discover tags for any project" },
];

const ApiPage = () => {
  const [copied, setCopied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleHeroCopy = async () => {
    try {
      await navigator.clipboard.writeText(heroCurl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // no-op
    }
  };

  return (
    <div className="api-root min-h-screen bg-background text-text flex flex-col w-full relative selection:bg-primary/30 font-sans">
      <Seo
        title="Alphaday API"
        description="All of crypto. One API. 1,000+ data sources, MCP and REST."
      />

      {/* 1. Minimal Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          isScrolled
            ? "bg-surface/80 backdrop-blur-xl border-surface-border shadow-lg shadow-black/20"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={alphaday} className="h-6 object-fit" alt="alphaday" />
            <span className="font-montserrat font-bold text-lg tracking-tight">
              Alphaday API
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <a
              href={docsUrl}
              className="text-text-muted hover:text-text transition-colors"
            >
              Docs
            </a>
            <a
              href={githubUrl}
              className="text-text-muted hover:text-text transition-colors"
            >
              GitHub
            </a>
            <a
              href="/"
              className="text-primary hover:text-primary-hover transition-colors flex items-center gap-1 group"
            >
              Alphaday{" "}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full flex flex-col">
        {/* 2. Hero */}
        <section className="relative pt-40 pb-20 px-6 max-w-5xl mx-auto w-full flex flex-col items-center text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            <span className="text-text">All of Crypto.</span>
            <br />
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              One API.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-text-muted max-w-3xl mb-12 leading-relaxed">
            1,000+ crypto data sources. One integration. Query news, podcasts,
            videos, DAO proposals, events, and more &mdash; filtered by project
            or keyword. <br className="hidden md:block" />
            Available as an MCP server or REST API.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 mb-16">
            <button
              onClick={handleHeroCopy}
              className="group relative flex items-center gap-2 sm:gap-3 bg-surface hover:bg-surface-light border border-surface-border text-text px-4 sm:px-8 py-3 sm:py-4 rounded-2xl font-mono text-sm shadow-[0_0_40px_-10px_rgba(250,162,2,0.15)] transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_40px_-5px_rgba(250,162,2,0.3)] hover:-translate-y-1"
            >
              <Terminal className="text-primary w-4 h-4 min-w-4 min-h-4" />
              <span className="tracking-tight text-left max-sm:hidden">
                {heroCurl}
              </span>
              <div className="tracking-tight text-left whitespace-nowrap w-[250px] sm:hidden">
                <span className="flex tracking-tight text-left whitespace-nowrap">
                  {heroCurl.slice(0, Math.floor(heroCurl.length / 2) + 4)}
                </span>
                <span className="tracking-tight text-left whitespace-nowrap">
                  {heroCurl.slice(Math.floor(heroCurl.length / 2) + 4)}
                </span>
              </div>
              <div className="pl-4 border-l border-surface-border ml-2 flex items-center text-primary group-hover:text-primary-hover">
                {copied ? (
                  <Check size={16} />
                ) : (
                  <Copy
                    size={16}
                    className="group-hover:scale-110 transition-transform"
                  />
                )}
              </div>
            </button>
            <a
              href={docsUrl}
              className="font-semibold text-text-muted hover:text-text flex items-center gap-2 group transition-colors"
            >
              Read the docs{" "}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>

          <div className="text-sm text-text-muted/60 max-w-2xl px-6">
            <span className="text-success font-semibold">Returns:</span> news,
            blogs, podcasts, videos, DAO proposals, events, and forum posts
            &mdash; all tagged{" "}
            <span className="text-text-muted font-mono bg-surface-light px-1.5 py-0.5 rounded">
              Arbitrum
            </span>
            , in one call.
          </div>
        </section>

        {/* 3. Logo Strip */}
        <section className="border-y border-surface-border bg-surface-light/30 backdrop-blur overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center">
            <p className="text-sm font-semibold text-text-muted mb-8 uppercase tracking-widest text-center">
              Built by the team behind Alphaday, trusted by
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="font-display font-extrabold text-2xl tracking-tighter cursor-default">
                AAVE
              </span>
              <span className="font-display font-black text-2xl tracking-tighter cursor-default">
                AVALANCHE
              </span>
              <span className="font-display font-bold text-2xl tracking-tighter cursor-default">
                POLYGON
              </span>
              <span className="font-display font-bold text-2xl tracking-tight cursor-default">
                Sui
              </span>
            </div>
          </div>
        </section>

        {/* 4 & 5. The Problem & Solution */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-6">
                Crypto data lives across 50 different sites.
                <br className="hidden md:block" />
                <span className="text-text-muted">
                  Your agent shouldn&apos;t have to.
                </span>
              </h2>
            </div>

            <div className="text-center mb-16">
              <h3 className="text-primary font-mono text-sm tracking-[0.2em] uppercase font-bold mb-4">
                The Solution
              </h3>
              <p className="font-display text-4xl font-bold">
                One API. Every source. Every format.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
              <div className="bg-surface p-8 rounded-3xl border border-surface-border hover:bg-surface-light transition-all duration-500 group relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="w-12 h-12 bg-surface-light border border-surface-border rounded-xl flex items-center justify-center mb-6 text-primary">
                  <Blocks className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-4">
                  1,000+ curated sources
                </h4>
                <p className="text-text-muted leading-relaxed">
                  News outlets, project blogs, podcasts, YouTube channels,
                  governance forums, DAO proposals, event calendars — all
                  aggregated, deduped, and tagged.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-3xl border border-surface-border hover:bg-surface-light transition-all duration-500 group relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="w-12 h-12 bg-surface-light border border-surface-border rounded-xl flex items-center justify-center mb-6 text-primary">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-4">
                  Ask by project, not endpoint
                </h4>
                <p className="text-text-muted leading-relaxed">
                  Want everything about Uniswap? One call. Filter across every
                  content type by project, keyword, or time range instantly.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-3xl border border-surface-border hover:bg-surface-light transition-all duration-500 group relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="w-12 h-12 bg-surface-light border border-surface-border rounded-xl flex items-center justify-center mb-6 text-primary">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-4">MCP out of the box</h4>
                <p className="text-text-muted leading-relaxed">
                  Drop our MCP server into Claude Desktop, Cursor, or your own
                  agent. Tools come pre-described for LLM consumption.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Hero Demo Section */}
        <section className="py-24 px-6 bg-surface-light/30 border-y border-surface-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 space-y-6 z-10">
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                What&apos;s trending in crypto right now?
              </h2>
              <p className="text-xl text-text-muted">
                One call. Real-time. Aggregated from 49 news sources.
              </p>
              <div className="pt-8">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-surface border border-surface-border text-sm font-mono text-text-muted shadow-sm">
                  <Bot className="w-4 h-4 text-primary" />
                  <span>
                    Agent MCP tool:{" "}
                    <span className="text-text font-semibold">
                      alphaday.get_trending_news()
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full z-10">
              <div className="flex flex-col bg-surface border-t border-x border-surface-border rounded-t-2xl p-4 font-mono text-sm text-text-muted gap-2">
                <div className="flex gap-1.5 mr-2">
                  <div className="w-3 h-3 rounded-full bg-danger"></div>
                  <div className="w-3 h-3 rounded-full bg-surface-border"></div>
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                </div>
                <div className="mt-2 whitespace-nowrap max-sm:hidden">
                  <span className="text-primary mr-1">$</span> curl
                  https://api.alphaday.com/news/trending?limit=3
                </div>
                <div className="mt-2 whitespace-nowrap sm:hidden">
                  <span className="flex tracking-tight text-left whitespace-nowrap">
                    <span className="text-primary mr-1">$</span>{" "}
                    {trendingCurl.slice(
                      0,
                      Math.floor(trendingCurl.length / 2) + 5,
                    )}
                  </span>
                  <span className="tracking-tight text-left whitespace-nowrap">
                    {trendingCurl.slice(
                      Math.floor(trendingCurl.length / 2) + 5,
                    )}
                  </span>
                </div>
              </div>
              <CodeBlock
                code={trendingJson}
                language="json"
                className="rounded-t-none border-t-0 shadow-2xl"
                annotated
              />
            </div>
          </div>
        </section>

        {/* 7. Tools Grid */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">
                11 tools. Zero setup.
              </h2>
              <p className="text-xl text-text-muted max-w-2xl mx-auto">
                Every endpoint is also a pre-described MCP tool. Your agent
                knows exactly what to do.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tools.map((tool, i) => (
                <div
                  key={tool.name}
                  className={`bg-surface border border-surface-border p-6 rounded-2xl hover:border-primary/50 hover:bg-surface-light transition-all group lg:col-span-1 ${
                    i === 10 ? "md:col-span-2 lg:col-span-1 lg:col-start-2" : ""
                  }`}
                >
                  <div className="font-mono text-sm font-bold text-text mb-3 flex items-center gap-2">
                    <span className="text-primary bg-primary/10 px-2 py-1 rounded">
                      f(x)
                    </span>
                    {tool.name}
                  </div>
                  <p className="text-text-muted text-sm leading-relaxed">
                    {tool.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Stat Band */}
        <section className="py-24 px-6 bg-primary text-background border-y border-primary/20">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-background/20 font-display">
            <div className="px-6 flex flex-col items-center pt-8 md:pt-0">
              <span className="text-5xl md:text-6xl font-black tracking-tighter mb-2">
                1,000+
              </span>
              <span className="font-bold text-background/80 uppercase tracking-widest text-sm">
                Data Sources
              </span>
            </div>
            <div className="px-6 flex flex-col items-center pt-8 md:pt-0">
              <span className="text-5xl md:text-6xl font-black tracking-tighter mb-2">
                500k+
              </span>
              <span className="font-bold text-background/80 uppercase tracking-widest text-sm">
                Indexed Items
              </span>
            </div>
            <div className="px-6 flex flex-col items-center pt-8 md:pt-0">
              <span className="text-5xl md:text-6xl font-black tracking-tighter mb-2">
                11
              </span>
              <span className="font-bold text-background/80 uppercase tracking-widest text-sm">
                Tools at Launch
              </span>
            </div>
          </div>
        </section>

        {/* 9. MCP + REST */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl font-bold tracking-tight mb-4">
                Two ways in. Same data.
              </h2>
              <p className="text-lg text-text-muted max-w-2xl mx-auto">
                Use our MCP server if your agent speaks MCP. Use REST if it
                doesn&apos;t. Same endpoints, same data, same rate limits.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4 pl-2">
                  <div className="w-8 h-8 rounded bg-surface border border-surface-border flex items-center justify-center text-primary font-bold font-mono">
                    1
                  </div>
                  <h3 className="font-bold text-xl">MCP Server</h3>
                  <span className="text-xs font-mono text-text-muted bg-surface-light px-2 py-1 rounded ml-auto">
                    claude_config.json
                  </span>
                </div>
                <CodeBlock
                  code={mcpConfig}
                  language="json"
                  className="min-h-[180px]"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-4 pl-2">
                  <div className="w-8 h-8 rounded bg-surface border border-surface-border flex items-center justify-center text-primary font-bold font-mono">
                    2
                  </div>
                  <h3 className="font-bold text-xl">REST API</h3>
                  <span className="text-xs font-mono text-text-muted bg-surface-light px-2 py-1 rounded ml-auto">
                    Terminal
                  </span>
                </div>
                <CodeBlock
                  code={restCurl}
                  language="bash"
                  className="min-h-[180px] flex items-center"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 10. Pricing */}
        <section className="py-24 px-6 relative flex justify-center">
          <div className="max-w-md w-full relative z-10 group">
            <div className="absolute -inset-[1px] bg-gradient-to-b from-primary to-surface-border rounded-[2rem] opacity-30 group-hover:opacity-100 transition duration-500 blur-[2px]" />
            <div className="bg-surface relative rounded-[2rem] p-10 flex flex-col items-center text-center shadow-2xl">
              <h2 className="font-display text-3xl font-bold mb-2">
                Free. Forever-ish.
              </h2>
              <div className="text-6xl font-black font-display tracking-tighter text-primary mb-8 my-6">
                $0
              </div>

              <ul className="space-y-4 text-left w-full max-w-[280px] mb-10 text-text-muted font-medium">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success" /> All 1,000+ data
                  sources
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success" /> All 11 tools
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success" /> MCP and REST access
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success" /> No API key required
                </li>
              </ul>

              <button className="btn-primary w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 mb-6">
                Start building <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-text-muted/60 text-center uppercase tracking-wider font-semibold">
                Fair-use rate limits apply.
                <br />
                We&apos;ll always tell you before anything changes.
              </p>
            </div>
          </div>
        </section>

        {/* 11. Final CTA */}
        <section className="py-32 px-6 border-t border-surface-border bg-surface-light/50 text-center relative overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[100px] rounded-t-full pointer-events-none" />
          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Start building. No signup.
            </h2>
            <p className="text-xl text-text-muted mb-12">
              Copy the command. Paste it in your terminal. That&apos;s
              onboarding.
            </p>

            <div className="max-w-lg mx-auto mb-10">
              <CodeBlock
                code={finalCurl}
                language="bash"
                className="shadow-2xl border-primary/20 bg-surface"
              />
            </div>

            <a
              href={docsUrl}
              className="inline-flex items-center gap-2 text-text font-semibold hover:text-primary transition-colors hover:gap-3"
            >
              Read the full docs <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </main>

      {/* 12. Footer */}
      <footer className="border-t border-surface-border bg-background py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img src={alphaday} className="h-5 object-fit" alt="alphaday" />
              <span className="font-montserrat font-bold text-lg tracking-tight">
                Alphaday API
              </span>
            </div>
            <p className="text-sm text-text-muted">A product of Alphaday.</p>
          </div>

          <div className="flex flex-wrap gap-x-12 gap-y-8 text-sm">
            <div className="flex flex-col gap-3">
              <span className="font-bold text-text uppercase tracking-widest text-[11px] mb-1">
                Product
              </span>
              <a
                href={docsUrl}
                className="text-text-muted hover:text-primary transition-colors"
              >
                Docs
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-primary transition-colors"
              >
                Status
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-primary transition-colors"
              >
                MCP Config
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-bold text-text uppercase tracking-widest text-[11px] mb-1">
                Resources
              </span>
              <a
                href={githubUrl}
                className="text-text-muted hover:text-primary transition-colors"
              >
                GitHub
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-primary transition-colors"
              >
                Changelog
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-primary transition-colors"
              >
                Rate Limits
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-bold text-text uppercase tracking-widest text-[11px] mb-1">
                Company
              </span>
              <a
                href="/"
                className="text-text-muted hover:text-primary transition-colors"
              >
                Alphaday
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-primary transition-colors"
              >
                Twitter
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-primary transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ApiPage;
