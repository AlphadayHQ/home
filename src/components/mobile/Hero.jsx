import React from "react";
import { Section } from "../../shared";
import AppleSVG from "../../assets/svg/apple.svg";
import GooglePlaySVG from "../../assets/svg/google-play.svg";
import ArrowDownSVG from "../../assets/svg/arrow-down.svg";
import CONFIG from "../../config";

export default function () {
  return (
    <Section className="bg-california overflow-hidden h-auto w-full border-california">
      <div className="mx-auto w-11/12 max-w-7xl">
        <div className=" md:mx-auto flex flex-col max-w-5xl sm:mt-14 mt-10">
          <h1 className="flex flex-col text-black self-start text-center m-0 md:text-left font-medium leading-[60px] sm:leading-[80px] md:leading-[110px] text-[42px] sm:text-5xl md:text-7xl lg:text-[98px]">
            <span className="text-left">Swipe Up,</span>
            <span className="text-left">Explore,</span>
            <span className="text-left">Unlock</span>
            <span className="text-left">Alpha.</span>
          </h1>
        </div>
        <div className="text-lg text-black mt-8">
          Swipe through the latest in crypto and get the next big alpha
          effortlessly.
        </div>
        <div className="text-lg text-black mt-5 flex">
          <a href={CONFIG.appStore.apple}>
            <button
              type="button"
              class="flex items-center shadow-xl font-montserrat justify-center w-44 mt-3 text-black bg-transparent border-2 border-black pt-1 rounded-lg"
            >
              <div class="mr-3">
                <img src={AppleSVG} className="w-8 h-8 self-center" />
              </div>
              <div>
                <div class="text-xs text-left tracking-tighter">
                  Download on the
                </div>
                <div class="-mt-1 text-lg text-left font-semibold">
                  App Store
                </div>
              </div>
            </button>
          </a>
          <a className="ml-5" href={CONFIG.appStore.google}>
            <button
              type="button"
              class="flex items-center shadow-xl font-montserrat justify-center w-44 mt-3 text-black bg-transparent border-2 border-black pt-1 rounded-lg"
            >
              <div class="mr-3">
                <img src={GooglePlaySVG} className="w-8 h-8 self-baseline" />
              </div>
              <div>
                <div class="text-xs text-left tracking-tighter">
                  Android app on
                </div>
                <div class="-mt-1 text-lg text-left font-semibold">
                  Google Play
                </div>
              </div>
            </button>
          </a>
        </div>
        <div className="flex justify-center mt-20 mb-10">
          <img src={ArrowDownSVG} className="w-8 h-8 animate-bounce" />
        </div>
      </div>
    </Section>
  );
}
