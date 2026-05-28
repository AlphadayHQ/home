import React from "react";
import { Section, Div } from "../../shared";

function LongFormSection({ body, heading }) {
  if (!body) return null;
  const paragraphs = body.split(/\n\n+/).filter(Boolean);

  return (
    <Section className="bg-eerie">
      <Div className="py-12! md:py-16!">
        <div className="grid grid-cols-12">
          <div className="col-span-12 md:col-span-8 lg:col-span-7">
            {heading && (
              <div className="mb-8 md:mb-10">
                <h2 className="text-platinum text-2xl md:text-3xl font-medium leading-tight">
                  {heading}
                </h2>
                <div className="h-px w-10 bg-california/50 mt-5" />
              </div>
            )}
            <div className="space-y-5">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "text-platinum/90 text-lg md:text-xl leading-relaxed"
                      : "text-aluminium text-base md:text-lg leading-relaxed"
                  }
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        </div>
      </Div>
    </Section>
  );
}

export default LongFormSection;
