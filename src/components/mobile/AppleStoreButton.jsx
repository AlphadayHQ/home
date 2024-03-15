import React from "react";
import AppleSVG from "../../assets/svg/apple.svg";
import AppleWhiteSVG from "../../assets/svg/apple-white.svg";
import CONFIG from "../../config";
import { twMerge } from "tailwind-merge";

const AppleStoreButton = ({ type }) => {
  return (
    <a href={CONFIG.appStore.apple}>
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
            src={type === "sm" ? AppleWhiteSVG : AppleSVG}
            className="w-7 h-7 self-center"
          />
        </div>
        {type !== "sm" && (
          <div>
            <div class="text-xs text-left tracking-tighter">
              Download on the
            </div>
            <div class="-mt-1 text-base text-left font-semibold">App Store</div>
          </div>
        )}
      </button>
    </a>
  );
};

export default AppleStoreButton;
