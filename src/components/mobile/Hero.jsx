import React from "react";
import { Section } from "../../shared";
import ArrowDownSVG from "../../assets/svg/arrow-down.svg";
import GooglePlayButton from "./GooglePlayButton";
import AppleStoreButton from "./AppleStoreButton";

const HeroTextSm = () => (
  <h1 className="md:hidden flex flex-col text-black self-start text-center m-0 md:text-left font-medium leading-[60px] sm:leading-[70px] md:leading-[100px] lg:leading-[125px] text-[42px] sm:text-5xl md:text-7xl lg:text-[98px]">
    <span className="text-left">Swipe Up,</span>
    <span className="text-left">Explore,</span>
    <span className="text-left">Unlock</span>
    <span className="text-left">Alpha.</span>
  </h1>
);

const HeroTextLg = ({ className }) => (
  <h1 className="hidden md:flex flex-col text-black self-start text-center m-0 md:text-left font-medium leading-[60px] sm:leading-[70px] md:leading-[100px] lg:leading-[125px] text-[42px] sm:text-5xl md:text-7xl lg:text-[98px]">
    <span className="text-left">Swipe Up,</span>
    <span className="text-left">Explore,</span>
    <span className="text-left">Unlock Alpha.</span>
  </h1>
);

export default function () {
  return (
    <Section className="bg-california overflow-hidden h-auto w-full border-california">
      <div className="mx-auto w-11/12 max-w-7xl">
        <div className="flex flex-col max-w-5xl sm:mt-14 mt-10">
          <HeroTextSm />
          <HeroTextLg />
        </div>
        <div className="text-lg text-black mt-8">
          Swipe through the latest in crypto and get the next big alpha
          effortlessly.
        </div>
        <div className="text-lg text-black mt-5 flex">
          <AppleStoreButton />
          <GooglePlayButton />
        </div>
        <div className="flex justify-center mt-20 mb-10">
          <img src={ArrowDownSVG} className="w-8 h-8 animate-bounce" />
        </div>
      </div>
    </Section>
  );
}
