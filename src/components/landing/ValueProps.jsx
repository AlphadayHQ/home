import React from "react";
import { Section, Div, Title } from "../../shared";

function ValueProps({ valueProps, projectName }) {
  if (!valueProps?.length) return null;

  return (
    <Section className="bg-shark">
      <Div>
        <Title className="text-platinum text-center mb-12">
          Why use a {projectName} dashboard?
        </Title>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {valueProps.map((vp) => (
            <div key={vp.heading}>
              <h3 className="text-platinum text-xl md:text-2xl font-medium mb-3">
                {vp.heading}
              </h3>
              <p className="text-aluminium text-sm md:text-base leading-relaxed">
                {vp.body}
              </p>
            </div>
          ))}
        </div>
      </Div>
    </Section>
  );
}

export default ValueProps;
