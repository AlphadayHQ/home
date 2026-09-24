import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Section } from "../../shared";
import { FAQData, mobileFAQData } from "./faqData";

const Item = ({ index, isOpen, onToggle, data }) => {
  const { id, question, answer } = data;
  const answerId = `faq-answer-${id}`;

  return (
    <div className="bg-surface-light border border-surface-border rounded-xl overflow-hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={() => onToggle(index)}
        className="w-full flex justify-between items-center gap-4 text-left px-5.5 py-4.75 cursor-pointer text-text font-bold text-[16.5px]"
      >
        {question}
        <Plus
          className={`w-5 h-5 shrink-0 text-primary transition-transform duration-200 ${
            isOpen ? "rotate-45" : ""
          }`}
        />
      </button>

      {/* grid-rows 0fr -> 1fr animates to the content's natural height without
          measuring it, so the initially-open item is correct on first paint. */}
      <div
        id={answerId}
        role="region"
        className={`grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.65,0.05,0.36,1)] ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5.5 pb-5 text-text-muted text-[15px] space-y-3">
            {answer.map((paragraph, i) => (
              <React.Fragment key={i}>{paragraph}</React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function FAQ({ isMobile }) {
  const [openIndex, setOpenIndex] = useState(0);
  const items = isMobile ? mobileFAQData : FAQData;

  const handleToggle = (index) =>
    setOpenIndex((current) => (current === index ? null : index));

  return (
    <Section id="faq" className="bg-background scroll-mt-16">
      <div className="mx-auto w-11/12 max-w-7xl py-24">
        <h2
          className={`font-display font-extrabold tracking-tight text-text ${
            isMobile
              ? "text-[22px] text-center"
              : "text-[clamp(26px,3.6vw,38px)]"
          }`}
        >
          Frequently Asked Questions
        </h2>

        <div
          className={`grid grid-cols-1 gap-3 mt-11 max-w-210 ${
            isMobile ? "mx-auto" : ""
          }`}
        >
          {items.map((item, index) => (
            <Item
              key={item.id}
              index={index}
              data={item}
              isOpen={openIndex === index}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>
    </Section>
  );
}

export default FAQ;
