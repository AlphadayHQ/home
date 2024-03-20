import React from "react";
import { Section } from "../../shared";
import { twMerge } from "tailwind-merge";

const JoinCommunity = ({ bg }) => {
  return (
    <Section className={twMerge("h-auto w-full", bg)}>
      <div className="mx-auto w-11/12 max-w-7xl py-10">
        <h2 className="text-[22px] uppercase pt-3 font-medium text-aluminium text-center">
          JOIN THE COMMUNITY
        </h2>
        <p className="text-platinum mt-4 text-center max-w-md mx-auto">
          Join thousands of users who trust Alphaday for their crypto
          management!
        </p>
        <p className="text-platinum mt-4 text-center max-w-md mx-auto">
          Share strategies, insights, and tips with fellow Alphaday users.
        </p>
        <p className="text-platinum mt-4 text-center max-w-md mx-auto">
          "Alphaday has transformed the way I manage my crypto portfolio. It's
          intuitive, comprehensive, and all-encompassing."
        </p>
        <p className="text-platinum mt-6 text-center max-w-md mx-auto">
          -Robert H.
        </p>
        <p className="text-3xl text-center mt-8 mx-auto w-full">
          ⭐ ⭐ ⭐ ⭐ ⭐
        </p>
      </div>
    </Section>
  );
};

export default JoinCommunity;
