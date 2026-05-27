import React from "react";
import { Section, Div } from "../../shared";
import { ArrowRight } from "lucide-react";

function BottomCTA({ projectName, dashboardUrl }) {
  return (
    <Section className="bg-california">
      <Div className="text-center py-16! md:py-20!">
        <a
          href={dashboardUrl}
          className="inline-flex items-center gap-3 text-black font-medium text-3xl md:text-5xl hover:gap-5 transition-all duration-300"
        >
          Dive into {projectName}
          <ArrowRight className="w-8 h-8 md:w-12 md:h-12" />
        </a>
      </Div>
    </Section>
  );
}

export default BottomCTA;
