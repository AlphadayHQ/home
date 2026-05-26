import React, { useEffect, useState } from "react";
import Seo from "../components/seo";
import Error404 from "../components/Error404";
import { fetchBoardBySlug } from "../api/boards";
import { deriveCards } from "../components/landing/widgetCategoryMap";
import { getToken } from "../components/landing/tokenOverrides";
import Hero from "../components/landing/Hero";
import CategoryGrid from "../components/landing/CategoryGrid";
import DashboardScreenshot from "../components/landing/DashboardScreenshot";
import ValueProps from "../components/landing/ValueProps";
import BottomCTA from "../components/landing/BottomCTA";
import LandingFooter from "../components/landing/LandingFooter";
import config from "../config";

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
      <a
        href="/"
        className="text-california underline"
      >
        Back to Alphaday
      </a>
    </div>
  );
}

function ProjectLandingContainer({ slug }) {
  const [state, setState] = useState({ status: "loading", board: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", board: null });
    fetchBoardBySlug(slug)
      .then((board) => {
        if (cancelled) return;
        if (!board) setState({ status: "not-found", board: null });
        else setState({ status: "ready", board });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", board: null });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "not-found") return <Error404 />;
  if (state.status === "error") return <ErrorState />;

  const { board } = state;
  const project = board.name;
  const token = getToken(board);
  const cardIds = deriveCards(board);
  const canonical = `https://alphaday.com/${board.slug}`;
  const tokenPhrase = token ? `${token} price, ` : "";
  const title = `${project} — News, Price, Governance & Analytics Dashboard`;
  const description = `Your all-in-one ${project} dashboard. Track ${tokenPhrase}news, governance, on-chain data, community updates and more.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
  };

  return (
    <>
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <Hero
        project={project}
        slug={board.slug}
        logo={board.icon}
        appUrl={config.alphadayApp}
      />
      <CategoryGrid project={project} token={token} cardIds={cardIds} />
      <DashboardScreenshot project={project} />
      <ValueProps project={project} />
      <BottomCTA
        project={project}
        slug={board.slug}
        appUrl={config.alphadayApp}
      />
      <LandingFooter />
    </>
  );
}

export default ProjectLandingContainer;
