import React from "react";
import { Section } from "../../shared";
import ArrowDownSVG from "../../assets/svg/arrow-down.svg";
import GooglePlayButton from "./GooglePlayButton";
import AppleStoreButton from "./AppleStoreButton";
import SuperfeedImage from "../../images/mobile/superfeed-transparent.webp";

/*
 * One `h1`, not two (§5.6). This shipped as a `md:hidden` copy and a
 * `hidden md:flex` copy — both in the DOM, so every crawler read the heading
 * twice. The two differed only in where the line broke, so a responsive `<br>`
 * gets the same two layouts out of a single element.
 */
const HeroText = () => (
  <h1 className="md:pt-10 flex flex-col text-black self-start text-center m-0 md:text-left font-medium leading-[60px] sm:leading-[70px] md:leading-[100px] lg:leading-[125px] text-[42px] sm:text-5xl md:text-7xl lg:text-[98px]">
    <span className="text-left">
      Your <br className="md:hidden" />
      Pocket-sized
    </span>
    <span className="text-left">Crypto</span>
    <span className="text-left">Powerhouse</span>
  </h1>
);

export default function () {
  return (
    <Section className="bg-california overflow-hidden h-auto w-full border-california">
      <div className="relative mx-auto w-11/12 max-w-7xl">
        <div className="flex flex-col max-w-7xl sm:mt-14 mt-10">
          <HeroText />
        </div>
        <div className="text-lg text-black mt-6 xl:mt-10 max-w-sm md:max-w-full">
          Skip the noise — maximize your crypto gains with smart insights
          wherever you go.
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
