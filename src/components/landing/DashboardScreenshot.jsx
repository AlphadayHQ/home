import React from "react";
import { Section, Div } from "../../shared";
import dashboardImg from "../../images/home/hero.png";

function DashboardScreenshot({ project }) {
  return (
    <Section className="bg-eerie">
      <Div className="!py-8 md:!py-12">
        <div className="bg-eerie p-3 rounded-xl">
          <img
            src={dashboardImg}
            alt={`${project} dashboard preview`}
            className="w-full rounded-lg"
          />
        </div>
        <p className="text-aluminium text-center text-sm md:text-base mt-6">
          Your {project} dashboard — drag, drop, and customize every widget to fit your workflow.
        </p>
      </Div>
    </Section>
  );
}

export default DashboardScreenshot;
