import React, { useEffect, useState } from "react";
import Seo from "../components/seo";
import Error404 from "../components/Error404";
import { fetchLandingPageBySlug } from "../api/boards";
import Hero from "../components/landing/Hero";
import CategoryGrid from "../components/landing/CategoryGrid";
import DashboardScreenshot from "../components/landing/DashboardScreenshot";
import ValueProps from "../components/landing/ValueProps";
import BottomCTA from "../components/landing/BottomCTA";
import LandingFooter from "../components/landing/LandingFooter";
import LongFormSection from "../components/landing/LongFormSection";

function LoadingState() {
  return (
    <div className="min-h-screen bg-eerie flex items-center justify-center">
      <div className="text-aluminium text-sm">Loading…</div>
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

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "not-found") return <Error404 />;
  if (state.status === "error") return <ErrorState />;

  const data = state.data;
  const canonical = `https://alphaday.com/${data.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.meta.title,
    description: data.meta.description,
    url: canonical,
  };

  return (
    <>
      <Seo
        title={data.meta.title}
        description={data.meta.description}
        canonical={canonical}
        ogImage={data.meta.og_image}
        jsonLd={jsonLd}
      />
      <Hero
        headline={data.hero.headline}
        subheading={data.hero.subheading}
        logo={data.icon}
        dashboardUrl={data.dashboard_url}
        projectName={data.name}
      />
      {data.intro_paragraph && (
        <LongFormSection body={data.intro_paragraph} />
      )}
      <CategoryGrid name={data.name} cards={data.category_cards} />
      <DashboardScreenshot projectName={data.name} />
      <ValueProps valueProps={data.value_props} projectName={data.name} />
      {data.about_project && (
        <LongFormSection body={data.about_project} heading={`About ${data.name}`} />
      )}
      <BottomCTA projectName={data.name} dashboardUrl={data.dashboard_url} />
      <LandingFooter />
    </>
  );
}

export default ProjectLandingContainer;
