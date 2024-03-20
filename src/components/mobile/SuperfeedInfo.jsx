import React from "react";
import { Section } from "../../shared";
import { feedItemIconArray } from "./feedItemMap";

const SuperfeedInfo = () => {
  return (
    <Section className="h-auto w-full">
      <div className="mx-auto w-11/12 max-w-7xl py-10">
        <div className="text-xl text-center">🚀</div>
        <h2 className="uppercase text-center text-platinum mt-2">
          Unlock the Superfeed
        </h2>
        <p className="text-platinum my-4 text-center max-w-sm mx-auto">
          Forget opening dozens of tabs, Superfeed is your personalized crypto
          news aggregator.
        </p>
        <div className="flex flex-wrap justify-center max-w-sm sm:max-w-3xl mx-auto">
          {feedItemIconArray.map((item) => (
            <button className="bg-[#4c5154] py-1 pt-1.5 px-2.5 rounded-xl flex flex-nowrap my-1.5 mx-1">
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

export default SuperfeedInfo;
