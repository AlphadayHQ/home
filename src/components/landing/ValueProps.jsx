import React from "react";
import { Section, Div, Title } from "../../shared";

function ValueProps({ valueProps, projectName }) {
  if (!valueProps?.length) return null;

  return (
    <Section className="bg-shark">
      <Div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-10">
          <div className="md:col-span-5">
            <div className="text-california text-[11px] uppercase tracking-[0.22em] font-medium mb-4">
              What you get
            </div>
            <Title className="text-platinum mb-5">
              Why use a {projectName} dashboard?
            </Title>
            <div className="h-px w-10 bg-california/50" />
          </div>

          <ol className="md:col-span-7 space-y-10 md:space-y-14">
            {valueProps.map((vp, i) => (
              <li
                key={vp.heading}
                className="grid grid-cols-[auto_1fr] gap-x-6 md:gap-x-8 items-start"
              >
                <div className="text-california/70 text-sm font-medium tabular-nums tracking-[0.15em] pt-1.5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-platinum text-xl md:text-2xl font-medium leading-tight mb-3">
                    {vp.heading}
                  </h3>
                  <p className="text-aluminium text-sm md:text-base leading-relaxed max-w-prose">
                    {vp.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Div>
    </Section>
  );
}

export default ValueProps;
