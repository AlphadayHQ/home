import { useEffect, useMemo, useRef, useState } from "react";
import {
  Newspaper,
  Calendar,
  Video,
  LineChart,
  Layers,
  Mic,
  FileText,
  Landmark,
  MessagesSquare,
  Coins,
  Building2,
  ArrowLeftRight,
  ShieldAlert,
  Flame,
  Bot,
  Blocks,
  Search,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Seo from "../components/seo";
import CONFIG from "../config";
import alphaday from "../images/logo-notext.png";
import { API_DOCS } from "../api/docs-spec.generated";

const SWAGGER_URL = "https://api.alphaday.com/docs/";

// lucide component lookup keyed by the icon name baked into the generated data.
const ICONS = {
  Newspaper,
  Calendar,
  Video,
  LineChart,
  Layers,
  Mic,
  FileText,
  Landmark,
  MessagesSquare,
  Coins,
  Building2,
  ArrowLeftRight,
  ShieldAlert,
  Flame,
  Bot,
  Blocks,
};

// Editorial one-liners per category (static UI copy — the spec has no
// category-level descriptions). Falls back to a generic line if missing.
const CATEGORY_BLURB = {
  news: "Real-time crypto headlines with sentiment scoring, AI summaries, 24-hour trending lists and per-user bookmarks.",
  events:
    "Curated crypto calendar — conferences, token unlocks and protocol milestones, plus this-week and trending views.",
  videos:
    "Crypto video feed with the latest uploads, trending clips and per-user bookmarks.",
  market:
    "Aggregate market data — coin prices, price history and trending assets across the market.",
  tvl: "DeFi TVL suite — protocol fees, stablecoin supply and yield-pool data.",
  podcasts:
    "Crypto podcast episodes across dozens of feeds, with trending and bookmark support.",
  blogs:
    "Project and research blogs aggregated into one feed, with trending and bookmarks.",
  dao: "DAO governance items and proposals, plus a trending view.",
  forum:
    "Crypto forum and discussion items surfaced from community sources, with trending.",
  coins: "CoinGecko token categories and their constituent coins.",
  exchanges: "Centralised exchange reference data.",
  "onchain-dexes": "On-chain DEX reference data and metrics.",
  security:
    "Public read API for exploit and security incident alerts across protocols.",
  keywords: "Trending keywords and tags surfacing across the crypto ecosystem.",
  kasandra:
    "Kasandra AI — recent chart patterns matched on a coin's market history.",
};

function categoryBlurb(cat) {
  return (
    CATEGORY_BLURB[cat.key] ||
    `${cat.count} endpoint${cat.count === 1 ? "" : "s"} in ${cat.name}.`
  );
}

// Text blob used for the search filter — path, summary, description, params, model.
function endpointHaystack(ep) {
  const params = ep.parameters.map((p) => p.name).join(" ");
  const model = ep.returns?.model || "";
  return `${ep.path} ${ep.summary || ""} ${ep.description} ${params} ${model}`.toLowerCase();
}

function CopyCurlButton({ curl }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 pt-2 text-xs font-semibold transition-colors"
      aria-label="Copy cURL command"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? (
        <span className="leading-3.5">Copied</span>
      ) : (
        <span className="leading-3.5">Copy cURL</span>
      )}
    </button>
  );
}

function ParamTable({ parameters }) {
  if (!parameters.length) {
    return (
      <div className="text-xs text-text-muted/70 font-mono py-2">
        No query parameters.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-text-muted/60">
            <th className="font-medium py-2 pr-4">Parameter</th>
            <th className="font-medium py-2 pr-4">Type</th>
            <th className="font-medium py-2 pr-4">In</th>
            <th className="font-medium py-2 pr-4"></th>
            <th className="font-medium py-2">Description</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {parameters.map((p) => (
            <tr
              key={p.name}
              className="border-t border-surface-border/60 text-xs"
            >
              <td className="py-2 pr-4 font-mono text-text whitespace-nowrap">
                {p.name}
              </td>
              <td className="py-2 pr-4 font-mono text-blue-400 whitespace-nowrap">
                {p.type}
              </td>
              <td className="py-2 pr-4">
                <span className="uppercase text-[10px] tracking-wide text-text-muted/70 bg-surface-light px-1.5 py-0.5 rounded">
                  {p.in}
                </span>
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {p.required ? (
                  <span className="text-[10px] uppercase tracking-wide text-danger bg-danger/10 px-1.5 py-0.5 rounded">
                    required
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-text-muted/60">
                    optional
                  </span>
                )}
              </td>
              <td className="py-2 text-text-muted">{p.description || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldList({ label, fields }) {
  if (!fields || !fields.length) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      <span className="text-[10px] uppercase tracking-wider text-text-muted/60 mr-1">
        {label}
      </span>
      {fields.map((f, i) => (
        <span key={f} className="font-mono text-[11px] text-text-muted">
          {f}
          {i < fields.length - 1 && (
            <span className="text-text-muted/40">,</span>
          )}
        </span>
      ))}
    </div>
  );
}

function ReturnsSummary({ returns }) {
  if (!returns) return null;
  const kindLabel =
    returns.kind === "paginated"
      ? "paginated list"
      : returns.kind === "array"
        ? "list"
        : "object";
  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[10px] uppercase tracking-wider text-text-muted/60">
          Returns
        </span>
        <span className="font-mono text-primary bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5">
          {kindLabel}
          {returns.model ? ` of ${returns.model}` : ""}
        </span>
      </div>
      {returns.kind === "paginated" && (
        <FieldList label="Top-level" fields={returns.topLevel} />
      )}
      <FieldList
        label={returns.kind === "object" ? "Fields" : "Result items"}
        fields={
          returns.kind === "object" ? returns.topLevel : returns.itemFields
        }
      />
    </div>
  );
}

function EndpointBlock({ endpoint }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-background/40 p-3 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 leading-2.5 text-[10px] font-bold uppercase tracking-wide text-success bg-success/10 border border-success/30 rounded px-2 py-1 pt-1.5">
            {endpoint.method}
          </span>
          <code className="font-mono text-sm text-text break-all">
            {endpoint.path}
          </code>
        </div>
        <div className="self-start">
          <CopyCurlButton curl={endpoint.curl} />
        </div>
      </div>
      {(endpoint.summary || endpoint.description) && (
        <div className="mt-2">
          <p className="text-sm font-medium text-text">
            {endpoint.summary || endpoint.description}
          </p>
          {endpoint.summary && endpoint.description && (
            <p className="mt-0.5 text-sm text-text-muted">
              {endpoint.description}
            </p>
          )}
        </div>
      )}
      <div className="mt-3">
        <ParamTable parameters={endpoint.parameters} />
      </div>
      <ReturnsSummary returns={endpoint.returns} />
    </div>
  );
}

function CategoryCard({ category, cardRef }) {
  const Icon = ICONS[category.icon] || Blocks;
  return (
    <section
      ref={cardRef}
      id={`cat-${category.key}`}
      className="scroll-mt-28 rounded-3xl border border-surface-border bg-surface p-4 sm:p-6 md:p-8"
    >
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-light border border-surface-border text-primary">
            <Icon size={18} />
          </span>
          <h2 className="text-xl font-semibold text-text">{category.name}</h2>
          <span className="text-xs font-mono text-text-muted bg-surface-light border border-surface-border rounded-full px-2 py-0.5">
            {category.endpoints.length}
          </span>
        </div>
        <p className="mt-3 text-sm text-text-muted max-w-2xl">
          {categoryBlurb(category)}
        </p>
      </header>
      <div className="space-y-4">
        {category.endpoints.map((ep) => (
          <EndpointBlock key={`${ep.method}-${ep.path}`} endpoint={ep} />
        ))}
      </div>
    </section>
  );
}

export default function ApiDocsPage() {
  const [query, setQuery] = useState("");
  const [activeKey, setActiveKey] = useState(API_DOCS.categories[0]?.key || "");
  const sectionRefs = useRef({});

  const q = query.trim().toLowerCase();

  // Filter endpoints by the search box; drop categories with no matches.
  const filtered = useMemo(() => {
    if (!q) return API_DOCS.categories;
    return API_DOCS.categories
      .map((cat) => {
        if (cat.name.toLowerCase().includes(q)) return cat;
        const endpoints = cat.endpoints.filter((ep) =>
          endpointHaystack(ep).includes(q),
        );
        return endpoints.length ? { ...cat, endpoints } : null;
      })
      .filter(Boolean);
  }, [q]);

  // Scroll-spy: highlight the sidebar item for the section nearest the top.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveKey(visible[0].target.dataset.key);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [filtered]);

  const scrollToCategory = (key) => {
    const el = sectionRefs.current[key];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background text-text font-sans w-full">
      <Seo
        title="Alphaday API — Full Reference"
        description="Browseable reference of every endpoint in the Alphaday REST API: parameters, response shapes and copy-ready cURL commands."
        canonical="https://alphaday.com/api/docs"
      />

      {/* slim sub-nav */}
      <nav className="sticky top-0 z-40 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <a href="/api" className="flex items-center gap-2 shrink-0">
              <img
                src={alphaday}
                className="h-5 object-contain"
                alt="alphaday"
              />
              <span className="font-montserrat font-bold text-base sm:text-lg tracking-tight whitespace-nowrap">
                Alphaday API
              </span>
            </a>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm shrink-0">
            <a
              href={CONFIG.api}
              className="text-text-muted hover:text-primary transition-colors hidden md:inline"
            >
              Why Alphaday API <ArrowRight size={12} className="inline" />
            </a>
            <a
              href={SWAGGER_URL}
              target="_blank"
              rel="noreferrer"
              className="text-text-muted hover:text-primary transition-colors hidden sm:inline"
            >
              Swagger <ArrowRight size={12} className="inline" />
            </a>
          </div>
        </div>
      </nav>

      {/* ref-intro strip */}
      <header className="border-b border-surface-border bg-surface-light/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <h1 className="mt-3 text-2xl md:text-4xl font-semibold tracking-tight">
            Full reference:{" "}
            <span className="bg-linear-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              every parameter, every response shape.
            </span>
          </h1>
          <p className="mt-2 text-sm text-text-muted max-w-3xl">
            For each endpoint: HTTP method, query parameters with types,
            response model and top-level fields. Pulled directly from the live
            OpenAPI spec — {API_DOCS.totalEndpoints} endpoints across{" "}
            {API_DOCS.categoryCount} categories.
          </p>
        </div>
      </header>

      {/* body: sticky sidebar + card grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* sidebar */}
        <aside className="lg:w-70 lg:shrink-0">
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 space-y-5">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search params, paths, fields…"
                className="w-full rounded-xl bg-surface border border-surface-border pl-9 pr-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <nav className="space-y-0.5">
              {filtered.length === 0 && (
                <p className="text-sm text-text-muted/70 px-1 py-2">
                  No endpoints match “{query}”.
                </p>
              )}
              {filtered.map((cat) => {
                const Icon = ICONS[cat.icon] || Blocks;
                const active = activeKey === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => scrollToCategory(cat.key)}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left ${
                      active
                        ? "bg-surface-light text-text border border-surface-border"
                        : "text-text-muted hover:text-text hover:bg-surface/60 border border-transparent"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={active ? "text-primary" : "text-text-muted/70"}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className="text-[11px] font-mono text-text-muted/60">
                      {cat.endpoints.length}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* legend */}
            <div className="rounded-xl border border-surface-border bg-surface p-4 text-xs text-text-muted space-y-2">
              <div className="uppercase tracking-wider text-[10px] text-text-muted/60">
                Legend
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-danger bg-danger/10 px-1.5 py-0.5 rounded">
                  required
                </span>
                <span className="text-[10px] uppercase tracking-wide text-text-muted/60">
                  optional
                </span>
              </div>
              <p className="leading-relaxed">
                All endpoints are currently{" "}
                <span className="text-success font-semibold">open</span> — no
                API key or authentication required.
              </p>
            </div>
          </div>
        </aside>

        {/* card grid */}
        <main className="flex-1 min-w-0 space-y-6">
          {filtered.map((cat) => (
            <CategoryCard
              key={cat.key}
              category={cat}
              cardRef={(el) => {
                if (el) {
                  el.dataset.key = cat.key;
                  sectionRefs.current[cat.key] = el;
                } else {
                  delete sectionRefs.current[cat.key];
                }
              }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-3xl border border-surface-border bg-surface p-12 text-center text-text-muted">
              No endpoints match your search.
            </div>
          )}
        </main>
      </div>

      {/* slim footer */}
      <footer className="border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm">
          <a
            href={CONFIG.api}
            className="inline-flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} /> Lean overview
          </a>
          <a
            href={SWAGGER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
          >
            Open Swagger <ExternalLink size={14} />
          </a>
        </div>
      </footer>
    </div>
  );
}
