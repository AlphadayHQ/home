import React, { useState } from "react";
import { Button, Div, Section, Title } from "../../shared";
import { data } from "./faqData";

const Card = ({ index, handleToggle, toggleDrawer, data }) => {
  const { question, answer } = data;

  return (
    <div className="bg-black rounded-xl p-4 md:p-8 transform-all duration-300">
      <div
        onClick={() => handleToggle(index)}
        className={`flex justify-between items-center cursor-pointer ${
          toggleDrawer == index ? "mb-4 text-platinum" : "mb-0 text-aluminium"
        }`}
      >
        <h4 className="font-medium text-sm md:text-xl">{question}</h4>

        <span
          className={`flex justify-center items-center w-[25px] h-[25px] rounded-full border ${
            toggleDrawer == index ? "border-aluminium" : "border-blue"
          }`}
        >
          <i
            class={`${
              toggleDrawer == index ? "ri-subtract-line" : "ri-add-fill"
            } `}
          ></i>
        </span>
      </div>

      {toggleDrawer == index &&
        answer.map((el, index) => {
          return (
            <p
              key={index}
              className={`text-aluminium px-4 text-sm md:px-8 md:text-base ${
                index == answer.length - 1 && "mt-4"
              } transform-all duration-300`}
            >
              {el}
            </p>
          );
        })}
    </div>
  );
};

function FAQ() {
  let [toggleDrawer, setToggleDrawer] = useState(false);

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
          <Title className="">Frequently Asked Questions</Title>

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
