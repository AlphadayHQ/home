import React from "react";
import { Section } from "../../shared";
import { twMerge } from "tailwind-merge";

const Info = ({ emoji, title, text, img, bg }) => {
  return (
    <Section className={twMerge("h-auto w-full", bg)}>
      <div className="mx-auto w-11/12 max-w-7xl py-24">
        <div className="text-xl text-center">{emoji}</div>
        <h2 className="text-[22px] uppercase pt-3 font-medium text-aluminium text-center">
          {title}
        </h2>
        <p className="text-platinum mt-4 text-center max-w-md mx-auto">
          {text}
        </p>
        <img
          className="mt-14 w-full max-w-7xl mx-auto rounded-2xl"
          src={img}
          alt=""
        />
      </div>
    </Section>
  );
};

export default Info;
