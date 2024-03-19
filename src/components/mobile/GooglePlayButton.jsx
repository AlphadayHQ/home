import React from "react";
import GooglePlaySVG from "../../assets/svg/google-play.svg";
import GooglePlayWhiteSVG from "../../assets/svg/google-play-white.svg";
import CONFIG from "../../config";
import { twMerge } from "tailwind-merge";

// type: "sm" | "base"
const GooglePlayButton = ({ type }) => {
  return (
    <a className="ml-2" href={CONFIG.appStore.google}>
      <button
        type="button"
        class={twMerge(
          "flex items-center shadow-xl font-montserrat justify-center px-1 min-w-[150px] mt-3 text-black bg-transparent border-2 border-black pt-1 rounded-lg",
          type === "sm" &&
            "min-w-[40px] py-2.5 border-0 mt-0 bg-lightblue drop-shadow-eclipse hover:opacity-80 transition-all duration-300"
        )}
      >
        <div class={twMerge("mr-2", type === "sm" && "mr-0")}>
          <img
            src={type === "sm" ? GooglePlayWhiteSVG : GooglePlaySVG}
            className="w-7 h-7 self-baseline"
          />
        </div>
        {type !== "sm" && (
          <div>
            {/* <div class="text-xs text-left tracking-tighter">Android app on</div> */}
            <div class="text-xs text-left tracking-tighter">Coming soon</div>
            <div class="-mt-1 text-base text-left font-semibold">
              Google Play
            </div>
          </div>
        )}
      </button>
    </a>
  );
};

export default GooglePlayButton;
