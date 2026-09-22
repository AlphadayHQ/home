import config from "../../config";
import Hero from "./Hero";
import CategoryGrid from "./CategoryGrid";
import DashboardScreenshot from "./DashboardScreenshot";
import ValueProps from "./ValueProps";
import BottomCTA from "./BottomCTA";
import LandingFooter from "./LandingFooter";
import LongFormSection from "./LongFormSection";
import FAQ from "./FAQ";
import SiblingDashboards from "./SiblingDashboards";
import { Footer, Navbar } from "../index";
import { digestEntityFor } from "../../data/digestEntities";

function slugToName(slug) {
  if (!slug) return null;
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function SkelBar({ className = "", tone = "hero", delay = 0 }) {
  const base =
    tone === "hero"
      ? "bg-black/20"
      : tone === "muted"
      ? "bg-black/10"
      : "bg-white/[0.06]";
  const sheen =
    tone === "dark"
      ? "via-white/[0.07]"
      : "via-white/15";
  return (
    <div className={`relative overflow-hidden rounded-md ${base} ${className}`}>
      <div
        className={`absolute inset-0 -translate-x-full bg-linear-to-r from-transparent ${sheen} to-transparent animate-shimmer motion-reduce:hidden`}
        style={delay ? { animationDelay: `${delay}ms` } : undefined}
      />
    </div>
  );
}

export function LoadingState({ slug }) {
  const projectName = slugToName(slug);

  return (
    <div
      className="min-h-screen bg-eerie"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Top progress bar — premium signature, indeterminate */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-60 overflow-hidden bg-california/10 pointer-events-none">
        <div className="h-full w-full origin-left bg-linear-to-r from-transparent via-california to-transparent animate-progress-slide shadow-[0_0_8px_0_rgba(250,162,2,0.6)] motion-reduce:hidden" />
        {/* Reduced-motion fallback: static thin band */}
        <div className="hidden motion-reduce:block h-full w-1/3 bg-california/60" />
      </div>

      <Navbar />

      {/* Hero skeleton — mirrors actual Hero layout so the real page resolves into the silhouette */}
      <section className="bg-california overflow-hidden w-full">
        <div className="mx-auto w-11/12 max-w-7xl">
          <div className="flex flex-col items-start max-w-5xl pt-12 sm:pt-16 md:pt-24 pb-16 md:pb-24">
            {/* Logo placeholder — breathes gently as if waking up */}
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl mb-6 bg-white/30 p-1 relative">
              <div className="absolute inset-1 rounded-xl bg-black/15 animate-breathe-glow motion-reduce:animate-none motion-reduce:opacity-60" />
            </div>

            {/* Headline rows */}
            <div className="w-full max-w-4xl mb-4 md:mb-6 space-y-3 md:space-y-4">
              <SkelBar className="h-10 md:h-16 lg:h-20 w-11/12" />
              <SkelBar className="h-10 md:h-16 lg:h-20 w-3/4" delay={120} />
            </div>

            {/* Subheading row */}
            <div className="w-full max-w-2xl mb-8 md:mb-10 space-y-2">
              <SkelBar className="h-4 md:h-5 w-full" tone="muted" delay={240} />
              <SkelBar
                className="h-4 md:h-5 w-5/6"
                tone="muted"
                delay={320}
              />
            </div>

            {/* CTA with quiet contextual label — anti-deception + anticipation */}
            <div className="inline-flex items-center gap-3 bg-black rounded-lg px-6 py-3 md:px-8 md:py-4">
              <span className="text-white/70 text-base md:text-lg font-medium tabular-nums">
                {projectName ? `Preparing ${projectName}` : "Preparing dashboard"}
              </span>
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="w-1 h-1 rounded-full bg-california animate-pulse [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-california animate-pulse [animation-delay:200ms]" />
                <span className="w-1 h-1 rounded-full bg-california animate-pulse [animation-delay:400ms]" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Content skeleton — three category cards with staggered shimmer sweep */}
      <section className="bg-eerie">
        <div className="mx-auto w-11/12 max-w-7xl py-12 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-2xl bg-shark border border-surface-border p-6 h-48"
              >
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-lg bg-white/5" />
                  <SkelBar
                    className="h-5 w-3/4 mt-4"
                    tone="dark"
                    delay={i * 180}
                  />
                  <SkelBar
                    className="h-3.5 w-full"
                    tone="dark"
                    delay={i * 180 + 80}
                  />
                  <SkelBar
                    className="h-3.5 w-5/6"
                    tone="dark"
                    delay={i * 180 + 160}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <span className="sr-only">
        Loading {projectName || "dashboard"} page
      </span>
    </div>
  );
}

export function ErrorState() {
  return (
    <>
      <div className="min-h-screen bg-eerie flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-platinum text-2xl mb-3">Something went wrong</h1>
        <p className="text-aluminium mb-6">
          We couldn't load this dashboard right now. Please try again later.
        </p>
        <a href="/" className="text-california underline">
          Back to Alphaday
        </a>
      </div>
    </>
  );
}

/**
 * A link to the rolling digest, for the entities that have one.
 *
 * A **link**, emphatically not a recap panel. C3 rules out putting the digest on
 * this page: it would answer the question the click-through to the dashboard was
 * supposed to answer, so a panel here cannibalises this page's own CTA. A single
 * line does the opposite — it sends the reader who wants "what happened" to the
 * page built for that, and keeps this page selling the dashboard.
 *
 * It also exists for §5.8. The digest is in the sitemap, but a URL with no
 * inbound internal link is an orphan, and an orphan is a page Google finds slowly
 * and ranks worse. This is the only internal path to it.
 */
function DigestLink({ slug, name }) {
  if (!digestEntityFor(slug)) return null;

  return (
    <div className="mx-auto w-11/12 max-w-5xl pb-2">
      <a
        href={`/projects/${slug}/this-week`}
        className="inline-flex items-center gap-2 text-[15px] text-primary hover:underline font-semibold"
      >
        What&rsquo;s been happening with {name} this week
        <span aria-hidden="true">&rarr;</span>
      </a>
    </div>
  );
}

/**
 * The rendered page, given data. Split out from the container so the tree can
 * be rendered without a fetch — that is what the Phase 2 SSR calibration
 * harness measures (`scripts/calibrate-render.js`), and it is the shape the
 * TanStack Start migration needs anyway, where the data arrives from a server
 * loader rather than a `useEffect`.
 */
export function ProjectLandingPage({ data }) {
  const dashboardUrl = `${config.alphadayApp.replace(/\/$/, "")}/b/${data.slug}`;

  return (
    <>
      <Navbar />
      <Hero
        headline={data.hero.headline}
        subheading={data.hero.subheading}
        logo={data.icon}
        dashboardUrl={dashboardUrl}
        projectName={data.name}
      />
      {data.intro_paragraph && <LongFormSection body={data.intro_paragraph} />}
      <DigestLink slug={data.slug} name={data.name} />
      <CategoryGrid name={data.name} cards={data.category_cards} />
      <DashboardScreenshot
        projectName={data.name}
        dashboardImage={data.dashboard_image}
      />
      <ValueProps valueProps={data.value_props} projectName={data.name} />
      {data.about_project && (
        <LongFormSection
          body={data.about_project}
          heading={`About ${data.name}`}
        />
      )}
      <FAQ faqs={data.faqs} projectName={data.name} />
      <BottomCTA projectName={data.name} dashboardUrl={dashboardUrl} />
      <SiblingDashboards
        siblings={data.sibling_dashboards}
        currentName={data.name}
      />
      <Footer />
    </>
  );
}
