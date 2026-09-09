import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  ProjectLandingPage,
  LoadingState,
  ErrorState,
} from "../components/landing/ProjectLandingPage";
import { getLandingPage } from "../server/landingPages";
import { canonicalFor, seoHead } from "../seo/head";
import { projectIndexState, robotsHeader, isIndexable } from "../seo/indexState";
import { setRobotsHeader } from "../seo/robotsHeader";
import CONFIG from "../config";

export const Route = createFileRoute("/projects/$slug/")({
  loader: async ({ params }) => {
    const data = await getLandingPage({ data: params.slug });
    // A missing record is a real 404, not an error state. The SPA rendered the
    // home page's head at HTTP 200 here, which made every unknown slug an
    // indexable near-duplicate of /.
    if (!data) throw notFound();

    const state = projectIndexState(data);
    // §4.2: the header as well as the meta tag. It is the only signal that
    // reaches a client which never parses the body.
    setRobotsHeader(robotsHeader(state));

    return { data, indexable: isIndexable(state) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      // Head is also evaluated before the loader resolves. Nothing is known
      // about the page yet, so claim nothing about it.
      return seoHead({
        index: false,
        title: "Alphaday",
        description: "Crypto dashboards, data and research.",
      });
    }

    const { data, indexable } = loaderData;
    const canonical = canonicalFor(`/projects/${data.slug}`);
    const jsonLd = buildJsonLd(data, canonical);

    return indexable
      ? seoHead({
          index: true,
          canonical,
          title: data.meta.title,
          description: data.meta.description,
          image: data.meta.og_image ?? undefined,
          jsonLd,
        })
      : seoHead({
          index: false,
          title: data.meta.title,
          description: data.meta.description,
          image: data.meta.og_image ?? undefined,
        });
  },
  component: ProjectPage,
  // On a client-side navigation the loader runs in the browser and there is a
  // gap to fill; on the first (server-rendered) request there is not, which is
  // the point of moving the fetch server-side.
  pendingComponent: () => <LoadingState />,
  errorComponent: ErrorState,
});

function ProjectPage() {
  const { data } = Route.useLoaderData();
  return <ProjectLandingPage data={data} />;
}

function buildJsonLd(
  data: { name: string; slug: string; meta: { description: string }; faqs?: Array<{ question: string; answer: string }> },
  canonical: string
) {
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "SoftwareApplication",
      name: `${data.name} Dashboard`,
      description: data.meta.description,
      url: canonical,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: {
        "@type": "Organization",
        name: "Alphaday",
        url: CONFIG.seo.domain.replace(/\/$/, ""),
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Alphaday",
          item: CONFIG.seo.domain.replace(/\/$/, ""),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Dashboards",
          item: canonicalFor("/dashboards"),
        },
        { "@type": "ListItem", position: 3, name: data.name, item: canonical },
      ],
    },
  ];

  if (data.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: data.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return graph;
}
