import React from "react";
import { Section } from "../../shared";
import ArrowDownSVG from "../../assets/svg/arrow-down.svg";
import GooglePlayButton from "./GooglePlayButton";
import AppleStoreButton from "./AppleStoreButton";
import SuperfeedImage from "../../images/mobile/superfeed-transparent.png";

const HeroTextSm = () => (
  <h1 className="md:hidden flex flex-col text-black self-start text-center m-0 md:text-left font-medium leading-[60px] sm:leading-[70px] md:leading-[100px] lg:leading-[125px] text-[42px] sm:text-5xl md:text-7xl lg:text-[98px]">
    <span className="text-left">Your</span>
    <span className="text-left">Pocket-sized</span>
    <span className="text-left">Crypto</span>
    <span className="text-left">Powerhouse</span>
  </h1>
);

const HeroTextLg = () => (
  <h1 className="pt-10 hidden md:flex flex-col text-black self-start text-center m-0 md:text-left font-medium leading-[60px] sm:leading-[70px] md:leading-[100px] lg:leading-[125px] text-[42px] sm:text-5xl md:text-7xl lg:text-[98px]">
    <span className="text-left">Your Pocket-sized</span>
    <span className="text-left">Crypto</span>
    <span className="text-left">Powerhouse</span>
  </h1>
);

export default function () {
  return (
    <Section className="bg-california overflow-hidden h-auto w-full border-california">
      <div className="relative mx-auto w-11/12 max-w-7xl">
        <div className="flex flex-col max-w-7xl sm:mt-14 mt-10">
          <HeroTextSm />
          <HeroTextLg />
        </div>
        <div className="text-lg text-black mt-6 xl:mt-10">
          No more logging in and out of multiple platforms.
        </div>
        <div className="text-lg text-black mt-3 max-w-sm">
          Alphaday keeps all your essential crypto tools and insights in one
          convenient place.
        </div>
        <div className="text-lg text-black mt-8 xl:mt-14 flex gap-2">
          <AppleStoreButton />
          <GooglePlayButton />
        </div>
        <div className="flex flex-col items-center mt-20 mb-10">
          <img src={ArrowDownSVG} className="w-8 h-8 animate-bounce" />
        </div>
        <img
          className="mx-auto hidden xl:block xl:w-[1024px] absolute -bottom-28 -right-1"
          src={SuperfeedImage}
          alt=""
        />
      </div>
    </Section>
  );
}
