import React, { useRef, useState } from "react";
import { Div, Section, Title } from "../../shared";
import { data } from "./faqData";

const Card = ({ index, handleToggle, toggleDrawer, data }) => {
  const answerRef = useRef(null);
  const { question, answer } = data;

  const answerHeight = answerRef?.current?.scrollHeight;

  return (
    <div className="bg-black rounded-xl p-4 md:p-8">
      <div
        onClick={() => handleToggle(index)}
        className={`flex justify-between items-center cursor-pointer ${
          toggleDrawer == index ? "text-platinum" : "text-aluminium"
        }`}
      >
        <h4 className="font-medium text-sm md:text-xl">{question}</h4>

        <span
          className={`flex justify-center items-center px-[4px] rounded-full border ${
            toggleDrawer == index ? "border-aluminium" : "border-blue"
          }`}
        >
          <i
            className={`${
              toggleDrawer == index ? "ri-subtract-line" : "ri-add-fill"
            } `}
          ></i>
        </span>
      </div>

      <div
        className={`overflow-hidden transition-[height] duration-400 h-auto will-change-[height] ease-[cubic-bezier(0.65,0.05,0.36,1)]`}
        style={{
          height: `${toggleDrawer == index ? answerHeight + 16 : 0}px`,
        }}
      >
        <div
          ref={answerRef}
          className={`mt-4 ${
            toggleDrawer == index ? "opacity-100" : "opacity-0"
          }`}
          style={{ transition: "opacity 0.1s linear 0.18s" }}
        >
          {answer.map((el, i) => {
            return (
              <div
                key={i}
                className={`text-aluminium px-4 text-sm md:px-8 md:text-base ${
                  i == answer.length - 1 && "mt-4"
                }`}
              >
                {el}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function FAQ() {
  let [toggleDrawer, setToggleDrawer] = useState(0);

  function handleToggle(arg) {
    if (toggleDrawer === arg) {
      return setToggleDrawer(null);
    }
    setToggleDrawer(arg);
  }
  return (
    <Section className="bg-eerie">
      <Div className="pb-48">
        <div>
          <div className="flex justify-center w-full mb-6">
            <Title className="">Frequently Asked Questions</Title>
          </div>

          <div className="grid grid-cols-1 gap-4 w-full mx-auto max-w-[700px]">
            {data.map((item, index) => {
              return (
                <Card
                  index={index}
                  handleToggle={handleToggle}
                  toggleDrawer={toggleDrawer}
                  key={item.id}
                  data={item}
                />
              );
            })}
          </div>
        </div>

        {/* <div className="w-full mx-auto max-w-fit mt-8 md:mt-16">
                    <Button className="bg-black w-fit border border-aluminium">Read more in the Docs</Button>
                </div> */}
      </Div>
    </Section>
  );
}

export default FAQ;
