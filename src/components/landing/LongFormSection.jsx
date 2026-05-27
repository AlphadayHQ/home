import React from "react";
import { Section, Div } from "../../shared";

function LongFormSection({ body, heading }) {
  if (!body) return null;
  const paragraphs = body.split(/\n\n+/).filter(Boolean);

  return (
    <Section className="bg-eerie">
      <Div className="py-12! md:py-16! max-w-3xl!">
        {heading && (
          <h2 className="text-platinum text-2xl md:text-3xl font-medium mb-6">
            {heading}
          </h2>
        )}
        <div className="text-aluminium text-base md:text-lg leading-relaxed space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </Div>
    </Section>
  );
}

export default LongFormSection;
