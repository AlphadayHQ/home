import React from "react";
import { Section } from "../../shared";
import { featuresIconArray } from "./feedItemMap";

const SomeFeatures = () => {
  return (
    <Section className="h-auto w-full">
      <div className="mx-auto w-11/12 max-w-7xl py-10">
        <div className="flex flex-wrap justify-center max-w-sm mx-auto">
          {featuresIconArray.map((item) => (
            <button
              style={{ backgroundColor: item.color }}
              className="py-1 pt-1.5 px-2.5 rounded-xl flex flex-nowrap my-1.5 mx-1"
            >
              <img
                src={item.icon}
                className="w-4 h-4 text-white stroke-white fill-white"
                alt={item.name}
              />
              <span className="text-white text-sm ml-1">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default SomeFeatures;
