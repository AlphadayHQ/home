import React from "react";
import { Section } from "../../shared";
import { ArrowRight } from "lucide-react";

function Hero({ headline, subheading, logo, dashboardUrl, projectName }) {
  return (
    <Section className="bg-california overflow-hidden w-full border-california">
      <div className="mx-auto w-11/12 max-w-7xl">
        <div className="flex flex-col items-start max-w-5xl pt-12 sm:pt-16 md:pt-24 pb-16 md:pb-24">
          {logo && (
            <img
              src={logo}
              alt={`${projectName} logo`}
              className="h-16 w-16 md:h-20 md:w-20 rounded-2xl mb-6 object-contain bg-white/30 p-1"
            />
          )}
          <h1 className="text-black font-medium leading-[1.05] text-4xl sm:text-5xl md:text-7xl lg:text-[88px] mb-4 md:mb-6">
            {headline}
          </h1>
          <p className="text-black/80 text-base md:text-xl max-w-2xl mb-8 md:mb-10">
            {subheading}
          </p>
          <a
            href={dashboardUrl}
            className="inline-flex items-center gap-2 bg-black text-white hover:bg-[#1235b5] transition-colors duration-300 rounded-lg px-6 py-3 md:px-8 md:py-4 text-base md:text-lg font-medium"
          >
            Open {projectName} Dashboard
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </Section>
  );
}

export default Hero;
