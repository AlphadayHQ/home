import React from "react";
import AppleSVG from "../../assets/svg/apple.svg";
import AppleWhiteSVG from "../../assets/svg/apple-white.svg";
// import CONFIG from "../../config";
import { twMerge } from "tailwind-merge";
import Tooltip from "../home/Tooltip";

const AppleStoreButton = ({ type, disabled }) => {
  return (
    // <a href={CONFIG.appStore.apple}>
    <span className="relative">
      <button
        type="button"
        disabled={disabled}
        className={twMerge(
          "flex peer items-center shadow-xl font-montserrat justify-center px-1 min-w-[150px] mt-3 text-black bg-transparent border-2 border-black pt-1 rounded-lg",
          type === "sm" &&
            "min-w-[40px] pt-2 pb-1.5 border-0 mt-0 bg-lightblue drop-shadow-eclipse hover:bg-[#1235b5] disabled:bg-aluminium transition-all duration-300"
        )}
      >
        <div className={twMerge("mr-2", type === "sm" && "mr-0")}>
          <img
            src={type === "sm" ? AppleWhiteSVG : AppleSVG}
            className="w-7 h-7 self-center mb-1"
          />
        </div>
        {type !== "sm" && (
          <div>
            <div className="text-xs text-left tracking-tighter">
              Coming soon
            </div>
            {/* <div className="text-xs text-left tracking-tighter">
              Download on the
            </div> */}
            <div className="-mt-1 text-base text-left font-semibold">
              App Store
            </div>
          </div>
        )}
      </button>
      <Tooltip
        text="Launching soon on the Apple App store"
        tipPos="center"
        className={twMerge(
          "mb-1 -bottom-20 w-full",
          type === "sm" &&
            "w-36 sm:w-44 -bottom-20 -left-[120%] sm:-left-[160%]"
        )}
      />
    </span>
    // </a>
  );
};

export default AppleStoreButton;
