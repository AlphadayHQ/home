import React from "react";
import { Section, Div, Title } from "../../shared";
import { ChevronDown } from "lucide-react";

function FAQ({ faqs, projectName }) {
  if (!faqs?.length) return null;

  return (
    <Section className="bg-eerie">
      <Div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-10">
          <div className="md:col-span-5">
            <div className="text-california text-[11px] uppercase tracking-[0.22em] font-medium mb-4">
              Questions
            </div>
            <Title className="text-platinum mb-5">
              {projectName} dashboard FAQ
            </Title>
            <div className="h-px w-10 bg-california/50" />
          </div>

          <div className="md:col-span-7 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group bg-black/40 border border-white/5 rounded-xl overflow-hidden hover:border-california/30 transition-colors duration-300"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 text-platinum text-base md:text-lg font-medium">
                  <span>{faq.question}</span>
                  <ChevronDown className="w-5 h-5 shrink-0 text-aluminium transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 -mt-1 text-aluminium text-sm md:text-base leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </Div>
    </Section>
  );
}

export default FAQ;
