import React, { useEffect, useState } from "react";
import Seo from "../components/seo";
import Error404 from "../components/Error404";
import { fetchLandingPageBySlug } from "../api/boards";
import config from "../config";
import Hero from "../components/landing/Hero";
import CategoryGrid from "../components/landing/CategoryGrid";
import DashboardScreenshot from "../components/landing/DashboardScreenshot";
import ValueProps from "../components/landing/ValueProps";
import BottomCTA from "../components/landing/BottomCTA";
import LandingFooter from "../components/landing/LandingFooter";
import LongFormSection from "../components/landing/LongFormSection";
import FAQ from "../components/landing/FAQ";
import SiblingDashboards from "../components/landing/SiblingDashboards";
import { Footer, Navbar } from "../components";

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

function LoadingState({ slug }) {
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

function ErrorState() {
  return (
    <div className="min-h-screen bg-eerie flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-platinum text-2xl mb-3">Something went wrong</h1>
      <p className="text-aluminium mb-6">
        We couldn't load this dashboard right now. Please try again later.
      </p>
      <a href="/" className="text-california underline">
        Back to Alphaday
      </a>
    </div>
  );
}

function buildJsonLd({ data, canonical }) {
  const graph = [
    {
      "@type": "SoftwareApplication",
      name: `${data.name} Dashboard`,
      description: data.meta.description,
      url: canonical,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      publisher: {
        "@type": "Organization",
        name: "Alphaday",
        url: "https://alphaday.com",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Alphaday",
          item: "https://alphaday.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: data.name,
          item: canonical,
        },
      ],
    },
  ];

  if (data.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: data.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function ProjectLandingContainer({ slug }) {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null });
    fetchLandingPageBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) setState({ status: "not-found", data: null });
        else setState({ status: "ready", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") return <LoadingState slug={slug} />;
  if (state.status === "not-found") return <Error404 />;
  if (state.status === "error") return <ErrorState />;

  const data = state.data;
  const canonical = `https://alphaday.com/${data.slug}`;
  const dashboardUrl = `${config.alphadayApp.replace(/\/$/, "")}/b/${data.slug}`;
  const jsonLd = buildJsonLd({ data, canonical });

  return (
    <>
      <Seo
        title={data.meta.title}
        description={data.meta.description}
        canonical={canonical}
        ogImage={data.meta.og_image}
        jsonLd={jsonLd}
      />
      <Navbar />
      <Hero
        headline={data.hero.headline}
        subheading={data.hero.subheading}
        logo={data.icon}
        dashboardUrl={dashboardUrl}
        projectName={data.name}
      />
      {data.intro_paragraph && <LongFormSection body={data.intro_paragraph} />}
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

export default ProjectLandingContainer;
