import React from "react";
import GooglePlaySVG from "../../assets/svg/google-play.svg";
import GooglePlayWhiteSVG from "../../assets/svg/google-play-white.svg";
// import CONFIG from "../../config";
import { twMerge } from "tailwind-merge";
import Tooltip from "../home/Tooltip";

// type: "sm" | "base"
const GooglePlayButton = ({ type, disabled }) => {
  return (
    // <a className="ml-2" href={CONFIG.appStore.google}>
    <span className="relative">
      <button
        type="button"
        disabled={disabled}
        class={twMerge(
          "flex peer items-center shadow-xl font-montserrat justify-center px-1 min-w-[150px] mt-3 text-black bg-transparent border-2 border-black pt-1 rounded-lg",
          type === "sm" &&
            "min-w-[40px] pt-2.5 pb-2 border-0 mt-0 bg-lightblue drop-shadow-eclipse hover:bg-[#1235b5] transition-all duration-300 disabled:bg-aluminium"
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
      <Tooltip
        text="Launcing soon on the Google Play store"
        tipPos={type === "sm" ? "right" : "center"}
        className={twMerge(
          "mb-1 -bottom-20",
          type === "sm" &&
            "w-36 sm:w-40 -bottom-20 -left-[300%]"
        )}
      />
    </span>
    // </a>
  );
};

export default GooglePlayButton;
